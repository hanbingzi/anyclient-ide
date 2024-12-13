import * as dmdb from 'dmdb';
import { ServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { ISqlQueryParam, ISqlQueryResult } from '../../common';

export class DMServerAdapter extends ServerAdapter {
  private connPool: dmdb.Pool;
  private autoCommit: boolean = true;

  private constructor(pool: dmdb.Pool) {
    super();
    this.connPool = pool;
  }

  public static async createInstance(connect: ConnectQuery): Promise<ServerAdapter> {
    const { server, db, ssh, originPassword } = connect;
    const { host, port, user, instanceName, role, orclServerType, password, timezone, connectTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    const connectString = `dm://${user}:${decodePassword}\@${host}:${port}?autoCommit=true`;
    const config: dmdb.PoolAttributes = {
      connectString,
      poolMax: 10,
      poolMin: 1,
    };
    //console.log('mssql-config', config)
    const pool = await dmdb.createPool(config);
    const instance = new DMServerAdapter(pool);
    return instance;
  }

  async isAlive(): Promise<boolean> {
    const isAlive = !this.dead && this.connPool.testOnBorrow;
    console.log('isAlive---->isAlive:', isAlive, ',dead:', this.dead);
    return isAlive;
  }

  async query(params: ISqlQueryParam, callback?: queryCallback) {
    const { sql, isQuery, values } = params;
    let connect: dmdb.Connection;
    try {
      connect = await this.connPool.getConnection();
      const result = await connect.execute(sql, [], { resultSet: false, extendedMetaData: true });
      // const data = await this.adaptResult(sql, result);
      if (callback) {
        callback(null, this.adaptResult(isQuery, result));
      }
    } catch (e) {
      console.log('query error:', e);
      if (callback) {
        callback(e);
      }
    } finally {
      try {
        await connect.release();
      } catch (err) {
        console.log('connect release error:', err);
      }
    }
  }

  adaptResult(isQuery: boolean, res: dmdb.Result<any>): ISqlQueryResult {
    const queryResult: ISqlQueryResult = {};
    if (isQuery) {
      const { rows, metaData } = res;
      let data: { [key: string]: any }[] = [];
      if (rows && metaData) {
        //后续需要处理日期和二进制
        for (let row of rows) {
          let dataItem = {};
          for (let i=0;i<(metaData as dmdb.Metadata[]).length;i++) {
            let metaItem  = metaData[i] as dmdb.Metadata;
            const { name, dbTypeName } = metaItem;
            let value = row[i];
            if (value) {
              //二进制的处理,后续补充
              // if (dbTypeName === OracleColumnEnum.CLOB || dbTypeName === OracleColumnEnum.NCLOB) {
              //   dataItem[name] = this.dealClob(value);
              // } else {
              dataItem[name] = value;
              //}
            }
          }
          data.push(dataItem);
        }
      }
      queryResult.data = data;
      queryResult.fields = metaData;
    } else {
      if (res.rowsAffected) queryResult.affectedRows = res.rowsAffected;
    }
    return queryResult;
  }

  async connect(callback: (err: any) => void): Promise<void> {
    // 监听连接关闭事件
    this.dead = false;
    callback(null);
  }

  async beginTransaction(callback: (err: any) => void): Promise<void> {
    this.autoCommit = false;
  }

  async rollback(): Promise<void> {}

  async ping(): Promise<boolean> {
    return false;
  }

  async commit(): Promise<void> {}

  async close(): Promise<void> {
    this.dead = true;
    try {
      await this.connPool.close();
    } catch (e) {
      console.log('DaMeng Pool closed error', e);
    }
  }

  getClient() {
    return null;
  }
}
