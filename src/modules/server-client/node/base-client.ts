import { ConnectQuery } from '../../local-store-db/common';
import { IQueryResult, IRunSqlResult, ISqlQueryResult } from '../common';
import { RPCService } from '@opensumi/ide-connection';
import { SqlUtils } from '../../base/utils/sql-utils';
import { ClusterType, ServerType } from '../../base/types/server-node.types';
import { ServerClusterDao } from '../../local-store-db/node/server-cluster.dao';
import { isArrayVoid } from '../../base/utils/object-util';
import { PostgresServerAdapter } from './adapter/postgres-server-adapter';
import { MysqlServerAdapter } from './adapter/mysql-server-adapter';
import { OracleServerAdapter } from './adapter/oracle-server-adapter';
import { MssqlServerAdapter } from './adapter/mssql-server-adapter';
import { RedisServerAdapter } from './adapter/redis-server-adapter';
import { ZookeeperServerAdapter } from './adapter/zookeeper-server-adapter';
import { KafkaServerAdapter } from './adapter/kafka-server-adapter';
import { EtcdServerAdapter } from './adapter/etcd-server-adapter';
import { PostgresDialect } from '../common/dialet/postgres-dialect';
import { OracleDialect } from '../common/dialet/oracle-dialect';
import { ServerAdapter } from './adapter/server-adapter';
import { DMServerAdapter } from './adapter/dm-server-adapter';
import { EsServerAdapter } from './adapter/es-server-adapter';

interface ConnectionInfo {
  serverAdapter: ServerAdapter;
  //ssh?: SSHConfig;
  db?: string | number;
  schema?: string;
}

export abstract class AbstractBaseClient<T = any> extends RPCService {

  private static aliveConnection: Map<string, ConnectionInfo> = new Map();

  private static autoChangeDbServerType: ServerType[] = ['Oracle', 'DM'];


  public async getClient(connect: ConnectQuery): Promise<T> {
    try {
      const connection = await this.getConnection(connect);
      const client = connection.getClient();
      return client;
    } catch (e) {
      throw new Error('Connection is error!');
    }
  }

  public static async closeConnection(connectId: string): Promise<boolean> {
    try {
      //每个数据库创建一个连接比如 mysql:127.0.0.1@3306@root@test
      //关闭时，能关闭服务下的所有连接
      for (let key of this.aliveConnection.keys()) {
        if (key === connectId || key.startsWith(connectId)) {
          const activeConnect = this.aliveConnection.get(key);
          console.log('删除连接removeConnection--->', key);
          if (activeConnect) {
            await AbstractBaseClient.close(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public async closeConnection(connect: ConnectQuery) {
    return AbstractBaseClient.closeConnection(AbstractBaseClient.getConnectKey(connect));
  }

  /**
   * 路径组成：必须使用serverId开头，因为@removeConnection方法关闭是，有serverId的开头计算
   * @param connect
   */
  public static getConnectKey(connect: ConnectQuery) {
    const { server, db, schema, ssh } = connect;
    const { serverId, serverType, host, port, url, user, usingSsh } = server;
    let uid = (serverId ? serverId + '/' : '') + serverType;
    if (host && port) {
      uid += `/${host}@${port}`;
    } else if (url) {
      uid = `${uid}/${url}`;
    }
    if (user) {
      uid = `${uid}/${user}`;
    }
    if (db) {
      //如果带db，则每个db一个连接，如果不带db，则所有db使用一个连接，需要每次动态切换库
      //oracle需要自动切换db,因为oracle所有db使用一个连接
      if (!AbstractBaseClient.autoChangeDbServerType.includes(serverType!)) uid = `${uid}/${db}`;
    }
    return uid;
  }

  public async getConnection(
    ConnectQuery: ConnectQuery,
  ): Promise<ServerAdapter> {
    if (!ConnectQuery) {
      throw new Error('Connection is empty!');
    }
    const { server, ssh, db, schema } = ConnectQuery;
    return new Promise(async (resolve, reject) => {
      const key = AbstractBaseClient.getConnectKey(ConnectQuery);
      let connectionInfo = AbstractBaseClient.aliveConnection.get(key);
      console.log('server:', ';db:', db, ';schema:', schema);
      //prettier-ignore
      if (connectionInfo) {
        const isAlive = await connectionInfo.serverAdapter.isAlive();
        // console.log(
        //   `${server.serverType}-getConnection: -- currentDb:${db};currentSchema:${schema},oldSchema: ${connectionInfo.schema};isAlive: ${isAlive}`,
        // );
        if (isAlive) {
          try {
            await this.changeDbOrSchema(ConnectQuery, connectionInfo);
            console.log('return success connection');
            return resolve(connectionInfo.serverAdapter);
          } catch (err) {
            await AbstractBaseClient.close(key);
            return reject(err);
          }
          //resolve(connectionInfo.serverAdapter);
        } else {
          await AbstractBaseClient.close(key);
        }
      }
      console.log('no connection ,next create connection');

      let newConnection: ServerAdapter | null = null;
      try {
        newConnection = await this.createInstance(ConnectQuery);
        console.log('create new connection success----------->', key);
      } catch (e) {
        console.log('create new connection error----------->');
        return reject(e);
      }
      if (newConnection) {
        const newConnectionInfo = { serverAdapter: newConnection, db };
        AbstractBaseClient.aliveConnection.set(key, newConnectionInfo);
        await newConnection.connect(async (err: Error) => {
          if (err) {
            await AbstractBaseClient.close(key);
            reject(err);
          } else {
            try {
              await this.changeDbOrSchema(ConnectQuery, newConnectionInfo!, true);
            } catch (error) {
              console.log(err);
              return reject(error);
            }
            console.log('connect创建成功------------》');
            resolve(newConnection!);
          }
        });
      }
    });
  }

  private async changeDbOrSchema(
    ConnectQuery: ConnectQuery,
    connectionInfo: ConnectionInfo,
    isCreate: boolean = false,
  ) {
    const { serverAdapter } = connectionInfo;
    return new Promise<void>(async (resolve, reject) => {
      try {
        const useDbOrSchemaSql = AbstractBaseClient.getUseDbOrSchemaSql(ConnectQuery, connectionInfo, isCreate);
        if (useDbOrSchemaSql) {
          // prettier-ignore
          console.log('切换schema------------》我应该很少需要运行', 'ConnectQuery:', ConnectQuery.db, connectionInfo.db);
          await serverAdapter.query({ sql: useDbOrSchemaSql, isQuery: false });
        }
      } catch (error) {
        console.log(error);
        reject(error);
      }
      console.log('changeDbOrSchema----------》finish');
      resolve();
    });
  }

  private async createInstance(connect: ConnectQuery): Promise<ServerAdapter | null> {
    console.log('connection create', connect);
    let clusterDao = new ServerClusterDao();
    const { server, cluster } = connect;
    if (server.connectionType && ClusterType.includes(server.connectionType) && isArrayVoid(cluster)) {
      connect.cluster = await clusterDao.findByServerId(server.serverId!);
    }
    try {
      switch (connect.server.serverType) {
        case 'Postgresql':
          return PostgresServerAdapter.createInstance(connect);
        case 'Mysql':
        case 'Mariadb':
          return MysqlServerAdapter.createInstance(connect);
        case 'Oracle':
          return OracleServerAdapter.createInstance(connect);
        case 'DM':
          return DMServerAdapter.createInstance(connect);
        case 'RDJC':
        case 'SQLServer':
          return MssqlServerAdapter.createInstance(connect);
        case 'Elasticsearch':
          return EsServerAdapter.createInstance(connect);
        case 'Redis':
          return RedisServerAdapter.createInstance(connect);
        case 'Zookeeper':
          return ZookeeperServerAdapter.createInstance(connect);
        case 'Kafka':
          return KafkaServerAdapter.createInstance(connect);
        case 'Etcd':
          return EtcdServerAdapter.createInstance(connect);
        default:
          throw Error('server not implement createInstance');
      }
    } catch (e) {
      console.error('========create- connect error', e);
      throw e;
    }
    return null;
  }

  /**
   *
   * @param ConnectQuery
   * @param connectionInfo
   * @param isCreate 如果是第一次创建，必须切库，
   */
  public static getUseDbOrSchemaSql(
    ConnectQuery: ConnectQuery,
    connectionInfo: ConnectionInfo,
    isCreate: boolean,
  ): string {
    const { db: originalDb, schema: originalSchema } = connectionInfo;
    const {
      server: { serverType },
      db,
      schema,
    } = ConnectQuery;
    switch (serverType) {
      case 'Postgresql':
        if (schema && (schema !== originalSchema || isCreate)) {
          connectionInfo.schema = schema;
          return new PostgresDialect().useSchema(schema);
        }
        break;
      case 'Oracle':
        if (db && (db !== originalDb || isCreate)) {
          connectionInfo.db = db;
          return new OracleDialect().useDataBase(db as string);
        }
        break;
    }

    return '';
  }

  private static async close(key: string) {
    const connection = AbstractBaseClient.aliveConnection.get(key);
    if (connection) {
      this.aliveConnection.delete(key);
      try {
        await connection.serverAdapter.close();
      } catch (error) {
        console.log('close connect happen error', error);
      }
    }
  }


}

export abstract class AbstractBaseSqlClient extends AbstractBaseClient {
  public async runSqlPromise(connection: ServerAdapter, sql: string): Promise<IRunSqlResult> {
    return new Promise<IRunSqlResult>((resolve, reject) => {
      const executeTime = new Date().getTime();
      let queryResponse: IRunSqlResult = { success: true, isQuery: false, sql, message: 'success' };
      try {
        const isQuery = SqlUtils.isQuery(sql);
        console.log('runSqlPromise:sql-->', sql, 'isQuery:', isQuery);
        connection.query({ sql, isQuery }, (err: Error, queryResult?: ISqlQueryResult) => {
          queryResponse.costTime = new Date().getTime() - executeTime;
          queryResponse.isQuery = isQuery;
          if (err) {
            // prettier-ignore
            console.log('base-client--err---->json:', JSON.stringify(err), ',name:', err?.name, ';message:',
              err?.message, ';stack:', err?.stack, ';cause:', err?.cause);
            reject(err);
            return;
          } else {
            console.log('runSqlPromise:result-->', queryResult);
          }
          const { data, fields, total, affectedRows } = queryResult;
          if (affectedRows) {
            queryResponse.message = `Affected Rows: ${affectedRows}`;
            queryResponse.affectedRows = affectedRows;
            //resolve(queryResponse);
          }
          if (data && Array.isArray(data)) {
            queryResponse.fields = fields;
            queryResponse.data = data;
          }
          resolve(queryResponse);
        });
      } catch (error) {
        console.error('数据库出现位置错误------》', error);
        reject(error);
      }
    });
  }

  public runBatchSqlPromise(
    connection: ServerAdapter,
    sqlList: string[],
    isTransaction: boolean = true,
  ): Promise<IRunSqlResult[]> {
    return new Promise<IRunSqlResult[]>(async (resolve, reject) => {
      const runSql = async () => {
        let runBatchResult: IRunSqlResult[] = [];
        const executeTime = new Date().getTime();
        let sql;
        try {
          for (sql of sqlList) {
            const runResult = await this.runSqlPromise(connection, sql);
            runBatchResult.push(runResult);
          }
          isTransaction && (await connection.commit());
        } catch (err) {
          console.error('runBatchSql-->catch error--->', err);
          const costTime = new Date().getTime() - executeTime;
          isTransaction && (await connection.rollback());
          const errorResult: IRunSqlResult = this.getErrorResult(err);
          errorResult.costTime = costTime;
          errorResult.sql = sql;
          runBatchResult.push(errorResult as IRunSqlResult);
        }
        resolve(runBatchResult);
      };
      if (isTransaction) {
        await connection.beginTransaction(runSql);
      } else {
        await runSql();
      }
    });
  }

  /**
   * 因为每个客户端返回的error信息内容都不同，所以需要分类取
   * @param error
   */
  public abstract getErrorResult(error: any): IQueryResult;
}

export abstract class AbstractDefaultClient extends AbstractBaseSqlClient {
  public async runSql(ConnectQuery: ConnectQuery, sql: string): Promise<IRunSqlResult> {
    const executeTime = new Date().getTime();
    try {
      const connect = await this.getConnection(ConnectQuery);
      return await this.runSqlPromise(connect, sql);
    } catch (error) {
      console.log('-catch----------------------AbstractDefaultClient--runSql', error, '\n', error.sqlMessage);
      const errorResult = this.getErrorResult(error) as IRunSqlResult;
      errorResult.costTime = new Date().getTime() - executeTime;
      errorResult.sql = sql;
      return errorResult;
    }
  }

  public async runBatch(
    connectOpt: ConnectQuery,
    batchSql: string[],
    isTransaction?: boolean,
  ): Promise<IRunSqlResult[]> {
    console.log('AbstractDefaultClient---runBatch>', batchSql, ',isTransaction:', isTransaction);
    const executeTime = new Date().getTime();
    try {
      const connect = await this.getConnection(connectOpt);
      let runBatchResult: IRunSqlResult[] = await this.runBatchSqlPromise(connect, batchSql, isTransaction);
      return runBatchResult;
    } catch (error) {
      console.log('-catch----------------------AbstractDefaultClient--runSql', error, '\n', error.sqlMessage);
      const errorResult = this.getErrorResult(error) as IRunSqlResult;
      errorResult.costTime = new Date().getTime() - executeTime;
      return [errorResult];
    }
  }
}
