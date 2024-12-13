import { DefaultServerAdapter } from './server-adapter';
import Redis, { Cluster, RedisOptions } from 'ioredis';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';

export class RedisServerAdapter extends DefaultServerAdapter {
  private connected: boolean;
  private client: Redis|Cluster;

  private constructor(client: Redis) {
    super();
    this.client = client;
  }

  public static async createInstance(connect: ConnectQuery): Promise<RedisServerAdapter> {
    const { host, port, connectionType } = connect.server;
    console.info('redis- createInstance',connect.server)
    let client;
    if (connectionType === 'Cluster') {
      const config = this.getClusterOptions(connect);
      client = new Redis.Cluster([{host, port}], config);
    } else if (connectionType === 'Sentinel') {
      const config = this.getSentinelOptions(connect);
      client = new Redis(config);
    } else {
      const config = this.getStandaloneOptions(connect);
      client = new Redis(config);
    }
    // const client = new Redis(config);
    const redisConnection = new RedisServerAdapter(client);
    return redisConnection;
  }

  public static getStandaloneOptions(connect: ConnectQuery): RedisOptions {
    const { server, db, schema, ssh, originPassword } = connect;
    const { host, port, user, password, connectTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = {
      host,
      port,
      username: user,
      password: decodePassword,
      connectTimeout: connectTimeout || 5000,
      db: db as any as number,
      family: 4,
    } as RedisOptions;
    return config;
  }

  public static getClusterOptions(connect: ConnectQuery) {

    const { server, db, schema, ssh, originPassword } = connect;
    const { host, port, user, password, connectTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = {
      //slotsRefreshTimeout: 300,
      //slotsRefreshInterval: 1,
      //maxRedirections: 10, // 增加重定向次数
      redisOptions: { password: decodePassword },
    } as RedisOptions;
    if(user){
      config.username = user;
    }
    return config;
  }

  public static getSentinelOptions(connect: ConnectQuery): RedisOptions {
    const { server, db, schema, ssh, originPassword } = connect;
    const { host, port, password, connectTimeout, redisMasterName, redisMasterPassword } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = {
      sentinels: [{ host: host, port: port }],
      name: redisMasterName,
      password: redisMasterPassword, // master主节点的密码
      sentinelPassword: decodePassword,
      db: db, // 默认数据库
    } as RedisOptions;
    return config;
  }

  run(callback: (client: Redis|Cluster) => void) {
    callback(this.client);
  }

  getClient() {
    return this.client;
  }

  async useDatabase(db: number | string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.select(db, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.ping((error, result) => {
        if (error) {
          console.log('---->redis无法PIN通，并且报错');
          reject(error);
        }
        if (result && result === 'PONG') {
          resolve(true);
        }
      });
    });
  }

  async connect(callback: (err: any) => void) {
    let timeout = true;
    setTimeout(() => {
      if (timeout) {
        timeout = false;
        callback(new Error('Connect to redis server time out.'));
      }
    }, 5000);
    this.client.ping((err) => {
      if (timeout) {
        this.connected = true;
        timeout = false;
        callback(err);
      }
    });
  }

  async close() {
    this.client.disconnect();
  }

  async isAlive(): Promise<boolean> {
    return this.connected;
  }
}
