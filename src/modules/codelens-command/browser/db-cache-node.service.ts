import { Autowired, Injectable } from '@opensumi/di';
import { IServerService, IServerServiceToken, ServerInfo } from '../../local-store-db/common';
import { AllNodeType, FileSuffixType } from '../../base/types/server-node.types';
import {
  getServerFileSuffix,
  getServerSubType,
  ServerClassNamespace,
  ServerFileSuffix,
  ServerHasSchema,
  ServerTypeClass,
} from '../../base/config/server.config';
import { BaseNode, DbNode, IClearParam, ServerNode } from '../../base/model/cache-node.model';
import { IRedisService, IRedisServiceToken, IRunSqlResult, ISqlServerApiToken } from '../../server-client/common';
import { SqlServerApiService } from '../../server-client/browser/sql-server-api.service';
import { IDbSelectServiceToken } from '../../toolbar-option/common';
import { DbSelectService } from '../../toolbar-option/browser/db-select.service';
import { URI } from '@opensumi/ide-core-browser';
import { IWorkspaceService } from '@opensumi/ide-workspace';
import { IEsService, IEsServiceToken } from '../../server-client/common/types/es.types';
import SqlModeServer = ServerClassNamespace.SqlModeServer;

export class DatabaseCache {
  /**
   * <文件后缀，缓存的服务>
   *    |-sql    |-缓存的所有database
   *
   *                    |-tables缓存的table名称
   *                    |      |-缓存的column名称
   *                    |-views缓存的view名称
   *                    |-functions缓存的function名称
   *                    |-triggers缓存的触发器
   *                    |-procedures缓存的存储过程
   *    |-es     |-缓存的所有database
   *                    |-缓存的index名称
   *                    |      |-缓存的column名称
   *    |-redis  |-缓存的所有database
   */
  public static workspaceCache: Map<FileSuffixType, ServerNode[]> = new Map();
}

@Injectable()
export class DbCacheNodeService {
  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IDbSelectServiceToken)
  private readonly dbSelectService: DbSelectService;

  @Autowired(IRedisServiceToken)
  private redisService: IRedisService;

  @Autowired(IEsServiceToken)
  private esService: IEsService;

  @Autowired(ISqlServerApiToken)
  private sqlServerApiService: SqlServerApiService;

  // @Autowired(IJdbcServerApiToken)
  // private jdbcServerApiService: JdbcServerApiService;

  //@Autowired(AppConfig)
  //private readonly appConfig: AppConfig;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  public async getWorkspaceCacheServer(suffix: FileSuffixType): Promise<ServerNode[]> {
    let workspace = this.workspaceService.workspace?.uri
      ? new URI(this.workspaceService.workspace?.uri).path.toString()
      : '';
    if (!workspace) {
      return [];
    }
    const allServerType = ServerFileSuffix[suffix];
    if (!allServerType || allServerType.length === 0) return [];
    if (DatabaseCache.workspaceCache.has(suffix)) {
      return DatabaseCache.workspaceCache.get(suffix)!;
    }
    const serverInfoList = await this.serverService.findByWorkspaceAndServerType(workspace, allServerType);
    console.log('serverInfoList：', serverInfoList);
    const serverNodes: ServerNode[] = serverInfoList.map((item) => new ServerNode(item));
    DatabaseCache.workspaceCache.set(suffix, serverNodes);
    return serverNodes;
  }

  /**
   * 刷新存储服务的的缓存
   * @param suffix
   */
  public async refreshWorkspaceCacheServer(suffix: FileSuffixType) {
    let workspace = this.workspaceService.workspace?.uri
      ? new URI(this.workspaceService.workspace?.uri).path.toString()
      : '';
    if (!workspace) {
      return;
    }

    const allServerType = ServerFileSuffix[suffix];
    if (!allServerType || allServerType.length === 0) return [];
    const serverInfoList = await this.serverService.findByWorkspaceAndServerType(workspace, allServerType);
    const serverNodes: ServerNode[] = serverInfoList.map((item) => new ServerNode(item));
    DatabaseCache.workspaceCache.set(suffix, serverNodes);
  }

  public async getServerCacheDb(serverNode: ServerNode): Promise<DbNode[]> {
    const { serverInfo: server, children } = serverNode;
    console.log('是否缓存了--》', children);
    //先从缓存中读取
    if (children && children.size > 0) {
      return serverNode.getChildrenFlat() as DbNode[];
    }
    let databaseNodes: DbNode[] = [];
    const serverType = server.serverType!;
    if (SqlModeServer.includes(serverType)) {
      let sqlDatabases: IRunSqlResult<string[]>;
      sqlDatabases = await this.sqlServerApiService.showDatabases({ server });
      if (sqlDatabases && sqlDatabases.success) {
        const dbType = getServerSubType(serverType);
        databaseNodes = sqlDatabases.data!.map((item) => new DbNode(item, item, item, serverType, dbType));
      }
    } else if (serverType === 'Redis') {
      let cacheDatabases = (await this.redisService.showDatabases({ server })).data;
      if (cacheDatabases) {
        databaseNodes = cacheDatabases.map(
          (item) => new DbNode(item.name, item.db + '', item.name, serverType, 'redisDb'),
        );
      }
    } else if (serverType === 'Elasticsearch') {
      let indexList = await this.esService.showIndexList({ server });
      if (indexList.success) {
        databaseNodes = indexList.data.map((item) => new DbNode(item.index, item.index, item.index, serverType, 'index'));
      }
    }
    if (databaseNodes && databaseNodes.length > 0) {
      serverNode.setChildren(databaseNodes);
    }
    return databaseNodes;
  }

  public async getServerCacheSchema(serverNode: ServerNode, dbNode: DbNode): Promise<DbNode[]> {
    const { serverInfo: server, serverType } = serverNode;
    const { children } = dbNode;
    //console.log('是否缓存了--》', children)
    //先从缓存中读取
    if (children && children.size > 0) {
      return dbNode.getChildrenFlat() as DbNode[];
    }
    let schemaNodes: DbNode[] = [];
    let sqlSchemaResult: IRunSqlResult<string[]> = await this.sqlServerApiService.showSchemas({
      server,
      db: dbNode.name,
    });

    if (sqlSchemaResult?.success) {
      schemaNodes = sqlSchemaResult.data.map((item) => new DbNode(item, item, item, serverType, 'schema'));
    }
    if (schemaNodes && schemaNodes.length > 0) {
      dbNode.setChildren(schemaNodes);
    }
    return schemaNodes;
  }

  /**
   * 清空部分缓存
   */
  public async clearCache(clearParam?: IClearParam) {
    const selectedServer = this.dbSelectService.selectedServerNode;
    const selectedDb = this.dbSelectService.selectedDbNode;
    console.log('clearCache:', clearParam, selectedServer, selectedDb);
    //刷新所有服务
    if (!clearParam) {
      DatabaseCache.workspaceCache.clear();
      DbSelectService.cacheOpenFileSelected.clear();
      //用户的选择也得从新打开
      return;
    }
    const { serverType, serverName, dbName } = clearParam;
    const fileType: FileSuffixType = getServerFileSuffix(serverType);
    const cacheServers = DatabaseCache.workspaceCache.get(fileType);
    if (!cacheServers) {
      return;
    }
    const servers = cacheServers.filter((item) => item.name === serverName);
    if (servers && servers.length === 1) {
      const server = servers[0];
      if (dbName && ServerHasSchema.includes(serverType)) {
        const cacheDb = server.children?.get(dbName);
        if (cacheDb) {
          cacheDb.clearChildren();
          //假如用户当前打开了该db，则该db下的schema也需要重新加载
          if (selectedServer && selectedServer.name === serverName && selectedDb && selectedDb.name === dbName) {
            const newCacheSchema = await this.getServerCacheSchema(server, cacheDb as DbNode);
            this.dbSelectService.updateSchemaNodes(newCacheSchema);
          }
        }
      } else {
        server.clearChildren();
        //假如用户当前打开了该server，该server下db从新加载
        if (selectedServer && selectedServer.name === serverName) {
          const newCacheDbs = await this.getServerCacheDb(server);
          this.dbSelectService.updateDbNodes(newCacheDbs);
        }
      }
    }
  }

  /**
   * 用户能获得代码提示的前提是：必须在toolbar中选中了一个服务，
   */
  public async getSqlDbsForCompleteCommand(): Promise<BaseNode[]> {
    const selectedServerNode = this.dbSelectService.selectedServerNode;
    let dbNodes: BaseNode[] = [];
    if (selectedServerNode) {
      dbNodes = await this.getServerCacheDb(selectedServerNode);
    } else {
      //将所有缓存的库返回
      if (this.dbSelectService.suffix === 'sql') {
        if (DatabaseCache.workspaceCache.has('sql')) {
          const serverNodes = DatabaseCache.workspaceCache.get('sql')!;
          for (let serverNode of serverNodes) {
            if (serverNode.children) {
              dbNodes.concat(serverNode.getChildrenFlat());
            }
          }
        }
      }
    }
    return dbNodes;
  }

  public async getSqlDbSubItemsForCompleteCommand(
    nodeType: AllNodeType = 'tables',
    schema?: string | null,
  ): Promise<BaseNode[]> {
    const selectedServerNode = this.dbSelectService.selectedServerNode;
    console.log('SqlDbSubItems - schema:', schema);
    if (!selectedServerNode) {
      console.log('SqlDbSubItems---------------->1');
      return [];
    }
    if (selectedServerNode.children?.size === 0) {
      console.log('SqlDbSubItems---------------->2');
      return [];
    }
    const selectedDbNode = this.dbSelectService.selectedDbNode;
    let useDbNode: DbNode | undefined;
    let dbSubNodes: BaseNode[] = [];
    //命令传过来的数据库，被优先使用
    if (schema) {
      console.log('SqlDbSubItems---------------->3');
      if (selectedServerNode.children?.has(schema)) {
        console.log('SqlDbSubItems---------------->4');
        useDbNode = selectedServerNode.children?.get(schema) as DbNode;
      }
    } else if (selectedDbNode) {
      console.log('SqlDbSubItems---------------->5');
      useDbNode = selectedDbNode;
    }
    if (useDbNode) {
      if (useDbNode.children?.has(nodeType)) {
        console.log('---------------->6');
        dbSubNodes = useDbNode.children?.get(nodeType)!.getChildrenFlat();
        console.log('getSqlDbSubItemsForCompleteCommand本次读缓存：', dbSubNodes);
      } else {
        console.log('SqlDbSubItems---------------->7');

        dbSubNodes = await this.cacheDbSubItems(selectedServerNode.serverInfo, useDbNode, nodeType);
      }
    } else if (!schema) {
      console.log('SqlDbSubItems---------------->8');
      //没有提示传递过来的数据库，也没有选择的数据库，那么服务下的所有数据库的表格都查询出来
      for (let itemDb of selectedServerNode.children?.values()!) {
        if (itemDb.children?.has(nodeType)) {
          dbSubNodes = dbSubNodes.concat(itemDb.children?.get(nodeType)!.getChildrenFlat());
          console.log('本次读缓存：', itemDb.name);
        } else {
          let queryDbSubNodes = await this.cacheDbSubItems(selectedServerNode.serverInfo, itemDb as DbNode, nodeType);
          dbSubNodes = dbSubNodes.concat(queryDbSubNodes);
        }
      }
    }
    return dbSubNodes;
  }

  public async cacheDbSubItems(serverInfo: ServerInfo, dbNode: DbNode, nodeType: AllNodeType): Promise<BaseNode[]> {
    switch (nodeType) {
      case 'tables':
        return this.cacheTable(serverInfo, dbNode);
      case 'views':
        return this.cacheView(serverInfo, dbNode);
      case 'functions':
        return this.cacheFunction(serverInfo, dbNode);
      case 'procedures':
        return this.cacheProcedure(serverInfo, dbNode);
      case 'triggers':
        return this.cacheTrigger(serverInfo, dbNode);
    }
    return [];
  }

  public async cacheTable(server: ServerInfo, dbNode: DbNode): Promise<BaseNode[]> {
    const { serverType } = server;
    let queryTable = await this.sqlServerApiService.showTables({ server, db: dbNode.name });
    let tablesNode = new BaseNode('tables', '', '', server.serverType!, 'tables');
    let tablesNodeChildren: BaseNode[] = [];
    if (queryTable.success && queryTable.data) {
      tablesNodeChildren = queryTable.data.map(
        (item) => new BaseNode(item.name, item.name, item.comment, server.serverType!, 'table'),
      );
      tablesNode.setChildren(tablesNodeChildren);
    }
    dbNode.addChildren('tables', tablesNode);
    return tablesNodeChildren;
  }

  public async cacheView(server: ServerInfo, dbNode: DbNode): Promise<BaseNode[]> {
    const { serverType } = server;
    let queryView = await this.sqlServerApiService.showViews({ server, db: dbNode.name });
    let viewsNode = new BaseNode('views', '', '', server.serverType!, 'views');
    let viewsNodeChildren: BaseNode[] = [];
    if (queryView.success && queryView.data) {
      viewsNodeChildren = queryView.data.map(
        (item) => new BaseNode(item.name, item.name, item.comment, serverType!, 'view'),
      );
      viewsNode.setChildren(viewsNodeChildren);
    }
    dbNode.addChildren('views', viewsNode);
    return viewsNodeChildren;
  }

  public async cacheFunction(server: ServerInfo, dbNode: DbNode): Promise<BaseNode[]> {
    const { serverType } = server;
    let queryFunction = await this.sqlServerApiService.showFunctions({ server, db: dbNode.name });

    let functionsNode = new BaseNode('functions', '', '', server.serverType!, 'functions');
    let functionsNodeChildren: BaseNode[] = [];
    if (queryFunction.success && queryFunction.data) {
      functionsNodeChildren = queryFunction.data.map(
        (item) => new BaseNode(item.name, item.name, item.comment, serverType!, 'function'),
      );
      functionsNode.setChildren(functionsNodeChildren);
    }
    dbNode.addChildren('functions', functionsNode);
    return functionsNodeChildren;
  }

  public async cacheTrigger(server: ServerInfo, dbNode: DbNode): Promise<BaseNode[]> {
    const { serverType } = server;
    if (!ServerTypeClass.Relational.includes(serverType)) {
      return [];
    }
    const queryTrigger = await this.sqlServerApiService.showTriggers({ server, db: dbNode.name });
    let triggersNode = new BaseNode('triggers', '', '', server.serverType!, 'triggers');
    let triggersNodeChildren: BaseNode[] = [];
    if (queryTrigger.success && queryTrigger.data) {
      triggersNodeChildren = queryTrigger.data.map(
        (item) => new BaseNode(item.name, item.name, item.name, server.serverType!, 'trigger'),
      );
      triggersNode.setChildren(triggersNodeChildren);
    }
    dbNode.addChildren('triggers', triggersNode);
    return triggersNodeChildren;
  }

  public async cacheProcedure(server: ServerInfo, dbNode: DbNode): Promise<BaseNode[]> {
    const { serverType } = server;
    let queryProcedure = await this.sqlServerApiService.showProcedures({ server, db: dbNode.name });
    let proceduresNode = new BaseNode('procedures', '', '', server.serverType!, 'procedures');
    let proceduresNodeChildren: BaseNode[] = [];
    if (queryProcedure.success && queryProcedure.data) {
      proceduresNodeChildren = queryProcedure.data.map(
        (item) => new BaseNode(item.name, item.name, item.comment, server.serverType!, 'procedure'),
      );
      proceduresNode.setChildren(proceduresNodeChildren);
    }
    dbNode.addChildren('procedures', proceduresNode);
    return proceduresNodeChildren;
  }

  /**
   *
   * @param nodeType
   * @param table
   *
   */
  public async getSqlColumnsForCompleteCommand(schema?: string | null, tables?: string[] | null): Promise<BaseNode[]> {
    const selectedServerNode = this.dbSelectService.selectedServerNode;
    console.log('请求的tables--------->', tables);
    if (!selectedServerNode) {
      console.log('SqlColumns---------------->1');
      return [];
    }
    if (selectedServerNode.children?.size === 0) {
      console.log('SqlColumns---------------->2');
      return [];
    }
    const selectedDbNode = this.dbSelectService.selectedDbNode;
    let useDbNode: DbNode | undefined;
    let columnNodes: BaseNode[] = [];
    //命令传过来的数据库，被优先使用
    if (schema) {
      console.log('SqlColumns---------------->3');
      if (selectedServerNode.children?.has(schema)) {
        console.log('SqlColumns---------------->4');
        useDbNode = selectedServerNode.children?.get(schema) as DbNode;
      }
    } else if (selectedDbNode) {
      console.log('SqlColumns---------------->5');
      useDbNode = selectedDbNode;
    }
    if (!useDbNode) {
      console.log('SqlColumns---------------->6');
      return [];
    }
    if (!useDbNode.isCache || !useDbNode.children?.get('tables')!.isCache) {
      await this.cacheTable(selectedServerNode.serverInfo, useDbNode);
    }
    const tablesNode = useDbNode.children?.get('tables')!;

    const tablesChildren = tablesNode.children!;
    if (tablesChildren.size === 0) {
      //当前数据库没有表，
      console.log('SqlColumns---------------->7');
      return [];
    }
    if (!tables || tables.length === 0) {
      console.log('SqlColumns---------------->8');
      columnNodes = await this.getTableColumns(
        selectedServerNode.serverInfo,
        useDbNode,
        ...tablesNode.getChildrenFlat()!,
      );
    }
    //必须能够查询到表名，才可以查询出表下面的字段
    else {
      let tablesNode: BaseNode[] = [];
      tables.forEach((item) => {
        if (tablesChildren.has(item)) {
          tablesNode.push(tablesChildren.get(item)!);
        }
      });
      console.log('SqlColumns---------------->9');
      columnNodes = await this.getTableColumns(selectedServerNode.serverInfo, useDbNode, ...tablesNode);
    }
    return columnNodes;
  }

  public async getTableColumns(serverInfo: ServerInfo, dbNode: DbNode, ...tableNodes: BaseNode[]): Promise<BaseNode[]> {
    let columnNodeMap: Map<string, BaseNode> = new Map();
    let columnNodes: BaseNode[] = [];
    for (let tableNode of tableNodes) {
      let itemColumnNodes: BaseNode[];
      if (tableNode.isCache && tableNode.children!.size > 0) {
        itemColumnNodes = tableNode.getChildrenFlat();
      } else {
        itemColumnNodes = await this.cacheColumn(serverInfo, dbNode, tableNode);
      }
      //去除重复的字段
      itemColumnNodes.map((item) => {
        if (!columnNodeMap.has(item.name)) columnNodeMap.set(item.name, item);
      });
    }
    columnNodeMap.forEach((value) => columnNodes.push(value));

    return columnNodes;
  }

  public async cacheColumn(server: ServerInfo, dbNode: DbNode, tableNode: BaseNode): Promise<BaseNode[]> {
    const queryColumn = await this.sqlServerApiService.showColumns({ server, db: dbNode.name }, tableNode.name);
    let tableNodeChildren: BaseNode[] = [];
    if (queryColumn.success && queryColumn.data) {
      tableNodeChildren = queryColumn.data.map(
        (item) => new BaseNode(item.name, item.name, item.comment, server.serverType!, 'table'),
      );
      tableNode.setChildren(tableNodeChildren);
    }
    return tableNodeChildren;
  }
}
