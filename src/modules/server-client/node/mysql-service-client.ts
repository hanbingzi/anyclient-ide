import { Injectable } from '@opensumi/di';
import { IMysqlServiceClient } from '../common/types/mysql.types';
import { IQueryResult } from '../common';
import { AbstractDefaultClient } from './base-client';

@Injectable()
export class MysqlServiceClient extends AbstractDefaultClient implements IMysqlServiceClient {
  // private connectionManager = new ConnectionManager(new MysqlDialect());

  /**
   *
   * @param connectionServer
   */
  // public async closeConnection(connectionServer: ServerInfo) {
  //   ConnectionManager.removeConnection(ConnectionManager.getConnectId({server: connectionServer}))
  // }

  /**
   *
   * @param connectOpt
   */
  // public getConnection(connectOpt: ServerAdapterOption): Promise<ServerAdapter> {
  //   try {
  //     return this.connectionManager.getConnection(connectOpt);
  //   } catch (e) {
  //     console.log('getConnection--->', e)
  //     throw this.getErrorResult(e);
  //   }
  // }

  public getErrorResult(error: any): IQueryResult {
   // console.log('error-->', error.message, '---', error);
    return {
      success: false,
      message: error.sqlMessage ? error.sqlMessage : error.message ? error.message : JSON.stringify(error),
      code: error.errno ? error.errno : error.code ? error.code : '0',
    }; //sql: error.sql,
  }

  // private _cacheConnectsMap: Map<string, Connection> = new Map();
  //
  // private _cacheServerInfoMap: Map<string, ServerInfo> = new Map();
  //
  // /**
  //  *
  //  * @param key
  //  * @param connect
  //  * @param serverInfo
  //  */
  // cacheConnects(key: string, connection: Connection, serverInfo: ServerInfo) {
  //   if (this._cacheConnectsMap.has(key)) {
  //     // 将已经过期的链接删除
  //     this._cacheConnectsMap.delete(key);
  //   }
  //   if (this._cacheServerInfoMap.has(key)) {
  //     this._cacheServerInfoMap.delete(key);
  //   }
  //   this._cacheConnectsMap.set(key, connection);
  //   this._cacheServerInfoMap.set(key, serverInfo);
  // }
  //
  // connectIsSame(newInfo: ServerInfo, oldInfo: ServerInfo) {
  //   if (
  //     newInfo.address !== oldInfo.address ||
  //     newInfo.port !== oldInfo.port ||
  //     newInfo.username !== oldInfo.username ||
  //     newInfo.password !== oldInfo.password
  //   ) {
  //     return false;
  //   }
  //   return true;
  // }
  //
  // getConnect(serverInfo: ServerInfo, dbName?: string): Connection {
  //   let connectName: string;
  //   if (dbName) {
  //     connectName = serverInfo.serverName + '#' + dbName;
  //   } else {
  //     connectName = serverInfo.serverName;
  //   }
  //   if (this._cacheConnectsMap.has(connectName) && this._cacheServerInfoMap.has(connectName)) {
  //     // 验证链接信息是否已经发生改变
  //     let oldServerInfo = this._cacheServerInfoMap.get(connectName);
  //     if (this.connectIsSame(serverInfo, oldServerInfo)) {
  //       return this._cacheConnectsMap.get(connectName);
  //     }
  //   }
  //   let connection: Connection;
  //   if (dbName) {
  //     connection = mysql.createConnection({
  //       host: serverInfo.address,
  //       port: serverInfo.port,
  //       user: serverInfo.username ? serverInfo.username : '',
  //       password: serverInfo.password ? serverInfo.password : '',
  //       database: dbName,
  //     });
  //   } else {
  //     connection = mysql.createConnection({
  //       host: serverInfo.address,
  //       port: serverInfo.port,
  //       user: serverInfo.username ? serverInfo.username : '',
  //       password: serverInfo.password ? serverInfo.password : '',
  //     });
  //   }
  //   connection.connect();
  //   this.cacheConnects(connectName, connection, serverInfo);
  //   return connection;
  // }
  //
  // deleteCache(serverInfo: ServerInfo, dbName?: string) {
  //   let connectName: string;
  //   if (dbName) {
  //     connectName = serverInfo.serverName + '#' + dbName;
  //   } else {
  //     connectName = serverInfo.serverName;
  //   }
  //   if (this._cacheConnectsMap.has(connectName)) {
  //     // 将已经过期的链接删除
  //
  //     const connection = this._cacheConnectsMap.get(connectName);
  //     connection.end();
  //     this._cacheConnectsMap.delete(connectName);
  //   }
  //   if (this._cacheServerInfoMap.has(connectName)) {
  //     this._cacheServerInfoMap.delete(connectName);
  //   }
  // }
  //
  // closeAllConnection(serverInfo: ServerInfo) {
  //   let connectName = serverInfo.serverName;
  //   this._cacheConnectsMap.forEach((value, key) => {
  //     if (key.startsWith(connectName)) {
  //       this._cacheConnectsMap.delete(key);
  //       value.end();
  //     }
  //   });
  //   this._cacheServerInfoMap.forEach((value, key) => {
  //     if (key.startsWith(connectName)) {
  //       this._cacheServerInfoMap.delete(key);
  //     }
  //   });
  // }
  //
  // async queryList(
  //   sql: string,
  //   serverInfo: ServerInfo,
  //   dbName?: string,
  // ): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   console.log('Mysql - queryList - sql:', sql);
  //   let connection = this.getConnect(serverInfo, dbName);
  //   return new Promise<ArrayResult<RowDataPacket>>((resolve, reject) => {
  //     connection.query(sql, (error, result, fileds) => {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         console.log('mysql:result:');
  //         console.log(result);
  //         let Result: TableResult<FieldPacket, RowDataPacket> = {
  //           isSuccess: true,
  //           data: result as RowDataPacket[],
  //           columns: fileds,
  //         };
  //         resolve(Result);
  //       }
  //     });
  //   }).catch((reason) => {
  //     this.deleteCache(serverInfo, dbName);
  //     console.log('reason:', reason);
  //     let Result: ArrayResult<any> = {
  //       isSuccess: false,
  //       errorCode: reason.errno,
  //       errorMessage: reason.sqlMessage ? reason.sqlMessage : reason.code,
  //     };
  //     return Result;
  //   });
  // }
  //
  // async execSql(sql: string, serverInfo: ServerInfo, dbName?: string): Promise<ObjectResult<any>> {
  //   let connection = this.getConnect(serverInfo, dbName);
  //   return new Promise<ObjectResult<any>>((resolve, reject) => {
  //     connection.query(sql, (error, result, fileds) => {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         console.log('mysql:result:');
  //         console.log(result);
  //         let Result: ObjectResult<any> = {
  //           isSuccess: true,
  //           data: result,
  //         };
  //         resolve(Result);
  //       }
  //     });
  //   }).catch((reason) => {
  //     this.deleteCache(serverInfo, dbName);
  //     console.log('BaseResult:', reason);
  //     let Result: ObjectResult<any> = {
  //       isSuccess: false,
  //       errorCode: reason.errno,
  //       errorMessage: reason.sqlMessage ? reason.sqlMessage : reason.code,
  //     };
  //     return Result;
  //   });
  // }
  //
  // // ----------------------test-------------------------------
  // /**
  //  * test 是一次性的查询，所有连接不能复用
  //  * @param serverInfo
  //  */
  // async test(serverInfo: ServerInfo): Promise<BaseResult> {
  //   const connection = mysql.createConnection({
  //     host: serverInfo.address,
  //     port: serverInfo.port,
  //     user: serverInfo.username ? serverInfo.username : '',
  //     password: serverInfo.password ? serverInfo.password : '',
  //   });
  //   const testSql = 'SELECT 1 + 1 AS solution';
  //   connection.connect();
  //   return new Promise<ObjectResult<any>>((resolve, reject) => {
  //     connection.query(testSql, (error, result, fileds) => {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         console.log('mysql:result:');
  //         console.log(result);
  //         let Result: BaseResult = {
  //           isSuccess: true,
  //         };
  //         resolve(Result);
  //       }
  //     });
  //   })
  //     .catch((reason) => {
  //       console.log('BaseResult:', reason);
  //       let Result: BaseResult = {
  //         isSuccess: false,
  //         errorCode: reason.errno ? reason.errno : '',
  //         errorMessage: reason.sqlMessage ? reason.sqlMessage : reason.code, // `ERROR: ${reason.syscall} ${reason.code} ${reason.address}:${reason.port}`
  //       };
  //       return Result;
  //     })
  //     .finally(() => {
  //       console.log('run finally------------>');
  //       try {
  //         connection.end();
  //       } catch (e) {
  //         console.log('--------', e);
  //       }
  //     });
  // }
  //
  // // ----------------------db ---------------------------------
  // /**
  //  * 展示所有的库
  //  * @param serverInfo
  //  */
  // async showDatabases(serverInfo: ServerInfo): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   // console.log('serverInfo:', serverInfo)
  //   return this.queryList('SHOW DATABASES', serverInfo);
  // }
  //
  // /**
  //  * 删除库
  //  * @param serverInfo
  //  */
  // async dropDatabase(serverInfo: ServerInfo, node: IServerTreeNode): Promise<BaseResult> {
  //   let sql = `DROP DATABASE ${node.nodeName}`;
  //   return this.execSql(sql, serverInfo);
  //   // return null;
  // }
  //
  // /**
  //  * 重命名
  //  */
  //
  // /**
  //  * 新建库
  //  */
  // createDatabase(serverInfo: ServerInfo, dbName: string) {
  //   let sql = `CREATE DATABASE ${dbName}`;
  //   return this.execSql(sql, serverInfo);
  // }
  //
  // // ----------------------table---------------------------------
  // showTables(serverInfo: ServerInfo, dbName: string): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   return this.queryList(
  //     `select TABLE_NAME, TABLE_COMMENT
  //      from information_schema.tables
  //      where TABLE_SCHEMA = '${dbName}'
  //        and TABLE_TYPE = 'BASE TABLE'`,
  //     serverInfo,
  //     dbName,
  //   );
  // }
  //
  // // 显示建表语句
  // showCreateTable(serverInfo: ServerInfo, node: IServerTreeNode): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   const sql = `SHOW CREATE TABLE ${node.nodeName}`;
  //   return this.queryList(sql, serverInfo, node.db as string);
  // }
  //
  // createTable() {}
  //
  // dropTable(serverInfo: ServerInfo, node: IServerTreeNode): Promise<BaseResult> {
  //   let sql = `drop table ${node.nodeName}`;
  //   return this.execSql(sql, serverInfo, node.db as string);
  //   // return null;
  // }
  //
  // alterTableName(serverInfo: ServerInfo, node: IServerTreeNode, newName: string) {
  //   let alterSql = `alter table ${node.nodeName} rename ${newName}`;
  //   return this.execSql(alterSql, serverInfo, node.db as string);
  // }
  //
  // // ----------------------table 内容---------------------------------
  //
  // selectTable(
  //   serverInfo: ServerInfo,
  //   db: string,
  //   tableName: string,
  //   page: IPage,
  // ): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   const sql = `SELECT *
  //                FROM ${tableName} LIMIT ${page.currentPageStart},${page.currentPageEnd}`;
  //
  //   return this.queryList(sql, serverInfo, db);
  // }
  //
  // // ----------------------------view------------------------------
  // showViews(serverInfo: ServerInfo, dbName: string): Promise<TableResult<FieldPacket, RowDataPacket>> {
  //   return this.queryList(
  //     `SELECT TABLE_NAME, TABLE_COMMENT
  //      FROM information_schema.tables
  //      WHERE TABLE_SCHEMA = '${dbName}'
  //        AND TABLE_TYPE = 'VIEW'`,
  //     serverInfo,
  //     dbName,
  //   );
  // }
  //
  // dropView(serverInfo: ServerInfo, node: IServerTreeNode): Promise<BaseResult> {
  //   let sql = `DROP VIEW ${node.nodeName}`;
  //   return this.execSql(sql, serverInfo, node.db as string);
  //   // return null;
  // }
}
