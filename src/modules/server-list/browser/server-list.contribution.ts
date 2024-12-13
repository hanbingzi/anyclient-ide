import { Autowired } from '@opensumi/di';
import {
  ClientAppContribution,
  CommandContribution,
  CommandRegistry,
  CommandService,
  Domain, FILE_COMMANDS, formatLocalize,
  getIcon,
  SlotLocation,
  TabBarToolbarContribution,
  ToolbarRegistry,
  URI,
} from '@opensumi/ide-core-browser';
import { ComponentContribution, ComponentRegistry } from '@opensumi/ide-core-browser/lib/layout';
import { IMenuRegistry, MenuContribution } from '@opensumi/ide-core-browser/lib/menu/next';
import { ResourceService } from '@opensumi/ide-editor';
import {
  BrowserEditorContribution,
  EditorComponentRegistry,
  WorkbenchEditorService,
} from '@opensumi/ide-editor/lib/browser';
import { IMainLayoutService, IViewsRegistry, MainLayoutContribution } from '@opensumi/ide-main-layout';
import { ServerCommandIds as CommandIds, ServerCommandIds } from '../../base/command/menu.command';
import { ServerListIds, ServerMenuIds } from '../../base/config/menu/menu.config';
import { IServerEditService } from '../../server-manager/common';
import { ServerCompositeTreeNode, ServerTreeNode } from '../common/tree-node.define';
import { ServerTreeService } from './server-tree.service';
import { ServerTree } from './server-tree.view';
import { ServerInfoResourceProvider } from './serverInfo/server-info-resource.provider';
import { ServerInfoComponent } from './serverInfo/server-info.view';
import SelectOverlayView from './select-workspace/select-overlay.view';
import { localize } from '@opensumi/ide-core-common';
import { ViewContentGroups } from '@opensumi/ide-main-layout/lib/browser/views-registry';
import { ServerRecentViewId } from '../../open-recent/browser/connect-tree.contribution';

export const ServerListExplorerId = 'ide-list-explorer';

export const ServerSelectOverlayId = 'ide-server-select-overlay';

export const ServerListExplorerContainerId = 'server-list-container-explorer';

export const ServerTreeViewExplorerId = 'server-tree-view-explorer';

export const ServerInfoId = 'serverInfo';

@Domain(
  MenuContribution,
  MainLayoutContribution,
  ClientAppContribution,
  BrowserEditorContribution,
  ComponentContribution,
  CommandContribution,
  TabBarToolbarContribution,
  // KeybindingContribution
)
// KeybindingContribution
export class ServerListContribution
  implements
    MenuContribution,
    MainLayoutContribution,
    ClientAppContribution,
    BrowserEditorContribution,
    ComponentContribution,
    CommandContribution,
    TabBarToolbarContribution
{
  @Autowired(IMainLayoutService)
  private mainLayoutService: IMainLayoutService;

  @Autowired(ServerTreeService)
  private serverTreeService: ServerTreeService;

  @Autowired(IServerEditService)
  private serverEditService: IServerEditService;

  @Autowired(ServerInfoResourceProvider)
  private serverInfoResourceProvider: ServerInfoResourceProvider;

  @Autowired(WorkbenchEditorService)
  private readonly editorService: WorkbenchEditorService;

  @Autowired(CommandService)
  private readonly commandService: CommandService;

  @Autowired(IViewsRegistry)
  private viewsRegistry: IViewsRegistry;
  async onStart() {
    await this.serverTreeService.init();
  }

  async onDidRender() {
    // this.viewsRegistry.registerViewWelcomeContent(ServerTreeViewExplorerId, {
    //   content: formatLocalize('welcome-view.noFolderHelp', FILE_COMMANDS.OPEN_FOLDER.id),
    //   group: ViewContentGroups.Open,
    //   order: 1,
    // });
    this.mainLayoutService.collectViewComponent(
      {
        component: ServerTree,
        collapsed: false,
        id: ServerTreeViewExplorerId,
        name: 'All Server',
      },
      // RecentExplorerContainerId
      ServerListExplorerContainerId,
    );
  }

  registerComponent(registry: ComponentRegistry) {
    registry.register(
      ServerListExplorerId,
      [],
      {
        iconClass: getIcon('unorderedlist'), //候选图标unorderedlist detail
        title: '所有服务',
        priority: 11,
        containerId: ServerListExplorerContainerId,
      },
      SlotLocation.left,
    );
    registry.register(
      ServerSelectOverlayId,
      {
        id: ServerSelectOverlayId,
        component: SelectOverlayView,
      },
      undefined,
      //插槽位置声明
      SlotLocation.extra,
    );
  }

  registerEditorComponent(registry: EditorComponentRegistry) {
    registry.registerEditorComponent({
      uid: ServerInfoId,
      scheme: ServerInfoId,
      component: ServerInfoComponent,
      //renderMode: EditorComponentRenderMode.ONE_PER_RESOURCE,// .ONE_PER_WORKBENCH,
    });
    registry.registerEditorComponentResolver(ServerInfoId, (resource, results) => {
      results.push({
        type: 'component',
        componentId: ServerInfoId,
      });
    });
  }

  registerResource(service: ResourceService) {
    service.registerResourceProvider(this.serverInfoResourceProvider);
  }

  // onDidStart(){
  //    // this.editorService.open(new URI('serverInfo://'));
  //     this.editorService.openUris([new URI('welcome://'),new URI('serverInfo://')]);
  //
  // }

  registerMenus(menuRegistry: IMenuRegistry): void {
    menuRegistry.registerMenuItem(ServerListIds.explorerServer, {
      command: {
        id: CommandIds.editServer.id,
        label: CommandIds.editServer.label!,
      },
      order: 1,
      group: '0',
    });

    menuRegistry.registerMenuItem(ServerListIds.explorerServer, {
      command: {
        id: CommandIds.deleteServer.id,
        label: CommandIds.deleteServer.label!,
      },
      order: 1,
      group: '0',
    });
  }

  registerCommands(commands: CommandRegistry): void {
    /** 新建服务
     //创建一个模态框 1.选中服务 2.输入配置
     //将数据存储至本地
     //将数据展示出来
     */

    // 刷新所有
    commands.registerCommand(ServerCommandIds.serverRefreshAll, {
      execute: () => {
        this.serverTreeService.refreshAll();
      },
    });
    // 查找
    commands.registerCommand(ServerCommandIds.serverFilterOpen, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ServerListExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        this.serverTreeService.toggleFilterMode();
      },
    });
    // 全部展开
    commands.registerCommand(ServerCommandIds.serverExpandAll, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ServerListExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        this.serverTreeService.expandAll();
      },
    });
    // 全部折叠
    commands.registerCommand(ServerCommandIds.serverCollapseAll, {
      execute: () => {
        const handler = this.mainLayoutService.getTabbarHandler(ServerListExplorerContainerId);
        if (!handler || !handler.isVisible) {
          return;
        }
        this.serverTreeService.collapsedAll();
      },
    });

    commands.registerCommand(ServerCommandIds.openServerInfo, {
      execute: (id: string) =>
        //  console.log('trrr',id)
        //  this.editorService.open(new URI('serverInfo://id=' + id));

        this.editorService.open(
          URI.from({
            scheme: 'serverInfo',
            query: URI.stringifyQuery({
              id,
            }),
          }),
        ),
    });

    commands.registerCommand(ServerCommandIds.newServer, {
      execute: () => {
        this.serverEditService.open(ServerCommandIds.newServer);
      },
    });

    commands.registerCommand(ServerCommandIds.editServer, {
      execute: (args: ServerCompositeTreeNode | ServerTreeNode) => {
        if (!args) {
          return;
        }
        this.serverEditService.open(ServerCommandIds.editServer, args.id, args.primaryId);
      },
    });

    commands.registerCommand(ServerCommandIds.deleteServer, {
      execute: async (args: ServerCompositeTreeNode | ServerTreeNode) => {
        if (args === null) {
          return;
        }
        await this.serverTreeService.deleteNode(args);
        //刷新最近连接
        await this.commandService.executeCommand(ServerCommandIds.connectRefreshAll.id);
        // this.serverEditService.open(ServerCommandIds.editConnect, args.id, args.primaryId);
      },
    });
  }

  registerToolbarItems(registry: ToolbarRegistry) {
    // 点击聚焦当前编辑器 focus 的文件
    registry.registerItem({
      id: ServerCommandIds.newServer.id,
      command: ServerCommandIds.newServer.id,
      label:  localize('file.new'),//'创建新的服务', //
      viewId: ServerTreeViewExplorerId,
      order: 0,
    });

    registry.registerItem({
      id: ServerCommandIds.serverFilterOpen.id,
      command: ServerCommandIds.serverFilterOpen.id,
      label: ServerCommandIds.serverFilterOpen.label, // localize('file.new'),
      viewId: ServerTreeViewExplorerId,
      order: 1,
    });

    registry.registerItem({
      id: ServerCommandIds.serverRefreshAll.id,
      command: ServerCommandIds.serverRefreshAll.id,
      label: ServerCommandIds.serverRefreshAll.label, // localize('file.new'),
      viewId: ServerTreeViewExplorerId,
      order: 2,
    });

    registry.registerItem({
      id: ServerCommandIds.serverExpandAll.id,
      command: ServerCommandIds.serverExpandAll.id,
      label: ServerCommandIds.serverExpandAll.label, // localize('file.new'),
      viewId: ServerTreeViewExplorerId,
      order: 3,
    });

    registry.registerItem({
      id: ServerCommandIds.serverCollapseAll.id,
      command: ServerCommandIds.serverCollapseAll.id,
      label: ServerCommandIds.serverCollapseAll.label, // localize('file.new'),
      viewId: ServerTreeViewExplorerId,
      order: 4,
    });
  }

  // registerKeybindings(bindings: KeybindingRegistry) {
  //   bindings.registerKeybinding({
  //     command: ServerCommandIds.refresh.id,
  //     keybinding: 'f5',
  //   });
  // }
}
