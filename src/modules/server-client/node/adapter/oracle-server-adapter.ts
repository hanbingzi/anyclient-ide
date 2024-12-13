import * as oracledb from 'oracledb';
import { Metadata, Result } from 'oracledb';
import { ServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { OracleUtils } from '../../common/utils/oracle-utils';
import { OracleColumnEnum } from '../../common/fields/oracle-fields';
import { ISqlQueryParam, ISqlQueryResult } from '../../common';
import * as path from 'path';
import { AppUtil } from '../../../base/utils/app-util';
//此处不好处理,webpack打包的时候，需要拷贝到正确的路径
// let clientOpts = { libDir: 'D:\\devtool\\oracle\\instantclient_11_2\\' };
const instantFolder = 'instantclient_11_2';

//
export class OracleServerAdapter extends ServerAdapter {
  private conn: oracledb.Connection;
  private autoCommit: boolean = true;

  private constructor(conn: oracledb.Connection) {
    super();
    this.conn = conn;
  }

  public static async createInstance(connect: ConnectQuery): Promise<ServerAdapter> {
    const { server, db, ssh, originPassword } = connect;
    const { host, port, user, instanceName, role, orclServerType, password, timezone, connectTimeout } = server;
  //  console.log('createInstance', instantPath)
    if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
      const instantPath = path.join(AppUtil.getExecRootPath(),'oracle',instantFolder)
      let clientOpts = { libDir: instantPath };
      oracledb.initOracleClient(clientOpts);
    }
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
    //console.log('decodePassword', decodePassword)
    const connectString = `${host}:${port}${orclServerType === 'SID' ? ':' : '/'}${instanceName}`;
    const privilege = role === 'SYSDBA' ? oracledb.SYSDBA : role === 'SYSOPER' ? oracledb.SYSOPER : '';
    let config = {
      user,
      password: decodePassword,
      connectString,
      connectTimeout:connectTimeout||5000
    } as oracledb.ConnectionAttributes;

    if (privilege) {
      config.privilege = privilege;
    }
    try {
      console.log('oracle connect:', config);
      const conn = await oracledb.getConnection(config);
      const instance = new OracleServerAdapter(conn);
      return instance;
    } catch (e) {
      console.log('创建oracle 链接失败', e);
      throw e;
    }
  }

  async isAlive(): Promise<boolean> {
    const isAlive = !this.dead && this.conn.isHealthy();
    console.log('isAlive---->isAlive:', isAlive, ',dead:', this.dead, ',isHealthy:', this.conn.isHealthy());
    return isAlive;
  }

  query(params: ISqlQueryParam, callback?: queryCallback) {
    const { sql, values, isQuery } = params;
    const options = {
      autoCommit: this.autoCommit, // 如果需要自动提交更改，请设置为 true
    };
    this.conn.execute(sql, {}, options, async (error, result) => {
      //console.log('oracle query result--->', sql,';options:',options);
      //result?.metaData
      if (callback) {
        callback(error, await this.adaptResult(isQuery, result));
      }
    });
  }

  /**
   * 修改结果示例：{ lastRowid: 'AAASlPAAHAAAACHAAC', rowsAffected: 1 }
   * @param isQuery
   * @param res
   */
  async adaptResult(isQuery: boolean=false, res: Result<any>): Promise<ISqlQueryResult> {
    const queryResult: ISqlQueryResult = {};
    if (!res) {
      return queryResult;
    }
    if (isQuery) {
      if (res.rows && res.metaData) {
        let data: { [key: string]: any }[] = [];
        //查询数据转换，转换原因因为跟mysql查询出来的数据不兼容
        const metaData = res.metaData;
        const rows = res.rows;
        if (Array.isArray(metaData) && Array.isArray(rows)) {
          for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let dataItem = {};
            for (let j = 0; j < metaData.length; j++) {
              let metaItem: Metadata<any> = metaData[j];
              const { name, dbTypeName } = metaItem;
              let value = row[j];
              if (value) {
                if (dbTypeName === OracleColumnEnum.CLOB || dbTypeName === OracleColumnEnum.NCLOB) {
                  dataItem[name] = await this.dealClob(value);
                } else {
                  dataItem[name] = OracleUtils.getConvertValue(dbTypeName!, value);
                }
              }
            }
            data.push(dataItem);
          }
          queryResult.data = data;
          queryResult.fields = metaData;
        }
      }
    } else {
      if (res.rowsAffected) {
        queryResult.affectedRows = res.rowsAffected;
      }
    }
    return queryResult;
  }

  dealClob(clob: any): Promise<string> {
    let clobData = '';
    return new Promise((resolve, reject) => {
      clob.setEncoding('utf-8'); // Set the encoding if necessary
      clob.on('data', (chunk) => {
        clobData += chunk;
      });
      clob.on('end', () => {
        resolve(clobData);
      });
      clob.on('error', (err) => {
        reject(err);
      });
    });
  }

  async connect(callback: (err: any) => void): Promise<void> {
    // 监听连接关闭事件
    //this.connected = true;
    this.dead = false;
    callback(null);
  }

  async beginTransaction(callback: (err: any) => void): Promise<void> {
    this.autoCommit = false;
    this.conn.execute(
      `BEGIN
                                    -- Your PL/SQL block or transactional statements
                                  END;`,
      [],
      { autoCommit: false },
      callback,
    );
  }

  async rollback(): Promise<void> {
    this.conn.rollback((error) => {
      if (error) console.log('执行回滚', error);
    });
    this.autoCommit = true;
  }

  ping(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.conn.ping((error) => {
        if (error) {
          console.log('oracle ping报错', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async commit(): Promise<void> {
    await this.conn.commit();
    this.autoCommit = true;
  }

  async close(): Promise<void> {
    this.dead = true;
    await this.conn.close();
  }

  bitToBoolean(buf: Buffer): any {
    return buf ? buf[0] == 1 : null;
  }

  getClient() {
    return null;
  }
}
