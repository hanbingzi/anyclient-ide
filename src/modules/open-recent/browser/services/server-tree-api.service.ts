import { Autowired, Injectable } from '@opensumi/di';
import { IDialogService } from '@opensumi/ide-overlay';
import {
  IJdbcServiceClientPath,
  IKafkaService,
  IKafkaServiceToken,
  IQueryResult,
  IRedisService,
  IRedisServiceToken,
  IRunSqlResult,
  ISqlServerApiToken,
  IZookeeperService,
  IZookeeperServiceToken,
  QueryResultError,
} from '../../../server-client/common';
import { ConnectQuery, IServerService, IServerServiceToken, ServerInfo } from '../../../local-store-db/common';
import { IServerTreeNode } from '../../../base/model/server-tree-node.model';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';
import { ServerClassNamespace, ServerTypeClass } from '../../../base/config/server.config';
import { QueryUtil } from '../../../base/utils/query-util';
import { ServerPreferences } from '../../../base/config/server-info.config';
import { IQuickInputService } from '@opensumi/ide-core-browser';
import { QuickInputService } from '@opensumi/ide-quick-open/lib/browser/quick-input-service';
import { PasswordStore } from '../../../local-store-db/browser/password-store';
import { encryptData } from '../../../base/utils/crypto-util';
import { JdbcServiceClient } from '../../../server-client/node/jdbc-service-client';
import { SqlTreeApiService } from './server/sql-tree-api.service';
import { ZookeeperTreeApiService } from './server/zookeeper-tree-api.service';
import { KafkaTreeApiService } from './server/kafka-tree-api.service';
import { RedisTreeApiService } from './server/redis-tree-api.service';
import { EtcdServerApiService } from './server/etcd-server-api.service';
import { EtcdService } from '../../../server-client/browser/services/etcd-service';
import { SubNodeType } from '../../../base/types/server-node.types';
import { EsServerApiService } from './server/es-server-api.service';
import SqlModeServer = ServerClassNamespace.SqlModeServer;


export interface IChildrenResult {
  success: boolean;
  tree?: IServerTreeNode[];
  result?: IQueryResult;

}

@Injectable()
export class ServerTreeApiService {
  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(ISqlServerApiToken)
  private sqlServerApiService: SqlServerApiService;

  @Autowired(IRedisServiceToken)
  private redisService: IRedisService;

  @Autowired(IZookeeperServiceToken)
  private zookeeperService: IZookeeperService;

  @Autowired(IKafkaServiceToken)
  private kafkaService: IKafkaService;

  @Autowired(EtcdService)
  private etcdService: EtcdService;

  @Autowired(IQuickInputService)
  private readonly quickInputService: QuickInputService;

  @Autowired(IJdbcServiceClientPath)
  private jdbcServiceClient: JdbcServiceClient;

  @Autowired(SqlTreeApiService)
  private sqlTreeApiService: SqlTreeApiService;

  @Autowired(ZookeeperTreeApiService)
  private zookeeperTreeApiService: ZookeeperTreeApiService;

  @Autowired(KafkaTreeApiService)
  private kafkaTreeApiService: KafkaTreeApiService;

  @Autowired(RedisTreeApiService)
  private redisTreeApiService: RedisTreeApiService;

  @Autowired(EtcdServerApiService)
  private etcdServerApiService: EtcdServerApiService;

  @Autowired(EsServerApiService)
  private esServerApiService: EsServerApiService;

  private filterSearch: string;

  setFilterSearch(pattern: string) {
    this.filterSearch = pattern;
  }

  async closeConnection(connect: ConnectQuery) {
    const { serverType } = connect.server;
    if (SqlModeServer.includes(serverType!)) {
      await this.sqlServerApiService.closeConnection(connect);
    } else if (serverType === 'Redis') {
      await this.redisService.closeConnection(connect);
    } else if (serverType === 'Zookeeper') {
      await this.zookeeperService.closeConnection(connect);
    } else if (serverType === 'Kafka') {
      await this.kafkaService.closeConnection(connect);
    } else {
      console.error('unrealized close connection');
      throw new Error('unrealized close connection');
    }
  }

  async resolveChildren(oldServer: ServerInfo, serverNode: IServerTreeNode): Promise<IChildrenResult> {
    //防止server被更改过，需要重新查询(因为树里面存储的server有可能是过期的，)
    const newServer = await this.processPasswordRemember(oldServer, serverNode);
    let childrenResult: IChildrenResult;
    //let result: IRunSqlResult<IServerTreeNode[]> = QueryResultError.UNREALIZED_ERROR;
    const { serverType } = newServer;
    if (SqlModeServer.includes(serverType!)) {
      childrenResult = await this.sqlTreeApiService.resolveSqlChildren(newServer, serverNode);
    } else if (serverType === 'Redis') {
      childrenResult = await this.redisTreeApiService.resolveRedisChildren(newServer, serverNode, this.filterSearch);
    } else if (serverType === 'Elasticsearch') {
      childrenResult = await this.esServerApiService.resolveEsChildren(newServer, serverNode);
    } else if (serverType === 'Zookeeper') {
      childrenResult = await this.zookeeperTreeApiService.resolveZookeeperChildren(newServer, serverNode);
    } else if (serverType === 'Kafka') {
      childrenResult = await this.kafkaTreeApiService.resolveKafkaChildren(newServer, serverNode);
    } else if (serverType === 'Etcd') {
      childrenResult = await this.etcdServerApiService.resolveEtcdChildren(newServer, serverNode);
    }
    if (!childrenResult.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(childrenResult.result), ['ok']);
    }
    return childrenResult;
  }

  async processPasswordRemember(oldServer: ServerInfo, serverNode: IServerTreeNode): Promise<ServerInfo> {
    const newServer = await this.serverService.findById(oldServer.serverId);
    if (serverNode.levelType === 'server') {
      //验证是需要输入密码，因为有可能服务的密码没有选择rememberMe
      if (!newServer.rememberMe) {
        //跳转让用户输入密码才能继续
        let password = await this.quickInputService.open({
          placeHolder: '请输入密码',
        });
        password = encryptData(password);
        newServer.password = password;
        PasswordStore.setPassword(newServer.serverId, password);
        const serverConfig = ServerPreferences[newServer.serverType];
        //清除jdbc内可能存在的老的缓存,解决输错密码的情况
        if (serverConfig.connectUseJdbc) {
          await this.jdbcServiceClient.clearJdbcServer(newServer.serverId);
        }
      }
    } else {
      //其他类型复用服务加载时处理过的密码
      if (!newServer.rememberMe) {
        newServer.password = PasswordStore.getPassword(newServer.serverId);
      }
    }
    return newServer;
  }

  async renameTreeNode(server: ServerInfo, node: IServerTreeNode, newName: string): Promise<IRunSqlResult> {
    let result: IQueryResult = QueryResultError.UNREALIZED_ERROR;
    const { serverType } = server;
    if (ServerTypeClass.Relational.includes(serverType!)) {
      result = await this.sqlServerApiService.renameByType(
        {
          server,
          db: node.db + '',
          schema: node.schema,
        },
        node.nodeType!,
        node.nodeName,
        newName,
      );
    } else if (serverType === 'Redis') {
      result = await this.redisService.keyRename({ server, db: node.db as number }, node.nodeName, newName);
    }
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
    return result;
  }

  /**
   * 删除节点
   * 删除的对象为左侧树形菜单上展示的节点
   * @param server
   * @param node
   */
  async deleteTreeNode(server: ServerInfo, node: IServerTreeNode): Promise<IRunSqlResult> {
    //console.log('删除节点--------------》')
    let result: IQueryResult = QueryResultError.UNREALIZED_ERROR;
    const { serverType } = server;
    if (SqlModeServer.includes(serverType!)) {
      result = await this.sqlServerApiService.dropByType(
        {
          server,
          db: node.db + '',
          schema: node.schema,
        },
        node.nodeType!,
        node.nodeName,
        node.table,
      );
    } else if (serverType === 'Redis') {
      result = await this.redisService.deleteByType({ server, db: node.db }, node.nodeType!, node.nodeName);
    } else if (serverType === 'Zookeeper') {
      result = await this.zookeeperService.delete({ server }, node.nodeValue as string);
    } else if (serverType === 'Kafka') {
      result = await this.kafkaService.deleteTopic({ server }, [node.nodeName]);
    } else if (serverType === 'Etcd') {
      result = await this.etcdService.deleteByType({ server }, node.nodeType as SubNodeType, node.nodeValue + '');
    }
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
    return result;
  }

  async createNode(server: ServerInfo, node: IServerTreeNode, inputName: string): Promise<IRunSqlResult> {
    let result: IQueryResult = QueryResultError.UNREALIZED_ERROR;
    const { serverType } = server;
    if (serverType === 'Zookeeper') {
      let fullPath = node.nodeValue + '/' + inputName;
      result = await this.zookeeperService.create({ server }, fullPath);
    }
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
    return result;
  }
}
