import { DefaultServerAdapter } from './server-adapter';
import * as zookeeper from 'node-zookeeper-client';
import { Client } from 'node-zookeeper-client';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';

export class ZookeeperServerAdapter extends DefaultServerAdapter {
  private connected: boolean;
  private client: Client;
  private timeout: number;

  private constructor(client: Client, timeout: number) {
    super();
    this.client = client;
    this.timeout = timeout;
  }

  public static async createInstance(connect: ConnectQuery) {
    const { server, originPassword } = connect;
    const { host, port, user, password, connectTimeout = 15000 } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = '';
    if (user && password) {
      config += `${user}:${decodePassword}@`;
    }
    config += `${host}:${port}`;
    const client = zookeeper.createClient(config, { sessionTimeout: connectTimeout, retries: 1 });
    const zookeeperConnection = new ZookeeperServerAdapter(client, connectTimeout);
    return zookeeperConnection;
  }

  getClient() {
    return this.client;
  }

  ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve(true);
      }
    });
  }

  async connect(callback: (err: any) => void) {
    try {
      this.client.on('state', (event) => {
        console.log('ZooKeeper ConnectionStateChange: ', event);
        if (event.name === 'SYNC_CONNECTED') {
          console.log('Connected to ZooKeeper server');
          this.connected = true;
          callback(null);
        } else if (event.name === 'DISCONNECTED') {
          this.close();
          console.log('Disconnected from ZooKeeper server');
          callback({ message: 'Disconnected from ZooKeeper server' });
        } else if (event.name === 'EXPIRED') {
          this.close();
          console.log('ZooKeeper session expired');
          callback({ message: 'ZooKeeper session expired' });
        }
      });
    } catch (e) {
      this.connected = false;
      callback(e);
    }
    this.client.connect();
    setTimeout(() => {
      console.log('ZooKeeper setTimeout: ', this.client.getState().name);
      if (this.client.getState().name !== 'CONNECTED') {
        console.error('Failed to connect to ZooKeeper within the given time.');
        // 获取失败的错误信息
        // 在这里，我们可以记录错误信息或者根据需要触发重连等操作。

        callback({ message: 'Failed to connect to ZooKeeper within the given time.' });
        this.close();
      }
    }, this.timeout);
  }

  async close() {
    this.connected = false;
    if (this.client) this.client.close();
  }

  async isAlive(): Promise<boolean> {
    return this.connected;
  }
}
