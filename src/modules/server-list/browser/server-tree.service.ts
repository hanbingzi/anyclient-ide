import React from 'react';

import { Autowired, Injectable, Injector, INJECTOR_TOKEN } from '@opensumi/di';
import { DisposableCollection, Emitter, formatLocalize, localize } from '@opensumi/ide-core-browser';
import { AbstractContextMenuService, ICtxMenuRenderer } from '@opensumi/ide-core-browser/lib/menu/next';
import { IDialogService } from '@opensumi/ide-overlay';
import { ServerListIds, ServerMenuIds } from '../../base/config/menu/menu.config';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../base/model/server-tree-node.model';
import {
  Decoration,
  DecorationsManager,
  IRecycleTreeHandle,
  PromptValidateMessage,
  Tree,
  TreeModel,
  TreeNodeEvent,
} from '../../components/recycle-tree';
import {
  IOpenRecentService,
  IOpenRecentServiceToken,
  IServerService,
  IServerServiceToken,
  ServerInfo,
} from '../../local-store-db/common';
import { IOpenRecentStatService, IOpenRecentStatServiceToken } from '../../open-recent';
import { BasicTreeRoot, BasicTreeRootName, ServerCompositeTreeNode, ServerTreeNode } from '../common/tree-node.define';
import { DECORATIONS } from '../common/types';
import { ServerContextKey } from './server-contextkey';
import { ServerType } from '../../base/types/server-node.types';
import { ServerPreferences } from '../../base/config/server-info.config';

export interface FileTreeValidateMessage extends PromptValidateMessage {
  value: string;
}

@Injectable()
export class ServerTreeService extends Tree {
  @Autowired(ICtxMenuRenderer)
  private readonly ctxMenuRenderer: ICtxMenuRenderer;

  @Autowired(AbstractContextMenuService)
  private readonly contextMenuService: AbstractContextMenuService;

  @Autowired(INJECTOR_TOKEN)
  private readonly injector: Injector;

  // @Autowired(IServerManagerService)
  // private readonly serverManagerService: IServerManagerService

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IOpenRecentServiceToken)
  private readonly openRecentService: IOpenRecentService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IOpenRecentStatServiceToken)
  private readonly openRecentStatService: IOpenRecentStatService;

  private serverContextKey: ServerContextKey;

  private selectedDecoration: Decoration = new Decoration(DECORATIONS.SELECTED); // 选中态
  private focusedDecoration: Decoration = new Decoration(DECORATIONS.FOCUSED); // 焦点态
  private contextMenuDecoration: Decoration = new Decoration(DECORATIONS.ACTIVED); // 右键菜单激活态
  private loadingDecoration: Decoration = new Decoration(DECORATIONS.LOADING); // 加载态
  private connectDecoration: Decoration = new Decoration(DECORATIONS.CONNECT); // 服务连接中

  // 即使选中态也是焦点态的节点
  private _focusedNode: ServerCompositeTreeNode | ServerTreeNode | undefined;
  // 选中态的节点
  private _selectedNodes: (ServerCompositeTreeNode | ServerTreeNode)[] = [];
  // 右键菜单选择的节点
  private _contextMenuNode: ServerCompositeTreeNode | ServerTreeNode | undefined;
  // 加载状态的节点
  private _loadingNodes: (ServerCompositeTreeNode | ServerTreeNode)[] = [];

  // 当前焦点选中的文件，1.点击选中 2.右键菜单选中 3.上下键选中
  private _activeNode: ServerCompositeTreeNode | ServerTreeNode | undefined;

  private _model: BasicTreeModel;
  private _decorations: DecorationsManager;

  private disposableCollection: DisposableCollection = new DisposableCollection();

  private onDidUpdateTreeModelEmitter: Emitter<BasicTreeModel> = new Emitter();

  private readonly onFilterModeChangeEmitter = new Emitter<boolean>();

  private _treeHandle: IRecycleTreeHandle;

  private validateMessage: FileTreeValidateMessage | undefined;
  // 筛选模式开关
  private _filterMode = false;

  /**
   * treeData后期从配置中获取
   * @param treeData
   */
  async init() {
    // const treeDataInit1 = await this.findAll();
    //this._root = new BasicTreeRoot(this, undefined, {children: treeDataInit1, nodeName: '', displayName: '', icon: ''});// command: '',
    this._root = new BasicTreeRoot(this, undefined); // command: '',
    this._model = new BasicTreeModel();
    this._model.init(this._root);
    this.initDecorations(this._root as BasicTreeRoot);
    this.onDidUpdateTreeModelEmitter.fire(this._model);
    this.disposableCollection.push(this.onDidUpdateTreeModelEmitter);
  }

  get onDidUpdateTreeModel() {
    return this.onDidUpdateTreeModelEmitter.event;
  }

  get onFilterModeChange() {
    return this.onFilterModeChangeEmitter.event;
  }

  get model() {
    return this._model;
  }

  get root() {
    return this._root;
  }

  get decorations() {
    return this._decorations;
  }

  get filterMode() {
    return this._filterMode;
  }

  get selectedNodes() {
    return this._selectedNodes;
  }

  get focusedNode() {
    return this._focusedNode;
  }

  get contextMenuNode() {
    return this._contextMenuNode;
  }

  get loadingNodes() {
    return this._loadingNodes;
  }

  get treeHandler() {
    return this._treeHandle;
  }

  get activeNode() {
    return this._activeNode;
  }

  private initDecorations(root: BasicTreeRoot) {
    this._decorations = new DecorationsManager(root as any);
    this._decorations.addDecoration(this.selectedDecoration);
    this._decorations.addDecoration(this.focusedDecoration);
    this._decorations.addDecoration(this.contextMenuDecoration);
    this._decorations.addDecoration(this.loadingDecoration);
    this._decorations.addDecoration(this.connectDecoration);
    this.disposableCollection.push(
      root.watcher.on(TreeNodeEvent.WillResolveChildren, (target) => {
        this.loadingDecoration.addTarget(target);
      }),
    );
    this.disposableCollection.push(
      root.watcher.on(TreeNodeEvent.DidResolveChildren, (target) => {
        this.loadingDecoration.removeTarget(target);
      }),
    );
    this.disposableCollection.push(
      this.openRecentStatService.onConnectChange((event) => {
        if (event.option === 'open') {
          this.activeConnectDecoration(event.server);
        } else if (event.option === 'close') {
          this.enactiveConnectDecoration(event.server);
        }
      }),
    );
    this.disposableCollection.push(this._decorations);
  }

  private async findAll(): Promise<IServerTreeNode[]> {
    const serverList = await this.serverService.findAll();
    if (serverList === null || serverList.length === 0) {
      return [];
    }
    const processTreeDatas = this.processTreeData(serverList);
    return processTreeDatas;
  }

  private processTreeData(serverList: ServerInfo[]): IServerTreeNode[] {
    // 将数据按类型进行分组
    const serverTreeMap = new Map<ServerType, IServerTreeNode[]>();
    for (const server of serverList) {
      const { serverType } = server;
      let treeData = serverTreeMap.get(serverType!);
      if (treeData === null || treeData === undefined) {
        treeData = [];
        serverTreeMap.set(serverType!, treeData);
      }
      const treeItem = ServerTreeNodeUtils.convertServer(server);
      treeData.push(treeItem);
    }
    // 将分组数据转换为树菜单数据
    const serverTree: IServerTreeNode[] = [];
    for (const [key, value] of serverTreeMap) {
      let displayName: string = ServerPreferences[key].displayName
        ? ServerPreferences[key].displayName
        : ServerPreferences[key].name;
      const data: IServerTreeNode = {
        displayName,
        nodeName: key,
        key,
        levelType: 'group',
        nodeStat: 'success',
        serverType: key,
        children: value,
        // expanded:true,
        // expandable:true
      };
      serverTree.push(data);
    }
    return serverTree;
  }

  async resolveChildren(parent?: ServerCompositeTreeNode) {
    //console.log('server-tree resolveChildren ,parent:', parent);
    let children: (ServerCompositeTreeNode | ServerTreeNode)[] = [];
    if (ServerCompositeTreeNode.isRoot(parent)) {
      const serverTreeNodes = await this.findAll();
      //console.log('server-tree resolveChildren ,root:', serverTreeNodes);
      for (let item of serverTreeNodes) {
        children.push(new ServerCompositeTreeNode(this, this.root, item));
      }
    } else if (parent?.raw.levelType === 'group') {
      //console.log('server-tree resolveChildren ,group:');
      const serverTreeNodes = await this.serverService.findByType(parent.serverType!);
      for (let item of serverTreeNodes) {
        const treeData = ServerTreeNodeUtils.convertServer(item);
        children.push(new ServerTreeNode(this, parent, treeData));
      }
    }
    //console.log('----children:', children);
    return children;
    //return this.convertTreeNode(parent, parent?.raw.children || []);
  }

  sortComparator = (a: ServerCompositeTreeNode, b: ServerCompositeTreeNode) =>
    a.name === b.name ? 0 : a.name > b.name ? 1 : -1;

  // private convertTreeNode(parent?: ServerCompositeTreeNode, nodes?: IServerTreeNode[]) {
  //   console.log('convertTreeNode->', 'parent：', parent, ';nodes:', nodes)
  //   if (!nodes) {
  //     return [];
  //   }
  //   // console.log("service-parent:", parent)
  //   const result: (ServerCompositeTreeNode | ServerTreeNode)[] = [];
  //   for (const node of nodes) {
  //     if (node.children) {
  //       result.push(new ServerCompositeTreeNode(this, parent, node));
  //     } else {
  //       result.push(new ServerTreeNode(this, parent, node));
  //     }
  //   }
  //   // console.log("service-convertTreeNode-result:", result)
  //   return result;
  // }

  async loadData(parent?: ServerCompositeTreeNode) {
    // 模拟获取要加载的数据
    //  let serverChildren: IServerTreeNode[] = []
    if (parent?.key === '2') {
      // 加载一百个
    }
  }

  /**
   * yanqi:
   * 生成新的group和node，添加到树中
   * @param _serverType
   * @param treeData
   */
  async addAndRefresh(_serverType: string, treeData: IServerTreeNode) {
    // ServerCompositeTreeNode
    // let node =   this.model.root.children;

    let parenGroup: ServerCompositeTreeNode | null = this.getGroupByServerType(_serverType);

    if (!parenGroup) {
      const group: IServerTreeNode = ServerTreeNodeUtils.convertGroup(_serverType);
      parenGroup = new ServerCompositeTreeNode(this, this.root, group);
      this.root!.insertItem(parenGroup);
      //  parenGroup = this.getGroupByServerType(_serverType);
    }
    if (!parenGroup.expanded) {
      await parenGroup.setExpanded(true);
    }
    const newNode = new ServerTreeNode(this, parenGroup, treeData);
    parenGroup.insertItem(newNode);
    this.activeFocusedDecoration(newNode);
  }

  getGroupByServerType(_serverType: string): ServerCompositeTreeNode | null {
    const rootChildren = this.root!.children!;
    for (const item of rootChildren) {
      if ((item as ServerCompositeTreeNode).displayName === _serverType) {
        const parenGroup = item as ServerCompositeTreeNode;
        return parenGroup;
      }
    }
    return null;
  }

  async updateNode(treeId: number, info: ServerInfo) {
    const treeNode = this.root!.getTreeNodeById(treeId) as ServerCompositeTreeNode | ServerTreeNode;
    if (!treeNode) {
      return;
    }
    this.activeLoadingDecoration(treeNode);
    treeNode.updateMetaData({ label: info.serverName!, info });

    // await this.root.refresh([`/${BasicTreeRootName}/${info.serverType}`])
    this.enactiveLoadingDecoration(treeNode);
    this.activeContextMenuDecoration(treeNode);
  }

  /**
   * 根据路径获取treeNode
   * @param serverType
   * @param serverName
   */
  getNodeByPath(serverType: string, serverName: string) {
    const path = `/${BasicTreeRootName}/${serverType}/${serverName}`;
    return this.root!.getTreeNodeByPath(path);
  }

  async deleteNode(treeNode: ServerCompositeTreeNode | ServerTreeNode) {
    const ok = localize('ButtonOK');
    const cancel = localize('ButtonCancel');
    const confirm = await this.dialogService.warning(formatLocalize('file.confirm.delete', treeNode.displayName), [
      cancel,
      ok,
    ]);
    if (confirm !== ok) {
      return;
    }
    const serverId = treeNode.primaryId!;
    await this.serverService.delete(serverId);
    await this.openRecentService.deleteByServerId(serverId);
    const parent = treeNode.parent as ServerCompositeTreeNode;
    parent?.unlinkItem(treeNode); // 执行卸载删除
  }

  expandAll = async () => {
    await this.root!.expandedAll();
  };

  collapsedAll = async () => {
    await this.root!.collapsedAll();
  };

  handleTreeHandler(handle: IRecycleTreeHandle) {
    this._treeHandle = handle;
  }

  async refreshAll() {
    await this.root!.refresh();
  }

  activeConnectDecoration(server: ServerInfo) {
    const target = this.getNodeByPath(server.serverType!, server.serverName!);
    //console.log('activeConnectDecoration-->', target);
    if (!target) {
      return;
    }
    this.connectDecoration.addTarget(target);
    this.model?.dispatchChange();
  }

  enactiveConnectDecoration(server: ServerInfo) {
    const target = this.getNodeByPath(server.serverType!, server.serverName!);
    if (!target) {
      return;
    }

    this.connectDecoration.removeTarget(target);
    this.model?.dispatchChange();
  }

  // 清楚所有加载状态
  clearConnectDecoration() {}

  // 清空其他选中/焦点态节点，更新当前焦点节点
  activeFocusedDecoration = (target: ServerCompositeTreeNode | ServerTreeNode) => {
    if (this._contextMenuNode) {
      this.contextMenuDecoration.removeTarget(this._contextMenuNode);
      this.focusedDecoration.removeTarget(this._contextMenuNode);
      this.selectedDecoration.removeTarget(this._contextMenuNode);
      this._contextMenuNode = undefined;
    }
    if (target) {
      if (this.selectedNodes.length > 0) {
        this.selectedNodes.forEach((file) => {
          // 因为选择装饰器可能通过其他方式添加而不能及时在selectedNodes上更新
          // 故这里遍历所有选中装饰器的节点进行一次统一清理
          for (const target of this.selectedDecoration.appliedTargets.keys()) {
            this.selectedDecoration.removeTarget(target);
          }
        });
      }
      if (this.focusedNode) {
        this.focusedDecoration.removeTarget(this.focusedNode);
      }
      this.selectedDecoration.addTarget(target);
      this.focusedDecoration.addTarget(target);
      this._focusedNode = target;
      this._selectedNodes = [target];
      this._activeNode = target;

      this.model?.dispatchChange();
    }
  };

  activeContextMenuDecoration = (target: ServerCompositeTreeNode | ServerTreeNode) => {
    if (this._contextMenuNode) {
      this.contextMenuDecoration.removeTarget(this._contextMenuNode);
    }
    if (this.focusedNode) {
      this.focusedDecoration.removeTarget(this.focusedNode);
      this._focusedNode = undefined;
    }
    this.contextMenuDecoration.addTarget(target);
    this._contextMenuNode = target;
    this._activeNode = target;
    this.model?.dispatchChange();
  };

  // 取消选中节点焦点
  enactiveFocusedDecoration = () => {
    if (this.focusedNode) {
      this.focusedDecoration.removeTarget(this.focusedNode);
      this._focusedNode = undefined;
      this._activeNode = undefined;
      this.model?.dispatchChange();
    }
  };

  /**
   * 设置节点的加载状态
   * @param target
   */
  activeLoadingDecoration = (target: ServerCompositeTreeNode | ServerTreeNode) => {
    if (target) {
      this.loadingDecoration.addTarget(target);
      if (this._loadingNodes.length > 0) {
        this._loadingNodes = [...this._loadingNodes, target];
      } else {
        this._loadingNodes = [target];
      }
      this.model?.dispatchChange();
    }
  };

  /**
   * 取消节点的加载状态
   * @param target
   */
  enactiveLoadingDecoration = (target: ServerCompositeTreeNode | ServerTreeNode) => {
    if (target) {
      this.loadingDecoration.removeTarget(target);
      if (this._loadingNodes.length > 0) {
        this._loadingNodes = this._loadingNodes.filter((item) => item.key !== target.key);
      }
      this.model?.dispatchChange();
    }
  };

  // private getWellFormedFileName(filename: string): string {
  //   if (!filename) {
  //     return filename;
  //   }
  //
  //   // 去除空格
  //   filename = trim(filename, '\t');
  //
  //   // 移除尾部的 . / \\
  //   // filename = rtrim(filename, '.');
  //   // filename = rtrim(filename, '/');
  //   // filename = rtrim(filename, '\\');
  //
  //   return filename;
  // }

  // private trimLongName(name: string): string {
  //   if (name && name.length > 255) {
  //     return `${name.substr(0, 255)}...`;
  //   }
  //   return name;
  // }

  // private validateFileName = (
  //   promptHandle: RenamePromptHandle | NewPromptHandle,
  //   name: string,
  // ): FileTreeValidateMessage | null => {
  //   // 转换为合适的名称
  //   name = this.getWellFormedFileName(name);
  //
  //   // 不存在文件名称
  //   if (!name || name.length === 0 || /^\s+$/.test(name)) {
  //     return {
  //       message: localize('validate.tree.emptyFileNameError'),//
  //       type: PROMPT_VALIDATE_TYPE.ERROR,
  //       value: name,
  //     };
  //   }
  //
  //   // 不允许开头为分隔符的名称
  //   if (name[0] === '/' || name[0] === '\\') {
  //     return {
  //       message: localize('validate.tree.fileNameStartsWithSlashError'),
  //       type: PROMPT_VALIDATE_TYPE.ERROR,
  //       value: name,
  //     };
  //   }
  //
  //   // 当文件名称前后有空格时，提示用户
  //   if (name[0] === ' ' || name[name.length - 1] === ' ') {
  //     return {
  //       message: localize('validate.tree.fileNameFollowOrStartWithSpaceWarning'),
  //       type: PROMPT_VALIDATE_TYPE.WARNING,
  //       value: name,
  //     };
  //   }
  //
  //   let parent: ServerCompositeTreeNode;
  //
  //   if ((promptHandle as RenamePromptHandle).target) {
  //     const target = (promptHandle as RenamePromptHandle).target as ServerTreeNode | ServerCompositeTreeNode;
  //     if (name === target.name) {
  //       return null;
  //     }
  //     parent = target.parent as ServerCompositeTreeNode;
  //   } else {
  //     parent = (promptHandle as NewPromptHandle).parent as ServerCompositeTreeNode;
  //   }
  //
  //   // 压缩目录重命名的情况下不需要判断同名文件
  //   if (parent) {
  //     const isCompactNodeRenamed =
  //       promptHandle instanceof RenamePromptHandle &&
  //       (promptHandle.target as ServerTreeNode).displayName.indexOf(Path.separator) > 0;
  //     if (!isCompactNodeRenamed) {
  //       // 不允许覆盖已存在的文件
  //       const child = parent.children?.find((child) => child.name === name);
  //       if (child) {
  //         return {
  //           message: formatLocalize('validate.tree.fileNameExistsError', name),
  //           type: PROMPT_VALIDATE_TYPE.ERROR,
  //           value: name,
  //         };
  //       }
  //     }
  //   }
  //
  //   const names = coalesce(name.split(/[\\/]/));
  //   // 判断子路径是否合法
  //   if (names.some((folderName) => !isValidBasename(folderName))) {
  //     return {
  //       message: formatLocalize('validate.tree.invalidFileNameError', this.trimLongName(name)),
  //       type: PROMPT_VALIDATE_TYPE.ERROR,
  //       value: name,
  //     };
  //   }
  //
  //   return null;
  // };

  // private proxyPrompt = (promptHandle: RenamePromptHandle | NewPromptHandle) => {
  //     let isCommit = false;
  //
  //     const fileCommit = async (newName) => {
  //         if (promptHandle instanceof RenamePromptHandle) {
  //             if (this.activeNode?.displayName === newName) {
  //                 return true;
  //             }
  //             //通过http修改文件名称
  //             //http修改成功后，刷新
  //         }
  //         return true;
  //     }
  //     const serverCommit = async (newName) => {
  //      //console.log('tree-service proxyPrompt commit:', newName)
  //         if (promptHandle instanceof RenamePromptHandle) {
  //          //console.log('')
  //         }
  //         return true;
  //     }
  //     const blurCommit = async (newName) => {
  //        // console.log('tree-service proxyPrompt blurCommit:', newName)
  //     }
  //     const enterCommit = async (newName) => {
  //       //  console.log('tree-service proxyPrompt enterCommit:', newName)
  //         isCommit = true;
  //         if (!!this.validateMessage && this.validateMessage.type === PROMPT_VALIDATE_TYPE.ERROR) {
  //             return false;
  //         }
  //         if (
  //             newName.trim() === '' ||
  //             (!!this.validateMessage && this.validateMessage.type !== PROMPT_VALIDATE_TYPE.ERROR)
  //         ) {
  //             this.validateMessage = undefined;
  //             return true;
  //         }
  //         const success = await serverCommit(newName);
  //         isCommit = false;
  //
  //         if (!success) {
  //             return false;
  //         }
  //         // 返回true时，输入框会隐藏
  //         return true;
  //     }
  //     const handleFocus = async () => {
  //      //console.log('tree-service proxyPrompt handleFocus:')
  //     }
  //     const handleDestroy = () => {
  //      //console.log('tree-service proxyPrompt handleDestroy:')
  //     }
  //     const handleCancel = () => {
  //      //console.log('tree-service proxyPrompt handleCancel:')
  //     }
  //     const handleChange = (currentValue) => {
  //      //console.log('tree-service proxyPrompt handleChange:', currentValue)
  //         const validateMessage = this.validateFileName(promptHandle, currentValue);
  //         if (validateMessage) {
  //             this.validateMessage = validateMessage;
  //             promptHandle.addValidateMessage(validateMessage);
  //         } else if (!validateMessage && this.validateMessage && this.validateMessage.value !== currentValue) {
  //             this.validateMessage = undefined;
  //             promptHandle.removeValidateMessage();
  //         }
  //     }
  //     if (!promptHandle.destroyed) {
  //         promptHandle.onChange(handleChange);
  //         promptHandle.onCommit(enterCommit);
  //         promptHandle.onBlur(blurCommit);
  //         promptHandle.onFocus(handleFocus);
  //         promptHandle.onDestroy(handleDestroy);
  //         promptHandle.onCancel(handleCancel);
  //     }
  //
  // }
  //
  //
  // async rename(item: ServerCompositeTreeNode | ServerTreeNode) {
  //
  //     this.proxyPrompt(await this.treeHandler.promptRename(item, item.displayName));
  // }

  initContextKey(dom: HTMLDivElement) {
    if (!this.serverContextKey) {
      this.serverContextKey = this.injector.get(ServerContextKey, [dom]);
    }
  }

  get contextMenuContextKeyService() {
    return this.serverContextKey.service;
  }

  handleContextMenu = (ev: React.MouseEvent, item: ServerCompositeTreeNode | ServerTreeNode) => {
    console.log('file-tree-model.service:--->');
    ev.stopPropagation();
    ev.preventDefault();

    const { levelType } = item;
    if (levelType !== 'server') {
      return;
    }

    const menus = this.contextMenuService.createMenu({
      id: ServerListIds.explorerServer, // ServerMenuIds.ServerExplorerDb,
      contextKeyService: this.contextMenuContextKeyService,
    });
    const menuNodes = menus.getMergedMenuNodes();
    menus.dispose();

    // 更新压缩节点对应的 ContextKey
    // this.setExplorerCompressedContextKey(node, activeUri);

    const { x, y } = ev.nativeEvent;

    this.ctxMenuRenderer.show({
      anchor: { x, y },
      menuNodes,
      args: [item],
    });
  };

  /**
   * 开关筛选输入框
   */
  public toggleFilterMode() {
    this._filterMode = !this.filterMode;
    this.onFilterModeChangeEmitter.fire(this.filterMode);
    //  this.fileContextKey.filesExplorerFilteredContext.set(this.filterMode);
    // 清理掉输入值
    if (this.filterMode === false) {
      // 退出时若需要做 filter 值清理以及聚焦操作
      //    this.commandService.executeCommand(FILE_COMMANDS.LOCATION.id);
    }
  }

  dispose() {
    this.disposableCollection.dispose();
  }
}

export class BasicTreeModel extends TreeModel {}
