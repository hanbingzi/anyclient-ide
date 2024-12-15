import { Domain, URI } from '@opensumi/ide-core-common';
import { AppConfig, ClientAppContribution, IClientApp, IWindowService } from '@opensumi/ide-core-browser';
import { IMenuRegistry, MenuContribution, MenuId } from '@opensumi/ide-core-browser/lib/menu/next';
import { Autowired } from '@opensumi/di';
import { IMainLayoutService, MainLayoutContribution } from '@opensumi/ide-main-layout';
import { IWorkspaceService } from '@opensumi/ide-workspace';
import { IAdminClientServicePath, IAdminServiceToken, IJdbcStartServicePath } from '../common';
import { MaybePromise } from '@opensumi/ide-core-node';
import { AdminService } from './admin.service';
import { ServerCommandIds } from '../../base/command/menu.command';
import { AdminClientService } from '../node/admin-client.service';
import { JdbcStartService } from '../node/jdbc-start.service';

@Domain(ClientAppContribution, MenuContribution, MainLayoutContribution)
export class AdminContribution implements ClientAppContribution, MenuContribution, MainLayoutContribution {
  @Autowired(AppConfig)
  private appConfig: AppConfig;

  @Autowired(IMainLayoutService)
  private readonly layoutService: IMainLayoutService;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @Autowired(IWindowService)
  private readonly windowService: IWindowService;

  @Autowired(IAdminServiceToken)
  private readonly adminService: AdminService;

  @Autowired(IJdbcStartServicePath)
  private readonly jdbcStartService: JdbcStartService;

  registerMenus(registry: IMenuRegistry): void {
    //console.log('appconfig', this.appConfig.appName)
    //隐藏切换开发人员窗口
    //registry.unregisterMenuItem(MenuId.MenubarHelpMenu, 'electron.toggleDevTools');

    registry.registerMenuItem(MenuId.MenubarFileMenu, {
      command: {
        id: ServerCommandIds.newServer.id,
        label: ServerCommandIds.newServer.label,
      },
      order:10
    });
  }

  async onDidStart(app: IClientApp) {
    // const debugContainer = this.layoutService.getTabbarHandler('ide-debug');
    // if(debugContainer){
    //   debugContainer.hide();
    // }
    //console.log('onDidStart ------------->');
    await this.openLastWorkspace();
    await this.adminService.onStart();
    const result = await this.jdbcStartService.start()
    //console.log('jdbcStartResult:',result)
    this.adminService.checkUpdate();

  }

  onDidRender() {
    console.log('app start------------->');

  }

  onStop(app: IClientApp): MaybePromise<void> {
    this.adminService.onClose();
    this.jdbcStartService.kill()
  }

  // async hiddenDebug() {
  //   //const debugContainer = this.layoutService.getTabbarHandler(DEBUG_CONTAINER_ID)!;
  //   //console.log('--------------->:', debugContainer, ',isVisible:', debugContainer.isVisible, ';isActivated:', debugContainer.isActivated())
  // }

  /**
   * 自动打开上次此使用的工作空间，
   * 此写法不确定是否是最优写法，将来可能替换掉
   */
  async openLastWorkspace() {
    const workspace = this.workspaceService.workspace;
    if (workspace) {
      return;
    }
    const recentWorkspaces = await this.workspaceService.getMostRecentlyUsedWorkspaces();
    if (recentWorkspaces && recentWorkspaces.length > 0) {
      this.windowService.openWorkspace(new URI(recentWorkspaces[0]), { newWindow: false });
    }
  }
}
