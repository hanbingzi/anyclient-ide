import {
  CommandContribution,
  CommandRegistry,
  Domain,
  IStorage,
  STORAGE_NAMESPACE,
  StorageProvider,
} from '@opensumi/ide-core-common';
import {
  ClientAppContribution,
  ComponentContribution,
  ComponentRegistry,
  getIcon,
  localize,
  SlotLocation,
} from '@opensumi/ide-core-browser';
import { QueryExplorerView } from './query-explorer.view';
import { BottomPreviewVisible, RightPreviewVisible } from '../../base/command/panel.command';
import { IMainLayoutService } from '@opensumi/ide-main-layout';
import { Autowired } from '@opensumi/di';
import { SearchPreviewPosition } from '../../base/types/layout.types';
import { AppConstants } from '../../../common/constants';

export const BOTTOM_QUERY_RESULT_CONTAINER = 'bottom-query-result-container';
export const RIGHT_QUERY_RESULT_CONTAINER = 'right-query-result-container';

@Domain(ComponentContribution, CommandContribution, ClientAppContribution)
export class QueryExplorerContribution implements ComponentContribution, CommandContribution, ClientAppContribution {
  @Autowired(IMainLayoutService)
  private readonly layoutService: IMainLayoutService;

  @Autowired(StorageProvider)
  private readonly storageProvider: StorageProvider;

  registerComponent(registry: ComponentRegistry) {
    registry.register(
      'query-explorer-right',
      [],
      {
        iconClass: getIcon('browser-preview'),
        title: localize('search.result'),
        priority: 1,
        containerId: RIGHT_QUERY_RESULT_CONTAINER,
        component: QueryExplorerView,
      },
      SlotLocation.right,
    );
    registry.register(
      'query-explorer-bottom',
      [],
      {
        title: localize('search.result'),
        priority: 10,
        containerId: BOTTOM_QUERY_RESULT_CONTAINER,
        component: QueryExplorerView,
      },
      SlotLocation.bottom,
    );
  }

  async onDidStart() {
    // this.layoutService.
    //读取配置
    const storage: IStorage = await this.storageProvider(STORAGE_NAMESPACE.EXPLORER);
    const storagePosition = await storage.get(AppConstants.SEARCH_PREVIEW_KEY);
    //刚启动，动态注册要展示的
    if (storagePosition && storagePosition === SearchPreviewPosition.RIGHT) {
      //隐藏底下的
      const bottomContainer = this.layoutService.getTabbarHandler('bottom-query-result-container');
      //const isVisible = bottomContainer?.isVisible;
      bottomContainer?.hide();
    } else {
      //隐藏侧边的
      const rightTabBarService = this.layoutService.getTabbarService('right');
      rightTabBarService.updatePanelVisibility(false);
    }
  }

  registerCommands(registry: CommandRegistry) {
    registry.registerCommand(RightPreviewVisible, {
      execute: async () => {
        //const storage: IStorage = await this.storageProvider(STORAGE_NAMESPACE.EXPLORER);
        console.log('storage--->');
        //const isVisible = this.layoutService.isVisible(SlotLocation.right);
        //if (!isVisible) {
        //this.layoutService.toggleSlot(SlotLocation.right, !isVisible);
        //}
        const rightTabBarService = this.layoutService.getTabbarService('right');
        rightTabBarService.updatePanelVisibility(false);
        // const rightContainer = this.layoutService.getTabbarHandler(
        //   'right-query-result-container'
        // );
        // const isVisible =  rightContainer?.isVisible;
        // rightContainer?.hide();
      },
    });
    registry.registerCommand(BottomPreviewVisible, {
      execute: () => {
        //const isVisible = this.layoutService.isVisible(SlotLocation.right);
        //if (!isVisible) {
        //this.layoutService.toggleSlot(SlotLocation.right, !isVisible);
        //}
        // const rightTabBarService = this.layoutService.getTabbarService("right");
        // rightTabBarService.updatePanelVisibility(false);

        const bottomContainer = this.layoutService.getTabbarHandler('bottom-query-result-container');
        const isVisible = bottomContainer?.isVisible;
        bottomContainer?.hide();
      },
    });
  }
}
