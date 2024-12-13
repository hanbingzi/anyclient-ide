import { Autowired } from '@opensumi/di';
import {
  AppConfig,
  ClientAppContribution,
  CommandContribution,
  CommandRegistry,
  CommandService,
  FILE_COMMANDS,
  formatLocalize,
  IClipboardService,
  IQuickInputService,
  KeybindingContribution,
  KeybindingRegistry,
  localize,
  TabBarToolbarContribution,
  ToolbarRegistry,
  URI,
} from '@opensumi/ide-core-browser';
import { IMenuRegistry, MenuContribution } from '@opensumi/ide-core-browser/lib/menu/next';
import { Domain } from '@opensumi/ide-core-common/lib/di-helper';
import { IDecorationsService } from '@opensumi/ide-decoration';
import { IMainLayoutService, IViewsRegistry, MainLayoutContribution } from '@opensumi/ide-main-layout';
import { DEFAULT_WORKSPACE_SUFFIX_NAME, IWorkspaceService, UNTITLED_WORKSPACE } from '@opensumi/ide-workspace';
import {
  IConnectTreeAPI,
  IConnectTreeAPIToken,
  IConnectTreeServiceToken,
  IOpenRecentStatService,
  IOpenRecentStatServiceToken,
  IServerTreeApiServiceToken,
} from '../common';
import { ServerEntity, ServerNode } from '../common/connect-tree-node.define';
import { ConnectTreeView } from './connect-tree.view';
import { ConnectTreeService } from './connect-tree.service';
import { ConnectTreeModelService } from './services/connect-tree-model.service';
import { ServerCommandIds } from '../../base/command/menu.command';
import { MenuIdCommandRule } from '../../base/config/menu/menu.config';
import { Command } from '@opensumi/ide-core-common';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import {
  FilesExplorerFilteredContext,
  FilesExplorerFocusedContext,
  FilesExplorerInputFocusedContext,
} from './connect-contextkey';
import { OpenParam } from '../../base/param/open-view.param';
import { QuickInputService } from '@opensumi/ide-quick-open/lib/browser/quick-input-service';
import { EXPLORER_CONTAINER_ID } from '@opensumi/ide-explorer/lib/browser/explorer-contribution';
import { SqlServerApiService } from '../../server-client/browser/sql-server-api.service';
import { ISqlServerApiToken, IZookeeperService, IZookeeperServiceToken } from '../../server-client/common';
import { QueryUtil } from '../../base/utils/query-util';
import { IDbCacheNodeServiceToken } from '../../codelens-command/common';
import { DbCacheNodeService } from '../../codelens-command/browser/db-cache-node.service';
import { CompositeTreeNode } from '../../components/recycle-tree';
import { getServerFileSuffix } from '../../base/config/server.config';
import { DateUtil } from '../../base/utils/date-util';
import { IFileTreeAPI } from '@opensumi/ide-file-tree-next';
import { ViewContentGroups } from '@opensumi/ide-main-layout/lib/browser/views-registry';
import { AllNodeType } from '../../base/types/server-node.types';
import { RedisDialect } from '../../server-client/common/dialet/redis-dialect';
import { ServerTreeApiService } from './services/server-tree-api.service';
import { ServerTreeViewExplorerId } from '../../server-list/browser/server-list.contribution';

export const ServerRecentViewId = 'server-recent';

//export const EXPLORER_CONTAINER_ID = 'explorer';

@Domain(
  MenuContribution,
  CommandContribution,
  KeybindingContribution,
  TabBarToolbarContribution,
  ClientAppContribution,
  MainLayoutContribution,
)
export class ConnectTreeContribution
  implements
    MenuContribution,
    CommandContribution,
    KeybindingContribution,
    TabBarToolbarContribution,
    ClientAppContribution,
    MainLayoutContribution
{
  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  @Autowired(IMainLayoutService)
  private readonly mainLayoutService: IMainLayoutService;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @Autowired(ConnectTreeModelService)
  private readonly connectTreeModelService: ConnectTreeModelService;

  @Autowired(IDecorationsService)
  public readonly decorationService: IDecorationsService;

  @Autowired(CommandService)
  private readonly commandService: CommandService;

  @Autowired(IClipboardService)
  private readonly clipboardService: IClipboardService;

  // @Autowired(PreferenceService)
  // private readonly preferenceService: PreferenceService;

  @Autowired(IViewsRegistry)
  private viewsRegistry: IViewsRegistry;

  // @Autowired(IApplicationService)
  // private readonly appService: IApplicationService;

  @Autowired(AppConfig)
  private readonly appConfig: AppConfig;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IOpenRecentStatServiceToken)
  private readonly openRecentStatService: IOpenRecentStatService;

  @Autowired(IQuickInputService)
  private readonly quickInputService: QuickInputService;

  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IZookeeperServiceToken)
  private zookeeperService: IZookeeperService;

  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IDbCacheNodeServiceToken)
  private readonly dbCacheNodeService: DbCacheNodeService;

  @Autowired(IConnectTreeAPIToken)
  private readonly connectTreeAPI: IConnectTreeAPI;

  @Autowired(IServerTreeApiServiceToken)
  protected readonly serverTreeApiService: ServerTreeApiService;

  @Autowired(IFileTreeAPI)
  private readonly fileTreeAPI: IFileTreeAPI;
  private isRendered = false;

  private redisDialect: RedisDialect = new RedisDialect();

  get workspaceSuffixName() {
    return this.appConfig.workspaceSuffixName || DEFAULT_WORKSPACE_SUFFIX_NAME;
  }

  initialize() {
    // 等待排除配置初始化结束后再初始化文件树
    this.workspaceService.initFileServiceExclude().then(() => {
      this.connectTreeModelService.initTreeModel();
    });
  }

  async onStart() {
    // this.viewsRegistry.registerViewWelcomeContent(ServerRecentViewId, {
    //   content: formatLocalize('welcome-view.noFolderHelp', FILE_COMMANDS.OPEN_FOLDER.id),
    //   group: ViewContentGroups.Open,
    //   order: 1,
    // });
    await this.connectTreeService.init();
    this.viewsRegistry.registerViewWelcomeContent(ServerRecentViewId, {
      content: formatLocalize('welcome-view.noFolderHelp', FILE_COMMANDS.OPEN_FOLDER.id),
      group: ViewContentGroups.Open,
      order: 1,
    });

    this.mainLayoutService.collectViewComponent(
      {
        id: ServerRecentViewId,
        name: localize('title.recent.servers'), //this.getWorkspaceTitle(),
        weight: 1,
        priority: 10,
        collapsed: false,
        component: ConnectTreeView,
      },
      //RecentExplorerContainerId,
      EXPLORER_CONTAINER_ID,
    );
    // 监听工作区变化更新标题
    // this.workspaceService.onWorkspaceLocationChanged(() => {
    //   const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
    //   if (handler) {
    //     handler.updateViewTitle(ServerRecentViewId, this.getWorkspaceTitle());
    //   }
    // });
  }

  onDidStart() {
    // const symlinkDecorationsProvider = this.injector.get(SymlinkDecorationsProvider, [this.connectTreeService]);
    // this.decorationService.registerDecorationsProvider(symlinkDecorationsProvider);
    this.openRecentStatService.init();
  }

  onDidRender() {
    this.isRendered = true;
    const handler = this.mainLayoutService.getTabbarHandler(EXPLORER_CONTAINER_ID);
    if (handler) {
      //监听handler变换 -- perfect
      handler.onActivate(() => {
        this.connectTreeModelService.contextKey.explorerViewletVisibleContext.set(true);
        this.connectTreeModelService.performLocationOnHandleShow();
      });
      handler.onInActivate(() => {
        this.connectTreeModelService.contextKey.explorerViewletVisibleContext.set(false);
      });
    }
  }

  getWorkspaceTitle() {
    let resourceTitle = localize('file.empty.defaultTitle');
    const workspace = this.workspaceService.workspace;

    if (workspace) {
      const uri = new URI(workspace.uri);
      resourceTitle = uri.displayName;
      if (!workspace.isDirectory && resourceTitle.endsWith(`.${this.workspaceSuffixName}`)) {
        resourceTitle = resourceTitle.slice(0, resourceTitle.lastIndexOf('.'));
        if (resourceTitle === UNTITLED_WORKSPACE) {
          return localize('file.workspace.defaultTip');
        }
      }
    }

    return resourceTitle;
  }

  // onReconnect() {
  //   this.connectTreeService.reWatch();
  // }

  registerMenus(menuRegistry: IMenuRegistry): void {
    Object.keys(MenuIdCommandRule).forEach((menuId) => {
      this.batchRegisterMenus(menuRegistry, menuId, MenuIdCommandRule[menuId]);
    });
    // //server
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerSqlServer, SQL_COMMANDS.sqlServer);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerRedisServer, REDIS_COMMANDS.redisServer);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerZkServer, ZOOKEEPER_COMMANDS.zkServer);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerKafkaServer, KAFKA_COMMANDS.kafkaServer);
    // //关系数据库菜单
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerDb, SQL_COMMANDS.db);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerOrclDb, SQL_COMMANDS.orclDb);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerPostgresDb, SQL_COMMANDS.PostgresDb);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerSchema, SQL_COMMANDS.schema);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTables, SQL_COMMANDS.tables);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTable, SQL_COMMANDS.table);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTableViews, SQL_COMMANDS.tableViews);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTableView, SQL_COMMANDS.tableView);
    // //trigger function procedure sequence
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTriggers, SQL_COMMANDS.triggers);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTrigger, SQL_COMMANDS.trigger);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerFunctions, SQL_COMMANDS.functions);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerFunction, SQL_COMMANDS._function);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerProcedures, SQL_COMMANDS.procedures);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerProcedure, SQL_COMMANDS.procedure);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerSequences, SQL_COMMANDS.sequences);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerSequence, SQL_COMMANDS.sequence);
    // //jdbc关系数据库菜单
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicDb, SQL_COMMANDS.basicDb);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicSchema, SQL_COMMANDS.basicSchema);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicTables, SQL_COMMANDS.basicTables);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicTable, SQL_COMMANDS.basicTable);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicTableViews, SQL_COMMANDS.basicTableViews);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicTableView, SQL_COMMANDS.basicTableView);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicFunctions, SQL_COMMANDS.basicFunctions);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicFunction, SQL_COMMANDS.basicFunction);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicProcedures, SQL_COMMANDS.basicProcedures);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBasicProcedure, SQL_COMMANDS.basicProcedure);
    //
    // //redis
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerRedisDb, REDIS_COMMANDS.redisDb);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerRedisNode, REDIS_COMMANDS.redisNode);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerRedisKey, REDIS_COMMANDS.redisKey);
    // //zookeeper
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerZKNode, ZOOKEEPER_COMMANDS.zkNode);
    // //kafka
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTopics, KAFKA_COMMANDS.topics);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerTopic, KAFKA_COMMANDS.topic);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerBrokers, KAFKA_COMMANDS.brokers);
    // this.batchRegisterMenus(menuRegistry, ServerMenuIds.ServerExplorerGroups, KAFKA_COMMANDS.groups);
  }

  batchRegisterMenus(menuRegistry: IMenuRegistry, menuId: string, commands: Command[][]): void {
    for (let i = 0; i < commands.length; i++) {
      let children = commands[i];
      for (let j = 0; j < children.length; j++) {
        let { id, label } = children[j];
        menuRegistry.registerMenuItem(menuId, {
          command: {
            id,
            label: label!,
          },
          order: j,
          group: `_${i}`,
        });
      }
    }
  }

  // @Autowired(IDbSelectServiceToken)
  // private readonly dbSelectService: DbSelectService;
  registerCommands(commands: CommandRegistry): void {
    //刷新所有
    commands.registerCommand(ServerCommandIds.connectRefreshAll, {
      execute: async () => {
        // const handler = this.mainLayoutService.getTabbarHandler(ServerRecentViewId);
        // if (!handler || !handler.isVisible) {
        //   return;
        // }
        await this.connectTreeService.refresh();
        console.log('clear db cache ------>');
        await this.dbCacheNodeService.clearCache();
      },
    });

    commands.registerCommand(ServerCommandIds.connectFilterToggle, {
      execute: () => {
        this.connectTreeService.toggleFilterMode();
      },
    });

    //查找
    commands.registerCommand(ServerCommandIds.connectFilterOpen, {
      execute: () => {
        if (!this.connectTreeService.filterMode) {
          this.connectTreeService.toggleFilterMode();
        }
      },
    });

    commands.registerCommand(ServerCommandIds.connectFilterClose, {
      execute: () => {
        if (this.connectTreeService.filterMode) {
          this.connectTreeService.toggleFilterMode();
        }
      },
    });

    //全部折叠
    commands.registerCommand(ServerCommandIds.connectCollapseAll, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ServerRecentViewId);
        if (!handler || !handler.isVisible) {
          return;
        }
        this.connectTreeModelService.collapseAll();
      },
    });

    commands.registerCommand(ServerCommandIds.filterSearch, {
      execute: (node: ServerNode) => {
        //console.log('aa->')
        this.connectTreeService.openFilterQuery(node);
        //this.connectTreeModelService.collapseAll();
      },
      isEnabled: (): boolean =>
        !!(
          this.connectTreeModelService.focusedFile && this.connectTreeModelService.focusedFile.nodeStat === 'success'
        ) ||
        !!(
          this.connectTreeModelService.contextMenuFile &&
          this.connectTreeModelService.contextMenuFile.nodeStat === 'success'
        ),
    });

    commands.registerCommand(ServerCommandIds.connectNext, {
      execute: () => {
        this.connectTreeModelService.moveToNext();
      },
    });

    commands.registerCommand(ServerCommandIds.connectPrev, {
      execute: () => {
        this.connectTreeModelService.moveToPrev();
      },
    });

    commands.registerCommand(ServerCommandIds.connectCollapse, {
      execute: () => {
        this.connectTreeModelService.collapseCurrentFile();
      },
    });

    commands.registerCommand(ServerCommandIds.connectExpand, {
      execute: () => {
        this.connectTreeModelService.expandCurrentFile();
      },
    });

    //关闭连接

    commands.registerCommand(ServerCommandIds.closeConnect, {
      execute: (node: ServerNode) => {
        this.connectTreeModelService.closeConnect(node);
        this.connectTreeAPI.clearSuccessLoadNode(node.path);
        //console.log('关闭连接')
      },
      isEnabled: () =>
        !!(
          this.connectTreeModelService.contextMenuFile &&
          this.connectTreeModelService.contextMenuFile.nodeStat === 'success'
        ),
    });

    //删除连接
    commands.registerCommand(ServerCommandIds.deleteConnect, {
      execute: async (node: ServerNode) => {
        this.connectTreeModelService.deleteConnect(node);
        //console.log('删除连接')
      },
    });

    commands.registerCommand(ServerCommandIds.refreshConnect, {
      execute: async (node: ServerNode) => {
        await this.connectTreeModelService.refreshConnectServer(node);
        //console.log('删除连接')
      },
    });

    //新建查询
    commands.registerCommand(ServerCommandIds.newQuery, {
      execute: async (node?: ServerNode) => {
        let targetNode: ServerNode | ServerEntity | undefined;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else if (this.connectTreeModelService.focusedFile) {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile;
        } else if (
          this.connectTreeModelService.selectedFiles &&
          this.connectTreeModelService.selectedFiles.length === 1
        ) {
          targetNode = this.connectTreeModelService.selectedFiles[0];
        }
        if (!targetNode) {
          this.messages.error(localize('validate.connect.must.selected'));
          return;
        }
        const { serverType } = targetNode;
        let parent = targetNode.parent;
        while (!CompositeTreeNode.isRoot(parent)) {
          parent = parent?.parent;
        }
        //有可能是选的表，必须转换为库或服务
        while (true) {
          if (
            (['server', 'db', 'orclDb', 'schema', 'basicDb', 'basicSchema'] as AllNodeType[]).includes(
              targetNode.nodeType!,
            )
          ) {
            break;
          }
          targetNode = targetNode.parent as ServerNode | ServerEntity;
        }
        const prefix = getServerFileSuffix(serverType!);
        //console.log('targetNode.path：', targetNode.path);
        let getFileUri = (fileName: string): URI => {
          const newFile = targetNode!.path.replace(/\/root_\d+/, '') + `/${fileName}.${prefix}`;
          //console.log('newFilepath-->', newFile);
          const fileUri = (parent as ServerNode).uri.resolve(newFile);
          return fileUri;
        };
        let currentUri;
        const fileName = DateUtil.getDateString(undefined, DateUtil.DATE_STR_yyyyMMdd);
        try {
          let i = 0;
          while (true) {
            const fullFileName = i === 0 ? fileName : fileName + '_' + i;
            currentUri = getFileUri(fullFileName);
            const fileSate = await this.fileTreeAPI.resolveFileStat(currentUri);
            //console.log('文件状态结果：', fileSate);
            i++;
            if (!fileSate) {
              break;
            }
          }
          await this.fileTreeAPI.createFile(currentUri);
          //刷新文件目录
          this.commandService.executeCommand(FILE_COMMANDS.REFRESH_ALL.id);
        } catch (e) {
          console.error('创建查询出错', e);
        }
      },
    });

    commands.registerCommand(ServerCommandIds.tableSelect, {
      execute: async (node: ServerNode) => {
        if (node) {
          this.connectTreeService.openAndFixedFile(node);
        }
      },
    });

    commands.registerCommand(ServerCommandIds.create, {
      execute: async (node: ServerNode) => {
        //console.log('创建----->', node)
        let openParam: OpenParam = {
          nodeName: node.name,
          serverId: node.getServerInfo()!.serverId!,
          serverType: node.serverType!,
          nodeType: node.nodeType!,
          option: 'create',
          path: node.path,
          db: node.dbName,
          nodeValue: node.nodeValue,
        };
        console.log('打开新建表的参数：', openParam)
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });
      },
      isEnabled: (): boolean =>
        !!(
          this.connectTreeModelService.focusedFile && this.connectTreeModelService.focusedFile.nodeStat === 'success'
        ) ||
        !!(
          this.connectTreeModelService.contextMenuFile &&
          this.connectTreeModelService.contextMenuFile.nodeStat === 'success'
        ),
    });

    commands.registerCommand(ServerCommandIds.editDb, {
      execute: async (node: ServerNode) => {
        //console.log('创建库')
        let openParam: OpenParam = {
          nodeName: node.name,
          serverId: node.getServerInfo()!.serverId!,
          serverType: node.serverType!,
          nodeType: node.nodeType!,
          option: 'edit',
          path: node.path,
          db: node.dbName,
        };
        //console.log('打开编辑库的参数：', openParam)
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });
      },
    });

    // commands.registerCommand(ServerCommandIds.edit, {
    //   execute: async (node: ServerNode) => {
    //  //console.log('编辑库')
    //
    //
    //   }
    // });

    commands.registerCommand(ServerCommandIds.createTable, {
      execute: async (node: ServerNode | ServerEntity) => {
        //this.dialogService.open('')
        const param = await this.quickInputService.open({
          placeHolder: '请输入要创建的表名',
        });
        //console.log('输入的结果是：', param)
        //查询表名是否重复，不重复，打开新建窗口
        if (!param) {
          //console.log('必须输入一个名称')
          return;
        }
        const isExist = await this.sqlServerApiService.existNode(
          {
            server: node.getServerInfo()!,
            db: node.serverTreeNode?.db + '',
            schema: node.serverTreeNode?.schema,
          },
          'table',
          param.trim(),
        );
        if (isExist) {
          this.dialogService.error('存在相同的表', ['ok']);
          return;
        }
        //console.log('-------------->')
        //跳转新建表
        let openParam: OpenParam = {
          nodeName: param,
          serverId: node.getServerInfo()!.serverId!,
          db: node.serverTreeNode!.db!,
          schema: node.serverTreeNode!.schema,
          serverType: node.serverType!,
          nodeType: 'table',
          option: 'create',
          path: node.path,
        };
        //console.log('打开新建表的参数：', openParam)
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });
      },
    });

    commands.registerCommand(ServerCommandIds.createDic, {
      execute: async (node: ServerNode | ServerEntity) => {
        //弹出窗口创建
        const param = await this.quickInputService.open({
          placeHolder: '请输入要创建节点',
        });
        //console.log('输入的结果是：', param)
        if (!param) {
          this.dialogService.error('必须输入一个名称', ['ok']);
          return;
        }
        const result = await this.serverTreeApiService.createNode(node.getServerInfo(), node.serverTreeNode, param);
        if (result.success) {
          this.messages.info('创建成功');
          this.connectTreeService.refresh(node);
        }
      },
    });

    //重命名
    commands.registerCommand(ServerCommandIds.rename, {
      execute: (node: ServerNode | ServerEntity) => {
        if (!node) {
          if (this.connectTreeModelService.contextMenuFile) {
            node = this.connectTreeModelService.contextMenuFile;
          } else if (this.connectTreeModelService.focusedFile) {
            node = this.connectTreeModelService.focusedFile;
          } else {
            return;
          }
        }
        this.connectTreeModelService.renamePrompt(node);
      },
    });

    //编辑表结构
    commands.registerCommand(ServerCommandIds.edit, {
      execute: (node: ServerNode | ServerEntity) => {
        let openParam: OpenParam = {
          nodeName: node.displayName,
          serverId: node.getServerInfo()!.serverId!,
          db: node.serverTreeNode!.db!,
          schema: node.serverTreeNode!.schema,
          serverType: node.serverType!,
          nodeType: node.nodeType!,
          option: 'edit',
          path: node.path,
        };
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });

        //console.log('我会被调用-----》', node)
      },
    });

    //删除
    commands.registerCommand(ServerCommandIds._delete, {
      execute: async (node: ServerNode | ServerEntity, nodes: (ServerNode | ServerEntity)[]) => {
        //验证删除逻辑
        if (nodes && nodes.length > 0) {
          let canDelete = true;
          nodes.forEach((item) => {
            if (item.nodeType !== node.nodeType) {
              canDelete = false;
              return;
            }
          });
          if (!canDelete) {
            this.dialogService.error('必须选择相同类型的节点才可以进行删除', ['ok']);
            return;
          }
          this.connectTreeModelService.deleteNodes(node, nodes);
        } else {
          this.connectTreeModelService.deleteNodes(node, [node]);
        }

        // console.log('选中的一个节点：', node);
        // console.log('选中的多个节点：', nodes)
      },
      isVisible: () =>
        !!this.connectTreeModelService.contextMenuFile &&
        this.connectTreeModelService.contextMenuFile.levelType !== 'root',
    });

    commands.registerCommand(ServerCommandIds.clearTable, {
      execute: async (node: ServerNode | ServerEntity, nodes: (ServerNode | ServerEntity)[]) => {
        //验证删除逻辑
        const connection = {
          server: node.getServerInfo()!,
          db: node.serverTreeNode?.db + '',
          schema: node.serverTreeNode?.schema,
        };
        if (nodes && nodes.length > 0) {
          let canDelete = true;
          const tableNames: string[] = [];
          nodes.forEach((item) => {
            tableNames.push(item.name);
            if (node.nodeType !== 'table' && node.nodeType !== 'basicTable') {
              canDelete = false;
              return;
            }
          });
          if (!canDelete) {
            this.dialogService.error('无法清除非表以外的数据', ['OK']);
            return;
          }
          await this.sqlServerApiService.deleteTablesAllData(connection, tableNames);
        } else {
          await this.sqlServerApiService.deleteTablesAllData(connection, [node.name]);
        }
        this.messages.info('清除表格完毕');

        // console.log('选中的一个节点：', node);
        // console.log('选中的多个节点：', nodes)
      },
      isVisible: () =>
        !!this.connectTreeModelService.contextMenuFile &&
        this.connectTreeModelService.contextMenuFile.levelType !== 'root',
    });

    //复制名称
    commands.registerCommand(ServerCommandIds.copy, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile;
        }
        if (targetNode) {
          await this.clipboardService.writeText(decodeURIComponent(targetNode.displayName!.toString()));
        }
      },
    });

    //复制表结构
    commands.registerCommand(ServerCommandIds.copyTable, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const result = await this.sqlServerApiService.showCreateTable(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          if (result.success) {
            await this.clipboardService.writeText(decodeURIComponent(result.data!));
            this.messages.info('表结构已复制');
          } else {
            this.dialogService.error(QueryUtil.getErrorMessage(result), ['OK']);
          }
        }
      },
    });

    //生成查询sql语句
    commands.registerCommand(ServerCommandIds.copyTableSelectSql, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const sql = await this.sqlServerApiService.selectSqlExample(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          await this.clipboardService.writeText(sql);
          await this.messages.info('sql语句已复制到剪切板');
        }
      },
    });

    //生成删除sql语句
    commands.registerCommand(ServerCommandIds.copyTableDeleteSql, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const sql = await this.sqlServerApiService.deleteSqlExample(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          await this.clipboardService.writeText(sql);
          await this.messages.info('sql语句已复制到剪切板');
        }
      },
    });

    //生成插入sql语句
    commands.registerCommand(ServerCommandIds.copyTableInsertSql, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const sql = await this.sqlServerApiService.insertSqlExample(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          await this.clipboardService.writeText(sql);
          await this.messages.info('sql语句已复制到剪切板');
        }
      },
    });

    //生成update sql语句
    commands.registerCommand(ServerCommandIds.copyTableUpdateSql, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const sql = await this.sqlServerApiService.updateSqlExample(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          await this.clipboardService.writeText(sql);
          await this.messages.info('sql语句已复制到剪切板');
        }
      },
    });

    commands.registerCommand(ServerCommandIds.copyViewCreateSql, {
      execute: async (node: ServerNode | ServerEntity) => {
        let targetNode: ServerNode | ServerEntity;
        //处理快捷键的选中
        if (node) {
          targetNode = node;
        } else {
          //快捷键方式
          targetNode = this.connectTreeModelService.focusedFile!;
        }
        if (targetNode) {
          const runSqlResult = await this.sqlServerApiService.showViewSource(
            {
              server: targetNode.getServerInfo()!,
              db: targetNode.serverTreeNode?.db!,
              schema: targetNode.serverTreeNode?.schema ? targetNode.serverTreeNode?.schema : '',
            },
            targetNode.serverTreeNode?.nodeName!,
          );
          console.log('showViewSource:', runSqlResult, runSqlResult.data);
          if (runSqlResult.success) {
            await this.clipboardService.writeText(runSqlResult.data!);
            await this.messages.info('sql语句已复制到剪切板');
          } else {
            await this.dialogService.error(QueryUtil.getErrorMessage(runSqlResult));
          }
        }
      },
    });
    //刷新
    commands.registerCommand(ServerCommandIds.refresh, {
      execute: async (node: ServerNode | ServerEntity | undefined) => {
        //console.log('f5---refresh----->')
        const handler = this.mainLayoutService.getTabbarHandler(ServerRecentViewId);
        // const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        //console.log('f5---refresh----focusedFile->', this.connectTreeModelService.focusedFile)
        if (node instanceof ServerEntity) {
          node = node.parent as ServerNode;
        }
        if (!node) {
          node = this.connectTreeModelService.focusedFile;
          //console.log('使用focusedFile--》', node)
        }
        if (node) {
          await this.connectTreeModelService.refresh(node as ServerNode);
          const { serverType, nodeType, nodeName } = node;
          if (nodeType === 'server') {
            this.dbCacheNodeService.clearCache({ serverType: serverType!, serverName: nodeName });
          } else if (nodeType === 'db') {
            this.dbCacheNodeService.clearCache({
              serverType: serverType!,
              serverName: (node.parent as ServerNode).nodeName,
              dbName: nodeName,
            });
          }
        }
      },
      isEnabled: (): boolean =>
        !!(
          this.connectTreeModelService.focusedFile && this.connectTreeModelService.focusedFile.nodeStat === 'success'
        ) ||
        !!(
          this.connectTreeModelService.contextMenuFile &&
          this.connectTreeModelService.contextMenuFile.nodeStat === 'success'
        ),
    });

    //运行sql
    //思考，上下键选中的和右键选中的可能不一样
    commands.registerCommand(ServerCommandIds.runSqlFile, {
      execute: () => {
        //console.log('运行sql')
      },
      isEnabled: () =>
        !!(
          this.connectTreeModelService.contextMenuFile &&
          this.connectTreeModelService.contextMenuFile.nodeStat === 'success'
        ),
    });

    commands.registerCommand(ServerCommandIds.topicCreate, {
      execute: (node: ServerNode | ServerEntity) => {
        let openParam: OpenParam = {
          nodeName: node.displayName,
          serverId: node.getServerInfo()!.serverId!,
          db: '',
          schema: '',
          serverType: node.serverType!,
          nodeType: node.nodeType!,
          option: 'create',
          path: node.path,
        };
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });
      },
    });

    commands.registerCommand(ServerCommandIds.topicAddMessage, {
      execute: (node: ServerNode | ServerEntity, openParam?: OpenParam) => {
        if (node) {
          openParam = {
            nodeName: node.displayName,
            serverId: node.getServerInfo()!.serverId!,
            db: '',
            schema: '',
            serverType: node.serverType!,
            nodeType: node.nodeType!,
            option: 'addChild',
            path: node.path,
          };
        }
        if (!openParam) {
          this.dialogService.error('参数错误，无法新建topic', ['OK']);
          return;
        }
        this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
          disableNavigate: true,
          preview: false,
          focus: true,
        });
      },
    });

    //----------------------------------通用----------------------------------------------------------------
    // redisKeySearchCmd: Command = { label: '复制模糊查询命令', id: 'redis_key_search_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeySearchCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        const command = this.redisDialect.searchKey();
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyGetCmd: Command = { label: '复制Key查询命令', id: 'redis_key_get_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyGetCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          switch (node.nodeType) {
            case 'redisString':
              command = this.redisDialect.getKeyValue(key);
              break;
            case 'redisList':
              command = this.redisDialect.lRangeKey(key);
              break;
            case 'redisHash':
              command = this.redisDialect.hGetKeyField(key);
              break;
            case 'redisSet':
              command = this.redisDialect.sMembersKey(key);
              break;
            case 'redisZSet':
              command = this.redisDialect.zRangeKey(key);
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    //hash list set使用
    // redisKeyGetAllCmd: Command = { label: '复制Key查询所有命令', id: 'redis_key_get_all_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyGetAllCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          switch (node.nodeType) {
            case 'redisString':
              break;
            case 'redisList':
              break;
            case 'redisHash':
              command = this.redisDialect.hGetAll(key);
              break;
            case 'redisSet':
              break;
            case 'redisZSet':
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyGetLengthCmd: Command = { label: '复制Key查询长度命令', id: 'redis_key_get_length_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyGetLengthCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          switch (node.nodeType) {
            case 'redisString':
              break;
            case 'redisList':
              command = this.redisDialect.lLenKey(key);
              break;
            case 'redisHash':
              command = this.redisDialect.hLenKey(key);
              break;
            case 'redisSet':
              command = this.redisDialect.sCardKey(key);
              break;
            case 'redisZSet':
              command = this.redisDialect.zCardKey(key);
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyDeleteCmd: Command = { label: '复制Key删除命令', id: 'redis_key_delete_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyDeleteCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
        let command = this.redisDialect.delKey(key);
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // //list hash set 使用
    // redisKeyDeleteItemCmd: Command = { label: '复制Key删除指定元素命令', id: 'redis_key_del_item_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyDeleteItemCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';

        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          switch (node.nodeType) {
            case 'redisString':
              break;
            case 'redisList':
              command = this.redisDialect.lRemKeyValue(key);
              break;
            case 'redisHash':
              command = this.redisDialect.hDelKeyField(key);
              break;
            case 'redisSet':
              command = this.redisDialect.sRemKeyMember(key);
              break;
            case 'redisZSet':
              command = this.redisDialect.zRemKeyMember(key);
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyExistsItemCmd: Command = { label: '复制Key是否存在命令', id: 'redis_key_exists_item_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyExistsItemCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          switch (node.nodeType) {
            case 'redisString':
              break;
            case 'redisList':
              command = this.redisDialect.lPosKey(key);
              break;
            case 'redisHash':
              command = this.redisDialect.hExistsKeyField(key);
              break;
            case 'redisSet':
              command = this.redisDialect.sIsMember(key);
              break;
            case 'redisZSet':
              command = this.redisDialect.zScore(key);
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    //
    // redisKeySetCmd: Command = { label: '复制Key新增命令', id: 'redis_str_key_set_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeySetCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : undefined;
          switch (node.nodeType) {
            case 'redisString':
              command = this.redisDialect.setKeyValue(key);
              break;
            case 'redisList':
              command = this.redisDialect.lPushKeyValue(key);
              break;
            case 'redisHash':
              command = this.redisDialect.hSetKeyFieldValue(key);
              break;
            case 'redisSet':
              command = this.redisDialect.sAddKeyMember(key);
              break;
            case 'redisZSet':
              command = this.redisDialect.zAddKeyMember(key);
              break;
            default:
              command = this.redisDialect.setKeyValue();
              break;
          }
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyTtlCmd: Command = { label: '复制获取Key续期时间命令', id: 'redis_key_ttl_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyTtlCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;

          command = this.redisDialect.ttlKey(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisKeyExpireCmd: Command = { label: '复制设置Key过期时间命令', id: 'redis_set_key_expire_cmd' };
    commands.registerCommand(ServerCommandIds.redisKeyExpireCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.expireKey(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // //----------------------------------分类----------------------------------------------------------------
    // redisHashKeySetCmd: Command = { label: '复制Hash新增命令', id: 'redis_hash_key_set_cmd' };
    commands.registerCommand(ServerCommandIds.redisHashKeySetCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.hSetKeyFieldValue(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisListKeyLPushCmd: Command = { label: '复制List插入头部命令', id: 'redis_list_key_lpush_cmd' };
    commands.registerCommand(ServerCommandIds.redisListKeyLPushCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.lPushKeyValue(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisListKeyRPushCmd: Command = { label: '复制List插入尾部命令', id: 'redis_list_key_rpush_cmd' };
    commands.registerCommand(ServerCommandIds.redisListKeyRPushCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.rPushKeyValue(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisSetKeySetCmd: Command = { label: '复制Set新增命令', id: 'redis_set_key_set_cmd' };
    commands.registerCommand(ServerCommandIds.redisSetKeySetCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.sAddKeyMember(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisZSetKeySetCmd: Command = { label: '复制ZSet新增命令', id: 'redis_zset_key_set_cmd' };
    commands.registerCommand(ServerCommandIds.redisZSetKeySetCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeType !== 'redisDb' ? (node.nodeValue ? node.nodeValue + '' : '') : undefined;
          command = this.redisDialect.zAddKeyMember(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisHashKeyGetKeysCmd: Command = { label: '复制Hash获取Keys命令', id: 'redis_hash_key_get_keys_cmd' };
    commands.registerCommand(ServerCommandIds.redisHashKeyGetKeysCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          command = this.redisDialect.hKeysKey(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
    // redisHashKeyGetValuesCmd: Command = { label: '复制Hash获取Values命令', id: 'redis_hash_key_get_vals_cmd' };
    commands.registerCommand(ServerCommandIds.redisHashKeyGetValuesCmd, {
      execute: async (node: ServerNode | ServerEntity) => {
        let command = '';
        if (node && node.nodeType) {
          const key = node.nodeValue ? node.nodeValue + '' : '';
          command = this.redisDialect.hValsKey(key);
        }
        await this.clipboardService.writeText(command);
        this.messages.info(localize('copy.success'));
      },
    });
  }

  registerToolbarItems(registry: ToolbarRegistry) {
    // 点击聚焦当前编辑器 focus 的文件
    // registry.registerItem({
    //   id: ServerCommandIds._newServer.id,
    //   command: ServerCommandIds._newServer.id,
    //   label: '创建新的服务',//localize('file.new'),
    //   viewId: ServerRecentViewId,
    //   when: `view == '${ServerRecentViewId}'`,//  when: `view == '${ServerRecentViewId}' && !${FilesExplorerFilteredContext.raw}`,
    //   order: 0,
    // });

      // 点击聚焦当前编辑器 focus 的文件
      registry.registerItem({
        id: ServerCommandIds.newServer.id,
        command: ServerCommandIds.newServer.id,
        label:  localize('file.new'),//'创建新的服务', //
        viewId: ServerRecentViewId,
        order: 2,
      });

    registry.registerItem({
      id: ServerCommandIds.connectFilterToggle.id,
      command: ServerCommandIds.connectFilterToggle.id,
      label: localize('file.filetree.filter'),
      viewId: ServerRecentViewId,
      // toggledWhen: `${FilesExplorerFilteredContext.raw}`,
      order: 3,
    });

    registry.registerItem({
      id: ServerCommandIds.connectRefreshAll.id,
      command: ServerCommandIds.connectRefreshAll.id,
      label: localize('file.refresh'),
      viewId: ServerRecentViewId,
      when: `view == '${ServerRecentViewId}'`,
      order: 4,
    });

    registry.registerItem({
      id: ServerCommandIds.connectCollapseAll.id,
      command: ServerCommandIds.connectCollapseAll.id,
      label: localize('file.collapse'),
      viewId: ServerRecentViewId,
      order: 5,
    });
  }

  //绑定有问题，需要研究context使用
  registerKeybindings(bindings: KeybindingRegistry) {
    bindings.registerKeybinding({
      command: ServerCommandIds.refresh.id,
      keybinding: 'f5',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.copy.id,
      keybinding: 'ctrlcmd+c',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });

    //根据情形复制，可以进行节点复制的，进行节点粘贴，不可以进行节点粘贴的，不处理
    // bindings.registerKeybinding({
    //   command: ServerCommandIds.paste.id,
    //   keybinding: 'ctrlcmd+v',
    //   when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
    // });

    // bindings.registerKeybinding({
    //   command: ServerCommandIds.rename.id,
    //   keybinding: 'enter',
    //   when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
    // });

    bindings.registerKeybinding({
      command: ServerCommandIds._delete.id,
      keybinding: 'ctrlcmd+backspace',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectFilterOpen.id,
      keybinding: 'ctrlcmd+f',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectFilterClose.id,
      keybinding: 'esc',
      when: `${FilesExplorerFocusedContext.raw} && ${FilesExplorerFilteredContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectNext.id,
      keybinding: 'down',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectPrev.id,
      keybinding: 'up',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectExpand.id,
      keybinding: 'right',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });

    bindings.registerKeybinding({
      command: ServerCommandIds.connectCollapse.id,
      keybinding: 'left',
      when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
    });
  }

  // private revealFile(locationUri: URI) {
  //   if (locationUri) {
  //     if (this.isRendered) {
  //       const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
  //       if (!handler || !handler.isVisible || handler.isCollapsed(ServerRecentViewId)) {
  //         this.connectTreeModelService.locationOnShow(locationUri);
  //       } else {
  //         this.connectTreeModelService.location(locationUri);
  //       }
  //     } else {
  //       this.connectTreeModelService.locationOnShow(locationUri);
  //     }
  //   }
  // }

  // registerMenus(menuRegistry: IMenuRegistry): void {
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.NEW_FILE.id,
  //       label: localize('file.new'),
  //     },
  //     order: 1,
  //     group: '0_new',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.NEW_FOLDER.id,
  //       label: localize('file.folder.new'),
  //     },
  //     order: 2,
  //     group: '0_new',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.OPEN_RESOURCES.id,
  //       label: localize('file.open'),
  //     },
  //     order: 1,
  //     group: '1_open',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.OPEN_TO_THE_SIDE.id,
  //       label: localize('file.open.side'),
  //     },
  //     order: 2,
  //     group: '1_open',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.OPEN_WITH_PATH.id,
  //       label: localize('file.filetree.openWithPath'),
  //     },
  //     when: 'workbench.panel.terminal',
  //     order: 3,
  //     group: '1_open',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.SEARCH_ON_FOLDER.id,
  //       label: localize('file.search.folder'),
  //     },
  //     order: 1,
  //     group: '2_search',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.DELETE_FILE.id,
  //       label: localize('file.delete'),
  //     },
  //     order: 1,
  //     group: '2_operator',
  //     when: FilesExplorerFilteredContext.not,
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.RENAME_FILE.id,
  //       label: localize('file.rename'),
  //     },
  //     order: 3,
  //     group: '2_operator',
  //     when: FilesExplorerFilteredContext.not,
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.COMPARE_SELECTED.id,
  //       label: localize('file.compare'),
  //     },
  //     order: 2,
  //     group: '2_operator',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.COPY_FILE.id,
  //       label: localize('file.copy.file'),
  //     },
  //     order: 1,
  //     group: '3_copy',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.CUT_FILE.id,
  //       label: localize('file.cut.file'),
  //     },
  //     order: 2,
  //     group: '3_copy',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.PASTE_FILE.id,
  //       label: localize('file.paste.file'),
  //     },
  //     order: 3,
  //     group: '3_copy',
  //     when: FilesExplorerFilteredContext.not,
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.COPY_PATH.id,
  //       label: localize('file.copy.path'),
  //     },
  //     group: '4_path',
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.ExplorerContext, {
  //     command: {
  //       id: FILE_COMMANDS.COPY_RELATIVE_PATH.id,
  //       label: localize('file.copy.relativepath'),
  //     },
  //     group: '4_path',
  //   });
  // }
  //
  // registerCommands(commands: CommandRegistry) {
  //   // commands.registerCommand(FILE_COMMANDS.OPEN_WITH_PATH, {
  //   //   execute: (uri?: URI) => {
  //   //     let directory = uri;
  //   //
  //   //     if (!directory) {
  //   //       return;
  //   //     }
  //   //     const file = this.connectTreeService.getNodeByPathOrUri(directory);
  //   //     if (file && !file.filestat.isDirectory) {
  //   //       directory = file.uri.parent;
  //   //     }
  //   //     this.commandService.executeCommand(TERMINAL_COMMANDS.OPEN_WITH_PATH.id, directory);
  //   //   },
  //   // });
  //   commands.registerCommand(FILE_COMMANDS.SEARCH_ON_FOLDER, {
  //     execute: async (uri?: URI) => {
  //       let searchFolder = uri;
  //
  //       if (!searchFolder) {
  //         if (this.connectTreeModelService.focusedFile) {
  //           searchFolder = this.connectTreeModelService.focusedFile.uri;
  //         } else if (this.connectTreeModelService.selectedFiles.length > 0) {
  //           searchFolder = this.connectTreeModelService.selectedFiles[0]?.uri;
  //         }
  //       }
  //       if (!searchFolder) {
  //         return;
  //       }
  //       let searchPath: string;
  //       if (this.connectTreeService.isMultipleWorkspace) {
  //         // 多工作区额外处理
  //         for (const root of await this.workspaceService.roots) {
  //           const rootUri = new URI(root.uri);
  //           if (rootUri.isEqualOrParent(searchFolder)) {
  //             searchPath = `./${rootUri.relative(searchFolder)!.toString()}`;
  //             break;
  //           }
  //         }
  //       } else {
  //         if (this.workspaceService.workspace) {
  //           const rootUri = new URI(this.workspaceService.workspace.uri);
  //           if (rootUri.isEqualOrParent(searchFolder)) {
  //             searchPath = `./${rootUri.relative(searchFolder)!.toString()}`;
  //           }
  //         }
  //       }
  //       this.commandService.executeCommand(SEARCH_COMMANDS.OPEN_SEARCH.id, { includeValue: searchPath! });
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile && Directory.is(this.connectTreeModelService.contextMenuFile),
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.LOCATION, {
  //     execute: (locationUri?: URI) => {
  //       if (locationUri) {
  //         this.revealFile(locationUri);
  //       } else if (this.connectTreeModelService.selectedFiles && this.connectTreeModelService.selectedFiles.length > 0) {
  //         this.revealFile(this.connectTreeModelService.selectedFiles[0].uri);
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.LOCATION_WITH_EDITOR, {
  //     execute: () => {
  //       if (this.workbenchEditorService.currentEditor?.currentUri?.scheme === 'file') {
  //         this.revealFile(this.workbenchEditorService.currentEditor?.currentUri);
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.COLLAPSE_ALL, {
  //     execute: () => {
  //       const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
  //       if (!handler || !handler.isVisible) {
  //         return;
  //       }
  //       this.connectTreeModelService.collapseAll();
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.REFRESH_ALL, {
  //     execute: async () => {
  //       const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
  //       if (!handler || !handler.isVisible) {
  //         return;
  //       }
  //       await this.connectTreeService.refresh();
  //     },
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.DELETE_FILE, {
  //     execute: (_, uris) => {
  //       if (!uris) {
  //         if (this.connectTreeModelService.selectedFiles && this.connectTreeModelService.selectedFiles.length > 0) {
  //           uris = this.connectTreeModelService.selectedFiles.map((file) => file.uri);
  //         } else {
  //           return;
  //         }
  //       }
  //       this.connectTreeModelService.deleteFileByUris(uris);
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile &&
  //       !this.connectTreeModelService.contextMenuFile.uri.isEqual(
  //         (this.connectTreeModelService.treeModel.root as Directory).uri,
  //       ),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.RENAME_FILE, {
  //     execute: (uri) => {
  //       if (!uri) {
  //         if (this.connectTreeModelService.contextMenuFile) {
  //           uri = this.connectTreeModelService.contextMenuFile.uri;
  //         } else if (this.connectTreeModelService.focusedFile) {
  //           uri = this.connectTreeModelService.focusedFile.uri;
  //         } else {
  //           return;
  //         }
  //       }
  //       this.connectTreeModelService.renamePrompt(uri);
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile &&
  //       !this.connectTreeModelService.contextMenuFile.uri.isEqual(
  //         (this.connectTreeModelService.treeModel.root as Directory).uri,
  //       ),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.NEW_FILE, {
  //     execute: async (uri) => {
  //       if (this.connectTreeService.filterMode) {
  //         this.connectTreeService.toggleFilterMode();
  //       }
  //       if (uri) {
  //         this.connectTreeModelService.newFilePrompt(uri);
  //       } else {
  //         if (this.connectTreeService.isCompactMode && this.connectTreeModelService.activeUri) {
  //           this.connectTreeModelService.newFilePrompt(this.connectTreeModelService.activeUri);
  //         } else if (this.connectTreeModelService.selectedFiles && this.connectTreeModelService.selectedFiles.length > 0) {
  //           this.connectTreeModelService.newFilePrompt(this.connectTreeModelService.selectedFiles[0].uri);
  //         } else {
  //           let rootUri: URI;
  //           if (!this.connectTreeService.isMultipleWorkspace) {
  //             rootUri = new URI(this.workspaceService.workspace?.uri);
  //           } else {
  //             rootUri = new URI((await this.workspaceService.roots)[0].uri);
  //           }
  //           this.connectTreeModelService.newFilePrompt(rootUri);
  //         }
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.NEW_FOLDER, {
  //     execute: async (uri) => {
  //       if (this.connectTreeService.filterMode) {
  //         this.connectTreeService.toggleFilterMode();
  //       }
  //       if (uri) {
  //         this.connectTreeModelService.newDirectoryPrompt(uri);
  //       } else {
  //         if (this.connectTreeService.isCompactMode && this.connectTreeModelService.activeUri) {
  //           this.connectTreeModelService.newDirectoryPrompt(this.connectTreeModelService.activeUri);
  //         } else if (this.connectTreeModelService.selectedFiles && this.connectTreeModelService.selectedFiles.length > 0) {
  //           this.connectTreeModelService.newDirectoryPrompt(this.connectTreeModelService.selectedFiles[0].uri);
  //         } else {
  //           let rootUri: URI;
  //           if (!this.connectTreeService.isMultipleWorkspace) {
  //             rootUri = new URI(this.workspaceService.workspace?.uri);
  //           } else {
  //             rootUri = new URI((await this.workspaceService.roots)[0].uri);
  //           }
  //           this.connectTreeModelService.newDirectoryPrompt(rootUri);
  //         }
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COMPARE_SELECTED, {
  //     execute: (_, uris) => {
  //       if (uris && uris.length) {
  //         const currentEditor = this.workbenchEditorService.currentEditor;
  //         if (currentEditor && currentEditor.currentUri) {
  //           this.connectTreeService.compare(uris[0], currentEditor.currentUri);
  //         }
  //       }
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile && !Directory.is(this.connectTreeModelService.contextMenuFile),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.OPEN_RESOURCES, {
  //     execute: (uri) => {
  //       this.connectTreeService.openAndFixedFile(uri);
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile && !Directory.is(this.connectTreeModelService.contextMenuFile),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.OPEN_TO_THE_SIDE, {
  //     execute: (uri) => {
  //       this.connectTreeService.openToTheSide(uri);
  //     },
  //     isVisible: () =>
  //       !!this.connectTreeModelService.contextMenuFile && !Directory.is(this.connectTreeModelService.contextMenuFile),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_PATH, {
  //     execute: async (uri) => {
  //       const copyUri: URI = uri;
  //       let pathStr: string = decodeURIComponent(copyUri.path.toString());
  //       // windows下移除路径前的 /
  //       if ((await this.appService.backendOS) === OS.Type.Windows) {
  //         pathStr = pathStr.slice(1);
  //       }
  //       await this.clipboardService.writeText(pathStr);
  //     },
  //     isVisible: () => !!this.connectTreeModelService.contextMenuFile,
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_RELATIVE_PATH, {
  //     execute: async (uri) => {
  //       let rootUri: URI;
  //       if (this.connectTreeService.isMultipleWorkspace) {
  //         // 多工作区额外处理
  //         for (const root of await this.workspaceService.roots) {
  //           rootUri = new URI(root.uri);
  //           if (rootUri.isEqual(uri)) {
  //             return await this.clipboardService.writeText('./');
  //           }
  //           if (rootUri.isEqualOrParent(uri)) {
  //             return await this.clipboardService.writeText(decodeURIComponent(rootUri.relative(uri)!.toString()));
  //           }
  //         }
  //       } else {
  //         if (this.workspaceService.workspace) {
  //           rootUri = new URI(this.workspaceService.workspace.uri);
  //           if (rootUri.isEqual(uri)) {
  //             return await this.clipboardService.writeText('./');
  //           }
  //           return await this.clipboardService.writeText(decodeURIComponent(rootUri.relative(uri)!.toString()));
  //         }
  //       }
  //     },
  //     isVisible: () => !!this.connectTreeModelService.contextMenuFile,
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.COPY_FILE, {
  //     execute: (_, uris) => {
  //       if (uris && uris.length) {
  //         this.connectTreeModelService.copyFile(uris);
  //       } else {
  //         const selectedUris = this.connectTreeModelService.selectedFiles.map((file) => file.uri);
  //         if (selectedUris && selectedUris.length) {
  //           this.connectTreeModelService.copyFile(selectedUris);
  //         }
  //       }
  //     },
  //     isVisible: () =>
  //       (!!this.connectTreeModelService.contextMenuFile &&
  //         !this.connectTreeModelService.contextMenuFile.uri.isEqual(
  //           (this.connectTreeModelService.treeModel.root as Directory).uri,
  //         )) ||
  //       (!!this.connectTreeModelService.focusedFile &&
  //         !this.connectTreeModelService.focusedFile.uri.isEqual(
  //           (this.connectTreeModelService.treeModel.root as Directory).uri,
  //         )),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.CUT_FILE, {
  //     execute: (_, uris) => {
  //       if (uris && uris.length) {
  //         this.connectTreeModelService.cutFile(uris);
  //       } else {
  //         const selectedUris = this.connectTreeModelService.selectedFiles.map((file) => file.uri);
  //         if (selectedUris && selectedUris.length) {
  //           this.connectTreeModelService.cutFile(selectedUris);
  //         }
  //       }
  //     },
  //     isVisible: () =>
  //       (!!this.connectTreeModelService.contextMenuFile &&
  //         !this.connectTreeModelService.contextMenuFile.uri.isEqual(
  //           (this.connectTreeModelService.treeModel.root as Directory).uri,
  //         )) ||
  //       (!!this.connectTreeModelService.focusedFile &&
  //         !this.connectTreeModelService.focusedFile.uri.isEqual(
  //           (this.connectTreeModelService.treeModel.root as Directory).uri,
  //         )),
  //   });
  //
  //   commands.registerCommand<ExplorerContextCallback>(FILE_COMMANDS.PASTE_FILE, {
  //     execute: (uri) => {
  //       if (uri) {
  //         this.connectTreeModelService.pasteFile(uri);
  //       } else if (this.connectTreeModelService.focusedFile) {
  //         let uri;
  //         if (this.connectTreeModelService.activeUri) {
  //           uri = this.connectTreeModelService.activeUri;
  //         } else {
  //           uri = this.connectTreeModelService.focusedFile.uri;
  //         }
  //         this.connectTreeModelService.pasteFile(uri);
  //       }
  //     },
  //     isEnabled: () =>
  //       this.connectTreeModelService.pasteStore && this.connectTreeModelService.pasteStore.type !== PasteTypes.NONE,
  //   });
  //
  //   if (this.appConfig.isElectronRenderer) {
  //     commands.registerCommand(FILE_COMMANDS.VSCODE_OPEN_FOLDER, {
  //       execute: (uri?: URI, arg?: boolean | { forceNewWindow?: boolean }) => {
  //         const windowService: IWindowService = this.injector.get(IWindowService);
  //         const options = { newWindow: true };
  //         if (typeof arg === 'boolean') {
  //           options.newWindow = arg;
  //         } else {
  //           options.newWindow = typeof arg?.forceNewWindow === 'boolean' ? arg.forceNewWindow : true;
  //         }
  //
  //         if (uri) {
  //           return windowService.openWorkspace(uri, options);
  //         }
  //
  //         return this.commandService.executeCommand(FILE_COMMANDS.OPEN_FOLDER.id, options);
  //       },
  //     });
  //
  //     commands.registerCommand(FILE_COMMANDS.OPEN_FOLDER, {
  //       execute: (options: { newWindow: boolean }) => {
  //         const dialogService: IElectronNativeDialogService = this.injector.get(IElectronNativeDialogService);
  //         const windowService: IWindowService = this.injector.get(IWindowService);
  //         dialogService
  //           .showOpenDialog({
  //             title: localize('workspace.openDirectory'),
  //             properties: ['openDirectory'],
  //           })
  //           .then((paths) => {
  //             if (paths && paths.length > 0) {
  //               windowService.openWorkspace(URI.file(paths[0]), options || { newWindow: true });
  //             }
  //           });
  //       },
  //     });
  //
  //     commands.registerCommand(FILE_COMMANDS.OPEN_WORKSPACE, {
  //       execute: (options: { newWindow: boolean }) => {
  //         const supportsOpenWorkspace = this.preferenceService.get('application.supportsOpenWorkspace');
  //         if (!supportsOpenWorkspace) {
  //           return;
  //         }
  //         const dialogService: IElectronNativeDialogService = this.injector.get(IElectronNativeDialogService);
  //         const windowService: IWindowService = this.injector.get(IWindowService);
  //         dialogService
  //           .showOpenDialog({
  //             title: localize('workspace.openWorkspace'),
  //             properties: ['openFile'],
  //             filters: [
  //               {
  //                 name: localize('workspace.openWorkspaceTitle'),
  //                 extensions: [this.workspaceSuffixName],
  //               },
  //             ],
  //           })
  //           .then((paths) => {
  //             if (paths && paths.length > 0) {
  //               windowService.openWorkspace(URI.file(paths[0]), options || { newWindow: true });
  //             }
  //           });
  //       },
  //     });
  //   }
  //
  //   commands.registerCommand(FILE_COMMANDS.REVEAL_IN_EXPLORER, {
  //     execute: (uri?: URI) => {
  //       const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
  //       if (handler && !handler.isVisible) {
  //         handler.activate();
  //       }
  //       if (handler && handler.isCollapsed(ServerRecentViewId)) {
  //         handler?.setCollapsed(ServerRecentViewId, false);
  //       }
  //       if (!uri && this.workbenchEditorService.currentEditor?.currentUri) {
  //         uri = this.workbenchEditorService.currentEditor.currentUri;
  //       }
  //       if (uri) {
  //         this.connectTreeModelService.location(uri);
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.FOCUS_FILES, {
  //     execute: () => {
  //       const handler = this.mainLayoutService.getTabbarHandler(RecentExplorerContainerId);
  //       if (handler) {
  //         handler.activate();
  //       }
  //     },
  //   });
  //
  //   // open file
  //   commands.registerCommand(FILE_COMMANDS.OPEN_FILE, {
  //     execute: (options: IOpenDialogOptions) => this.windowDialogService.showOpenDialog(options),
  //   });
  //
  //   // save file
  //   commands.registerCommand(FILE_COMMANDS.SAVE_FILE, {
  //     execute: (options: ISaveDialogOptions) => this.windowDialogService.showSaveDialog(options),
  //   });
  //
  //   // filter in filetree
  //   commands.registerCommand(FILE_COMMANDS.FILTER_TOGGLE, {
  //     execute: () => this.connectTreeService.toggleFilterMode(),
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.FILTER_OPEN, {
  //     execute: () => {
  //       if (!this.connectTreeService.filterMode) {
  //         return this.connectTreeService.toggleFilterMode();
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.FILTER_CLOSE, {
  //     execute: () => {
  //       if (this.connectTreeService.filterMode) {
  //         this.connectTreeService.toggleFilterMode();
  //       }
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.NEXT, {
  //     execute: () => {
  //       this.connectTreeModelService.moveToNext();
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.PREV, {
  //     execute: () => {
  //       this.connectTreeModelService.moveToPrev();
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.COLLAPSE, {
  //     execute: () => {
  //       this.connectTreeModelService.collapseCurrentFile();
  //     },
  //   });
  //
  //   commands.registerCommand(FILE_COMMANDS.EXPAND, {
  //     execute: () => {
  //       this.connectTreeModelService.expandCurrentFile();
  //     },
  //   });
  //
  //   commands.registerCommand(WORKSPACE_COMMANDS.REMOVE_WORKSPACE_FOLDER, {
  //     execute: async (_: URI, uris: URI[]) => {
  //       if (!uris.length || !this.workspaceService.isMultiRootWorkspaceOpened) {
  //         return;
  //       }
  //       const roots = await this.workspaceService.roots;
  //       const workspaceUris = uris.filter((uri) => roots.find((file) => file.uri === uri.toString()));
  //       if (workspaceUris.length > 0) {
  //         await this.workspaceService.removeRoots(workspaceUris);
  //       }
  //     },
  //     isVisible: () =>
  //       this.workspaceService.isMultiRootWorkspaceOpened &&
  //       !!this.connectTreeModelService.contextMenuFile &&
  //       !!this.workspaceService
  //         .tryGetRoots()
  //         .find((wp) => wp.uri === this.connectTreeModelService.contextMenuFile?.uri.toString()),
  //   });
  // }
  //
  // registerKeybindings(bindings: KeybindingRegistry) {
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.COPY_FILE.id,
  //     keybinding: 'ctrlcmd+c',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.PASTE_FILE.id,
  //     keybinding: 'ctrlcmd+v',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.CUT_FILE.id,
  //     keybinding: 'ctrlcmd+x',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.RENAME_FILE.id,
  //     keybinding: 'enter',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.DELETE_FILE.id,
  //     keybinding: 'ctrlcmd+backspace',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.FILTER_OPEN.id,
  //     keybinding: 'ctrlcmd+f',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerFilteredContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.FILTER_CLOSE.id,
  //     keybinding: 'esc',
  //     when: `${FilesExplorerFocusedContext.raw} && ${FilesExplorerFilteredContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.NEXT.id,
  //     keybinding: 'down',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.PREV.id,
  //     keybinding: 'up',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.EXPAND.id,
  //     keybinding: 'right',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.COLLAPSE.id,
  //     keybinding: 'left',
  //     when: `${FilesExplorerFocusedContext.raw} && !${FilesExplorerInputFocusedContext.raw}`,
  //   });
  //
  //   bindings.registerKeybinding({
  //     command: FILE_COMMANDS.REVEAL_IN_EXPLORER.id,
  //     keybinding: 'ctrlcmd+shift+e',
  //   });
  // }
  //
}
