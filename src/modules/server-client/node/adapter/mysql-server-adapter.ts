import * as mysql from 'mysql2';
import { ServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { MysqlUtils } from '../../common/utils/mysql-utils';
import { ISqlQueryParam, ISqlQueryResult } from '../../common';

export class MysqlServerAdapter extends ServerAdapter {
  private conn: mysql.Connection;

  constructor(connect: mysql.Connection) {
    super();
    this.conn = connect;
  }

  public static async createInstance(connect: ConnectQuery): Promise<ServerAdapter> {
    const { server, db, ssh, originPassword } = connect;
    const { host, port, user, password, timezone, connectTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = {
      host,
      port,
      user,
      password: decodePassword,
      database: db,
      timezone,
      multipleStatements: true,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectTimeout: connectTimeout || 5000,
    } as mysql.ConnectionOptions;
    const conn = mysql.createConnection(config);
    const instance = new MysqlServerAdapter(conn);
    return instance;
  }

  async isAlive(): Promise<boolean> {
    //this.conn.ping();
    const isAlive = !this.dead && this.conn.authorized;
    if (isAlive) {
      return new Promise<boolean>((resolve, reject) => {
        this.conn.ping((err) => {
          if (err) {
            this.dead = true;
            resolve(false);
          } else resolve(true);
        });
      });
    }
    return false;
  }

  // query(sql: string, callback?: queryCallback): void;
  // query(sql: string, values: any, callback?: queryCallback): void;
  query(params: ISqlQueryParam, callback?: queryCallback) {
    const { sql, isQuery, values } = params;
    return this.conn.query(sql, (err, result, fields) => {
      if (err) {
        callback && callback(err);
      } else {
        callback && callback(null, this.adaptResult(isQuery, result, fields));
      }
    });
  }

  /**
   * 修改成功结果示例： {
   *   fieldCount: 0,
   *   affectedRows: 1,
   *   insertId: 0,
   *   info: 'Rows matched: 1  Changed: 0  Warnings: 0',
   *   serverStatus: 2,
   *   warningStatus: 0,
   *   changedRows: 0
   * }
   * @param isQuery
   * @param res
   * @param fields
   */
  adaptResult(isQuery: boolean, res: any, fields: mysql.FieldPacket[]) {
    const queryResult: ISqlQueryResult = {};
    if (!res) {
      return queryResult;
    }
    if (isQuery) {
      if (res && Array.isArray(res)) {
        //console.log('adaptResult=->', res, fields.map(field => `${field.name},${field.type},${field.typeName}`));
        let data: { [key: string]: any }[] = [];
        for (let i = 0; i < res.length; i++) {
          let row = res[i];
          let dataItem = {};
          for (let fieldItem of fields) {
            const { name, type } = fieldItem;
            let value = row[name];
            dataItem[name] = MysqlUtils.getConvertValue(type!, value);
          }
          data.push(dataItem);
        }
        queryResult.fields = fields;
        queryResult.data = data;
      }
    } else {
      if (res.affectedRows) {
        queryResult.affectedRows = res.affectedRows;
      }
    }
    return queryResult;
  }

  async connect(callback: (err: any) => void): Promise<void> {
    this.conn.connect((err) => {
      console.error('MysqlConnection---->main- error--------------------');
      callback(err);
      if (!err) {
        this.conn.on('error', () => {
          console.error('MysqlConnection error--------------------');
          this.dead = true;
          this.conn.end();
        });
        this.conn.on('close', () => {
          console.error('MysqlConnection close--------------------');
          this.dead = true;
          this.conn.end();
        });
        this.conn.on('end', () => {
          console.error('MysqlConnection end--------------------');
          this.dead = true;
        });
      }
    });
  }

  async beginTransaction(callback: (err: any) => void): Promise<void> {
    this.conn.beginTransaction(callback);
  }

  async rollback(): Promise<void> {
    this.conn.rollback(() => {
      console.log('执行回滚，不清楚如何运行--->@lengbingzi');
    });
  }

  async ping(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.conn.ping((err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  async commit(): Promise<void> {
    this.conn.commit();
  }

  async close(): Promise<void> {
    this.dead = true;
    this.conn.end();
  }

  bitToBoolean(buf: Buffer): any {
    return buf ? buf[0] == 1 : null;
  }

  getClient() {
    return this.conn;
  }
}
