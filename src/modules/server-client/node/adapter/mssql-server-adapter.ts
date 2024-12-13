import * as mssql from 'mssql';
import { ServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { ISqlQueryParam, ISqlQueryResult } from '../../common';
import { isNotEmpty } from '../../../base/utils/object-util';

export class MssqlServerAdapter extends ServerAdapter {
  private connPool: mssql.ConnectionPool;

  private constructor(conn: mssql.ConnectionPool) {
    super();
    this.connPool = conn;
  }

  public static async createInstance(connect: ConnectQuery): Promise<ServerAdapter> {
    //console.log('connection create createInstance', connect);
    const { server, db, ssh, originPassword } = connect;
    const {
      host,
      port,
      user,
      instanceName,
      role,
      orclServerType,
      password,
      timezone,
      connectTimeout,
      requestTimeout,
      maximumPoolSize,
      minimumIdle,
      idleTimeout,
    } = server;
    //console.log('createInstance', server)
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    //console.log('decodePassword', decodePassword)
    const config: mssql.config = {
      server: host,
      port,
      //database:db as string,
      user,
      password: decodePassword,
      pool: {
        max: maximumPoolSize || 5,
        min: minimumIdle || 0,
        idleTimeoutMillis: idleTimeout || 30000,
      },
      options: {
        connectTimeout:connectTimeout || 5000,
        requestTimeout:requestTimeout || 5000,
        encrypt: false, // for azure
        trustServerCertificate: true, // change to true for local dev / self-signed certs
      },
    };
    if (isNotEmpty(db)) config.database = db as string;
    //console.log('mssql-config', config)
    const pool = new mssql.ConnectionPool(config);
    const instance = new MssqlServerAdapter(pool);
    return instance;
  }

  async isAlive(): Promise<boolean> {
    const isAlive = !this.dead && this.connPool.connected;
    console.log('isAlive---->isAlive:', isAlive, ',dead:', this.dead);
    return isAlive;
  }

  query(params: ISqlQueryParam, callback?: queryCallback) {
    const { sql, isQuery, values } = params;
    this.connPool.request().query(sql, async (error, result) => {
      console.log('mssql query result--->', result);
      // const data = await this.adaptResult(sql, result);
      if (callback) {
        callback(error, this.adaptResult(isQuery, result));
      }
    });
  }

  adaptResult(isQuery: boolean, res: mssql.IResult<any>): ISqlQueryResult {
    const queryResult: ISqlQueryResult = {};
    if (isQuery) {
      if (res.recordset) {
        //后续需要处理日期和二进制
        queryResult.data = res.recordset;
        queryResult.fields = res.recordset.columns as any;
      }
    } else {
      if (res.rowsAffected[0]) queryResult.affectedRows = res.rowsAffected[0];
    }
    return queryResult;
  }

  async connect(callback: (err: any) => void): Promise<void> {
    await this.connPool.connect();
    this.connPool.on('error', (err) => {
      console.log('mssql error', err);
      // this.dead = true;
    });
    this.connPool.on('close', () => {
      console.log('mssql close-->');
      this.dead = true;
    });
    // const close = this.connPool.close.bind(this.connPool);
    // this.connPool.close = (...args) => {
    //  // pools.delete(name);
    //   return close(...args);
    // }
    // 监听连接关闭事件
    this.dead = false;
    callback(null);
  }

  async beginTransaction(callback: (err: any) => void): Promise<void> {
  }

  async rollback(): Promise<void> {}

  async ping(): Promise<boolean> {
    return false;
  }

  async commit(): Promise<void> {}

  async close(): Promise<void> {
    this.dead = true;
    await this.connPool.close();
  }

  getClient() {
    return null;
  }
}
