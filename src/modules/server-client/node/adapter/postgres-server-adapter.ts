import { Client, ClientConfig, FieldDef, QueryArrayResult } from 'pg';
import { ServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { PostgresUtils } from '../../common/utils/postgresql-utils';
import { ISqlQueryParam, ISqlQueryResult } from '../../common';

/**
 * https://www.npmjs.com/package/pg
 */
export class PostgresServerAdapter extends ServerAdapter {
  private client: Client;

  private constructor(client: Client) {
    super();
    this.client = client;
  }

  public static async createInstance(connect: ConnectQuery): Promise<PostgresServerAdapter> {
    const { server, db, ssh, originPassword } = connect;
    const { host, port, user, password, connectTimeout, requestTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    let config = {
      host: host,
      port: port,
      user: user,
      password: decodePassword,
      database: db,
      connectionTimeoutMillis: connectTimeout || 5000,
      statement_timeout: requestTimeout || 10000,
    } as ClientConfig;
    const client = new Client(config);
    const postgresConnection = new PostgresServerAdapter(client);
    return postgresConnection;
  }

  getClient() {
    return this.client;
  }

  async isAlive(): Promise<boolean> {
    const temp = this.client as any;
    return !this.dead && temp._connected && !temp._ending && temp._queryable;
  }

  query(params: ISqlQueryParam, callback?: queryCallback) {
    const { sql, isQuery } = params;
    //const event = new EventEmitter()
    this.client.query(sql, (err, res) => {
      if (err) {
        if (callback) callback(err);
        this.close();
      } else {
        //const fields = res.fields((row) => row.fields);
        if (callback)  callback(null, this.adaptResult(isQuery,res, res.fields));
      }
    });
    //return event;
  }

  adaptResult(isQuery: boolean, res: QueryArrayResult<any>, fields: FieldDef[]): ISqlQueryResult {
    const queryResult: ISqlQueryResult = {};
    if (!res) {
      return queryResult;
    }
    if (isQuery) {
      const rows = res.rows;
      if (Array.isArray(rows) && Array.isArray(fields)) {
        let data: { [key: string]: any }[] = [];
        for (let i = 0; i < rows.length; i++) {
          let row = rows[i];
          let dataItem = {};
          for (let fieldItem of fields) {
            const { name, dataTypeID } = fieldItem;
            let value = row[name];
            dataItem[name] = PostgresUtils.getConvertValue(dataTypeID, value);
          }
          data.push(dataItem);
        }
        queryResult.data=data;
        queryResult.fields = fields;
      }
    } else {
      queryResult.affectedRows = res.rowCount;
    }
    return queryResult;
  }

  async connect(callback: (err: Error) => void) {
    this.client.connect((err) => {
      callback(err);
      if (!err) {
        this.client.on('error', this.close);
        this.client.on('end', () => {
          this.dead = true;
        });
      }
    });
  }

  async beginTransaction(callback: (err: Error) => void) {
    this.client.query('BEGIN', callback);
  }

  async rollback() {
    //await this.client.query('ROLLBACK');
    if (this.dead) {
      console.error('Error: Client is closed and not queryable.');
    } else {
      // 执行回滚操作
      this.client
        .query('ROLLBACK')
        .then(() => {
          console.log('Transaction rolled back successfully.');
        })
        .catch((err) => {
          console.error('Error rolling back transaction:', err);
        });
    }
  }

  ping(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      // this.con.ping(err => {
      //   if (err)
      //     reject(err)
      //   else
      resolve(true);
      //})
    });
  }

  async commit() {
    await this.client.query('COMMIT');
  }

  async close() {
    this.dead = true;
    // console.log('end transaction',this.client);
    await this.client.end();
  }
}

