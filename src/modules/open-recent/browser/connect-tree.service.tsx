import throttle from 'lodash/throttle';
//import pSeries from 'p-series';
import {
  CommandService,
  Deferred,
  Disposable,
  EDITOR_COMMANDS,
  Emitter,
  Event,
  FILE_COMMANDS,
  IApplicationService,
  IContextKeyService,
  ILogger,
  PreferenceService,
  pSeries,
  URI,
} from '@opensumi/ide-core-browser';
import { Autowired, Injectable, Injector, INJECTOR_TOKEN } from '@opensumi/di';
// import {
//     Tree,
//     ITree,
//     WatchEvent,
//     ITreeNodeOrCompositeTreeNode,
//     IWatcherEvent,
//     TreeNodeType,
// } from '@opensumi/ide-components';
import {
  ITree,
  ITreeNodeOrCompositeTreeNode,
  IWatcherEvent,
  Tree,
  TreeNodeType,
  WatchEvent,
} from '../../components/recycle-tree';
import { CorePreferences } from '@opensumi/ide-core-browser/lib/core-preferences';
import { LabelService } from '@opensumi/ide-core-browser/lib/services';
import { path } from '@opensumi/ide-utils';
import { FileChange, FileChangeType, FileStat, IFileServiceClient } from '@opensumi/ide-file-service/lib/common';
import { IIconService } from '@opensumi/ide-theme';
import { IWorkspaceService } from '@opensumi/ide-workspace';

import { IConnectTreeAPI, IConnectTreeAPIToken, IConnectTreeService, IServerTreeApiServiceToken } from '../common';
import { ServerEntity, ServerNode } from '../common/connect-tree-node.define';

import { ConnectContextkey } from './connect-contextkey';
import { ConnectTreeDecorationService } from './services/connect-tree-decoration.service';
import { IServerTreeNode } from '../../base/model/server-tree-node.model';
import { OpenParam } from '../../base/param/open-view.param';
import { ServerCommandIds } from '../../base/command/menu.command';
import { IBreadCrumbPart } from '../../data-view/common/navigation.types';
import { ServerTreeApiService } from './services/server-tree-api.service';

const { Path } = path;

export interface IMoveChange {
  source: FileChange;
  target: FileChange;
}

export interface ITreeIndent {
  indent: number;
  baseIndent: number;
}

export interface ISortNode {
  node: ServerNode | ServerEntity;
  path: string | URI;
}

export interface ICustomSearch {
  mode: boolean;
  title: string;
  node?: ServerNode;
}

@Injectable()
export class ConnectTreeService extends Tree implements IConnectTreeService {
  private static DEFAULT_FLUSH_FILE_EVENT_DELAY = 100;

  @Autowired(IConnectTreeAPIToken)
  private readonly connectTreeAPI: IConnectTreeAPI;

  @Autowired(CommandService)
  private readonly commandService: CommandService;

  @Autowired(IContextKeyService)
  private readonly contextKeyService: IContextKeyService;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @Autowired(CorePreferences)
  private readonly corePreferences: CorePreferences;

  @Autowired(PreferenceService)
  private readonly preferenceService: PreferenceService;

  @Autowired(LabelService)
  public readonly labelService: LabelService;

  @Autowired(ConnectTreeDecorationService)
  public readonly decorationService: ConnectTreeDecorationService;

  @Autowired(IFileServiceClient)
  private readonly fileServiceClient: IFileServiceClient;

  @Autowired(IIconService)
  public readonly iconService: IIconService;

  @Autowired(IApplicationService)
  private readonly appService: IApplicationService;

  @Autowired(INJECTOR_TOKEN)
  private readonly injector: Injector;

  @Autowired(ILogger)
  private readonly logger: ILogger;

  @Autowired(IServerTreeApiServiceToken)
  protected readonly serverTreeApiService: ServerTreeApiService;

  private connectContextKey: ConnectContextkey;

  private _cacheNodesMap: Map<string, ServerNode | ServerEntity> = new Map();

  // private _fileServiceWatchers: Map<string, IFileServiceWatcher> = new Map();

  // @lengbingzi 干啥用的,好像是刷新的时候，里面的路径不要刷新
  private _cacheIgnoreFileEvent: Map<string, FileChangeType> = new Map();
  private _cacheIgnoreFileEventOnce: URI | null;

  // 文件系统Change事件队列
  private _changeEventDispatchQueue = new Set<string>();

  private _roots: FileStat[] | null;

  // 是否进行文件事件监听标志值
  private _readyToWatch = false;
  // 等待监听的路径队列
  private _watchRootsQueue: URI[] = [];
  // @lengbingzi 文件夹紧凑模式
  private _isCompactMode: boolean;

  private willRefreshDeferred: Deferred<void> | null;

  private requestFlushEventSignalEmitter: Emitter<void> = new Emitter();

  private readonly onWorkspaceChangeEmitter = new Emitter<ServerNode>();
  private readonly onTreeIndentChangeEmitter = new Emitter<ITreeIndent>();
  private readonly onFilterModeChangeEmitter = new Emitter<boolean>();
  private readonly onCustomSearchChangeEmitter = new Emitter<ICustomSearch>();

  // 筛选模式开关
  private _filterMode = false;
  private _baseIndent: number;
  private _indent: number;
  private _customSearch: ICustomSearch;

  get filterMode() {
    return this._filterMode;
  }

  get customSearch() {
    return this._customSearch;
  }

  get baseIndent() {
    return this._baseIndent;
  }

  get indent() {
    return this._indent;
  }

  get onWorkspaceChange() {
    return this.onWorkspaceChangeEmitter.event;
  }

  get onTreeIndentChange() {
    return this.onTreeIndentChangeEmitter.event;
  }

  get onFilterModeChange() {
    return this.onFilterModeChangeEmitter.event;
  }

  get onCustomSearchChange() {
    return this.onCustomSearchChangeEmitter.event;
  }

  get willRefreshPromise() {
    return this.willRefreshDeferred?.promise;
  }

  get cacheFiles() {
    return Array.from(this._cacheNodesMap.values());
  }

  get requestFlushEventSignalEvent(): Event<void> {
    return this.requestFlushEventSignalEmitter.event;
  }

  get isCompactMode(): boolean {
    return this._isCompactMode;
  }

  set isCompactMode(value: boolean) {
    this._isCompactMode = value;
  }

  get contextKey() {
    return this.connectContextKey;
  }

  async init() {
    this._roots = await this.workspaceService.roots;

    this._baseIndent = this.corePreferences['explorer.fileTree.baseIndent'] || 8;
    this._indent = this.corePreferences['explorer.fileTree.indent'] || 8;
    this._isCompactMode = this.corePreferences['explorer.compactFolders'] as boolean;

    this.toDispose.push(
      this.workspaceService.onWorkspaceChanged((roots) => {
        // console.log('connect-tree.service--------->onWorkspaceChanged')
        this._roots = roots;
        // 切换工作区时更新文件树
        const newRootUri = new URI(roots[0].uri);
        const newRoot = new ServerNode(
          this,
          undefined,
          newRootUri,
          newRootUri.displayName,
          roots[0],
          undefined,
          this.connectTreeAPI.getReadableTooltip(newRootUri),
        );
        this._root = newRoot;
        this.onWorkspaceChangeEmitter.fire(newRoot);
        this.refresh();
      }),
    );

    // 当编辑内容发生改变时，刷新菜单，暂时用不到，估计是监听git状态的
    // this.toDispose.push(
    //   this.workspaceService.onWorkspaceFileExcludeChanged(() => {
    //     this.refresh();
    //   }),
    // );

    this.toDispose.push(
      Disposable.create(() => {
        this._cacheNodesMap.clear();
        this._roots = null;
      }),
    );

    this.toDispose.push(
      this.corePreferences.onPreferenceChanged((change) => {
        if (change.preferenceName === 'explorer.fileTree.baseIndent') {
          this._baseIndent = (change.newValue as number) || 8;
          this.onTreeIndentChangeEmitter.fire({
            indent: this.indent,
            baseIndent: this.baseIndent,
          });
        } else if (change.preferenceName === 'explorer.fileTree.indent') {
          this._indent = (change.newValue as number) || 8;
          this.onTreeIndentChangeEmitter.fire({
            indent: this.indent,
            baseIndent: this.baseIndent,
          });
        } else if (change.preferenceName === 'explorer.compactFolders') {
          this._isCompactMode = change.newValue as boolean;
          this.refresh();
        }
      }),
    );
  }

  initContextKey(dom: HTMLDivElement) {
    if (!this.connectContextKey) {
      this.connectContextKey = this.injector.get(ConnectContextkey, [dom]);
    }
  }

  public startWatchFileEvent() {
    this._readyToWatch = true;
    // this._watchRootsQueue.forEach(async (uri) => {
    //   await this.watchFilesChange(uri);
    // });
  }

  async resolveChildren(parent?: ServerNode | ServerNode) {
    let children: ServerNode[] = [];
    // 加载工作空间目录
    if (!parent) {
      if (!this._roots) {
        this._roots = await this.workspaceService.roots;
      }
      // console.log('resolveChildren------------->roots init', this._roots, this.isMultipleWorkspace)
      // this.serverRecentManagerService.test();
      if (this.isMultipleWorkspace) {
        const rootUri = new URI(this.workspaceService.workspace?.uri);
        let rootName = rootUri.displayName;
        rootName = rootName.slice(0, rootName.lastIndexOf('.'));
        const fileStat = {
          ...this.workspaceService.workspace,
          isDirectory: true,
        } as FileStat;
        const root = new ServerNode(
          this,
          undefined,
          rootUri,
          rootName,
          fileStat,
          undefined,
          this.connectTreeAPI.getReadableTooltip(rootUri),
        );
        // 创建Root节点并引入root文件目录
        this.cacheNodes([root]);
        this.root = root;
        return [root];
      } else {
        if (this._roots.length > 0) {
          // console.log(this._roots[0].uri)
          children = await (await this.connectTreeAPI.resolveFileChildren(this, this._roots[0])).children;
          // console.log('root init-->resolveChildren:', this._roots[0], children)
          children.forEach((child) => {
            // 根据workspace更新Root名称
            const rootName = this.workspaceService.getWorkspaceName(child.uri);
            if (rootName && rootName !== child.name) {
              child.updateMetaData({
                displayName: rootName,
              });
            }
          });
          // this.watchFilesChange(new URI(this._roots[0].uri));
          this.cacheNodes(children as ServerNode[]);
          this.root = children[0] as ServerNode;
          return children;
        }
      }
    } else {
      // 根节点加载子节点
      // if (ServerNode.isRoot(parent) && this.isMultipleWorkspace) {
      ////console.log('resolveChildren-------------1>child,parent:', parent)
      //   // 加载根目录
      //   const roots = await this.workspaceService.roots;
      //   for (const fileStat of roots) {
      //     const child = this.connectTreeAPI.toNode(
      //       this as ITree,
      //       fileStat,
      //       parent as ServerNode,
      //       this.workspaceService.getWorkspaceName(new URI(fileStat.uri)),
      //     );
      //     this.watchFilesChange(new URI(fileStat.uri));
      //     children = children.concat(child);
      //   }
      //   this.cacheNodes(children as (ServerNode)[]);
      //   return children;
      // }
      // console.log('resolveChildren-------------2>child,parent:', parent, ServerNode.isRoot(parent))
      // 加载子目录
      // 加载server
      let data;
      if (ServerNode.isRoot(parent)) {
        // console.log('resolveChildren-------------3>child:root')
        data = await this.connectTreeAPI.resolveServerChildren(this, (parent as ServerNode).uri.toString(), parent);
        // const children = data.children;
        // this.cacheNodes(children)
        // return children;
      } else if (parent.levelType === 'server') {
        data = await this.connectTreeAPI.resolveServerChildren(this, (parent as ServerNode).serverTreeNode!, parent);
        // return data.children;
      } else if (parent.levelType === 'node') {
        // 加载db下的节点，比如table、function、view
        // console.log('resolveChildren-------------5>getChild:node')
        data = await this.connectTreeAPI.resolveServerChildren(this, (parent as ServerNode).serverTreeNode!, parent);
        //  return data.children;
      }
      // console.log('resolveChildren-------------6>data:child', data)
      if (data && data.children) {
        const children = data.children;
        this.cacheNodes(children);
        return children;
      }
    }
    return [];
  }

  // async watchFilesChange(uri: URI) {
  //   if (!this._readyToWatch) {
  //     this._watchRootsQueue.push(uri);
  //     return;
  //   }
  //   const watcher = await this.fileServiceClient.watchFileChanges(uri);
  //   this.toDispose.push(watcher);
  //   this.toDispose.push(
  //     watcher.onFilesChanged((changes: FileChange[]) => {
  //       this.onFilesChanged(changes);
  //     }),
  //   );
  //   this._fileServiceWatchers.set(uri.toString(), watcher);
  // }

  private isContentFile(node: any | undefined) {
    return !!node && 'filestat' in node && !node.filestat.isDirectory;
  }

  private isFileContentChanged(change: FileChange): boolean {
    return change.type === FileChangeType.UPDATED && this.isContentFile(this.getNodeByPathOrUri(change.uri));
  }

  private getAffectedChanges(changes: FileChange[]): FileChange[] {
    const affectChange: FileChange[] = [];
    for (const change of changes) {
      const isFile = this.isFileContentChanged(change);
      if (!isFile) {
        affectChange.push(change);
      }
    }
    return affectChange;
  }

  private isRootAffected(changes: FileChange[]): boolean {
    if (this._roots) {
      return changes.some(
        (change) =>
          change.type > FileChangeType.UPDATED &&
          this._roots &&
          this._roots.find((root) => change.uri.indexOf(root.uri) >= 0),
      );
    }
    return false;
  }

  // private async onFilesChanged(changes: FileChange[]) {
  //   // 过滤掉内置触发的事件
  //   if (this._cacheIgnoreFileEventOnce) {
  //     let filtered = false;
  //     changes = changes.filter((change) => {
  //       if (this._cacheIgnoreFileEventOnce!.isEqualOrParent(new URI(change.uri))) {
  //         filtered = true;
  //         return false;
  //       }
  //       return true;
  //     });
  //     if (filtered) {
  //       this._cacheIgnoreFileEventOnce = null;
  //     }
  //   }
  //   changes = changes.filter((change) => {
  //     if (!this._cacheIgnoreFileEvent.has(change.uri)) {
  //       return true;
  //     } else {
  //       if (this._cacheIgnoreFileEvent.get(change.uri) === change.type) {
  //         this._cacheIgnoreFileEvent.delete(change.uri);
  //         return false;
  //       }
  //       return true;
  //     }
  //   });
  //   // 处理除了删除/添加/移动事件外的异常事件
  //   if (!(await this.refreshAffectedNodes(this.getAffectedChanges(changes))) && this.isRootAffected(changes)) {
  //     this.refresh();
  //   }
  // }

  public async getFileTreeNodePathByUri(uri: URI) {
    // 软链文件在这种情况下无法获取到相对路径
    if (!uri) {
      return;
    }
    let rootStr;
    if (!this.isMultipleWorkspace) {
      rootStr = this.workspaceService.workspace?.uri;
      if (rootStr) {
        const rootUri = new URI(rootStr);
        if (rootUri.isEqualOrParent(uri)) {
          return new Path(this.root?.path || '').join(rootUri.relative(uri)!.toString()).toString();
        }
      }
    } else {
      if (!this._roots) {
        this._roots = await this.workspaceService.roots;
      }
      rootStr = this._roots.find((root) => new URI(root.uri).isEqualOrParent(uri))?.uri;
      if (rootStr) {
        const rootUri = new URI(rootStr);
        if (rootUri.isEqualOrParent(uri)) {
          // 多工作区模式下，路径需要拼接项目名称
          return new Path(this.root?.path || '/')
            .join(rootUri.displayName)
            .join(rootUri.relative(uri)!.toString())
            .toString();
        }
      }
    }
  }

  // @lengbingzi 这个可能有问题，需要更改，如果最后弃用，需要注释
  // public async addNode(node: ServerNode, newName: string, type: TreeNodeType) {
  //   let tempFileStat: FileStat;
  //   let tempName: string;
  //   const namePaths = Path.splitPath(newName);
  //   // 处理a/b/c/d这类目录
  //   if (namePaths.length > 1) {
  //     let tempUri = node.uri;
  //     if ((await this.appService.backendOS) === OS.Type.Windows) {
  //       // Windows环境下会多触发一个UPDATED事件
  //       this._cacheIgnoreFileEvent.set(tempUri.toString(), FileChangeType.UPDATED);
  //     }
  //     for (const path of namePaths) {
  //       tempUri = tempUri.resolve(path);
  //       this._cacheIgnoreFileEvent.set(tempUri.toString(), FileChangeType.ADDED);
  //     }
  //     if (!this.isCompactMode || ServerNode.isRoot(node)) {
  //       tempName = namePaths[0];
  //     } else {
  //       if (type === TreeNodeType.CompositeTreeNode) {
  //         tempName = newName;
  //       } else {
  //         tempName = namePaths.slice(0, namePaths.length - 1).join(Path.separator);
  //       }
  //     }
  //   } else {
  //     tempName = newName;
  //     if ((await this.appService.backendOS) === OS.Type.Windows) {
  //       // Windows环境下会多触发一个UPDATED事件
  //       this._cacheIgnoreFileEvent.set(node.uri.toString(), FileChangeType.UPDATED);
  //     }
  //     this._cacheIgnoreFileEvent.set(node.uri.resolve(newName).toString(), FileChangeType.ADDED);
  //   }
  //   tempFileStat = {
  //     uri: node.uri.resolve(tempName).toString(),
  //     isDirectory: type === TreeNodeType.CompositeTreeNode || namePaths.length > 1,
  //     isSymbolicLink: false,
  //     lastModification: new Date().getTime(),
  //   };
  //   const addNode = await this.connectTreeAPI.toRootNode(this as ITree, tempFileStat, node as ServerNode, tempName);
  //   if (addNode) {
  //     this.cacheNodes([addNode]);
  //     // 节点创建失败时，不需要添加
  //     this.dispatchWatchEvent(node.path, {type: WatchEvent.Added, node: addNode, id: node.id});
  //   } else {
  //     // 新建失败时移除该缓存
  //     this._cacheIgnoreFileEvent.delete(tempFileStat.uri);
  //   }
  //   return addNode;
  // }

  /**
   * @author:lengbingzi
   * 新增serverNode
   */
  public async addServerNode(parentNode: ServerNode | ServerNode | undefined, newServer: IServerTreeNode) {
    if (!parentNode) {
      parentNode = this.root as ServerNode;
    }
    const addNode = await this.connectTreeAPI.toServerNode(this as ITree, newServer, undefined, parentNode);

    this.dispatchWatchEvent(parentNode.path, { type: WatchEvent.Added, node: addNode, id: parentNode.id });

    return addNode;
  }

  /**
   * @author:lengbingzi
   * 重命名
   * @param node
   * @param newName
   */
  public async rename(node: ServerNode | ServerEntity, newName: string): Promise<boolean> {
    // let serverInfo = node.getServerInfo;
    let result = await this.serverTreeApiService.renameTreeNode(node.getServerInfo()!, node.serverTreeNode!, newName);
    if (result && result.success) {
      return true;
    }
    return false;
  }

  // 用于精准删除节点，软连接目录下的文件删除
  public async deleteAffectedNodeByPath(path: string) {
    const node = this.getNodeByPathOrUri(path);
    if (node && node.parent) {
      this.removeNodeCacheByPath(node.path);
      // 压缩模式下，刷新父节点目录即可
      // if (this.isCompactMode && !notRefresh) {
      ////console.log('deleteAffectedNodeByPath--->1')
      //   this.refresh(node.parent as ServerNode);
      // } else {
      // console.log('deleteAffectedNodeByPath--->1')
      this._cacheIgnoreFileEvent.set(node.path, FileChangeType.DELETED);
      this.dispatchWatchEvent(node.parent.path, { type: WatchEvent.Removed, path: node.path });
      //  }
    }
  }

  // public async deleteAffectedNodes(uris: URI[], changes: FileChange[] = []) {
  //   const nodes: (ServerNode | ServerEntity)[] = [];
  //   for (const uri of uris) {
  //     const node = this.getNodeByPathOrUri(uri);
  //     if (node) {
  //       nodes.push(node as ServerNode | ServerEntity);
  //     }
  //   }
  //   for (const node of nodes) {
  //     // 一旦更新队列中已包含该文件，临时剔除删除事件传递
  //     if (!node?.parent || this._changeEventDispatchQueue.has(node?.parent.path)) {
  //       continue;
  //     }
  //     await this.deleteAffectedNodeByPath(node.path);
  //   }
  //   return changes.filter((change) => change.type !== FileChangeType.DELETED);
  // }

  private dispatchWatchEvent(path: string, event: IWatcherEvent) {
    const watcher = this.root?.watchEvents.get(path);
    if (watcher && watcher.callback) {
      watcher.callback(event);
    }
  }

  async refreshAffectedNodes(changes: FileChange[]) {
    const nodes = await this.getAffectedNodes(changes);
    for (const node of nodes) {
      await this.refresh(node);
    }
    return nodes.length !== 0;
  }

  private async getAffectedNodes(changes: FileChange[]): Promise<ServerNode[]> {
    const nodes: ServerNode[] = [];
    for (const change of changes) {
      const uri = new URI(change.uri);
      const node = this.getNodeByPathOrUri(uri);
      if (node && node.parent) {
        nodes.push(node.parent as ServerNode);
      }
    }
    return nodes;
  }

  ignoreFileEvent(uri: URI, type: FileChangeType) {
    this._cacheIgnoreFileEvent.set(uri.toString(), type);
  }

  ignoreFileEventOnce(uri: URI | null) {
    this._cacheIgnoreFileEventOnce = uri;
  }

  cacheNodes(nodes: (ServerNode | ServerNode | ServerEntity)[]) {
    // 切换工作区的时候需清理
    nodes.map((node) => {
      // node.path 不会重复，node.uri在软连接情况下可能会重复
      this._cacheNodesMap.set(node.path, node);
    });
  }

  reCacheNode(node: ServerNode | ServerNode | ServerEntity, prePath: string) {
    if (this.root?.watchEvents.has(prePath)) {
      this.root?.watchEvents.set(node.path, this.root?.watchEvents.get(prePath)!);
    }
    this._cacheNodesMap.set(node.path, node);
  }

  removeNodeCacheByPath(path: string) {
    if (this._cacheNodesMap.has(path)) {
      this._cacheNodesMap.delete(path);
    }
  }

  private isFileURI(str: string) {
    return /^file:\/\//.test(str);
  }

  /**
   *
   * @param pathOrUri 路径或者URI对象
   * @param compactMode 是否开启压缩模式查找
   *
   */
  getNodeByPathOrUri(pathOrUri: string | URI) {
    let path: string | undefined;
    let pathURI: URI | undefined;
    if (typeof pathOrUri === 'string' && !this.isFileURI(pathOrUri)) {
      return this._cacheNodesMap.get(pathOrUri);
    }
    if (typeof pathOrUri !== 'string') {
      pathURI = pathOrUri;
      pathOrUri = pathOrUri.toString();
    } else if (this.isFileURI(pathOrUri)) {
      pathURI = new URI(pathOrUri);
    }
    if (this.isFileURI(pathOrUri) && !!pathURI) {
      let rootStr;
      if (!this.isMultipleWorkspace) {
        rootStr = this.workspaceService.workspace?.uri;
      } else if (this._roots) {
        rootStr = this._roots.find((root) => new URI(root.uri).isEqualOrParent(pathURI!))?.uri;
      }
      if (this.root && rootStr) {
        const rootUri = new URI(rootStr);
        if (rootUri.isEqualOrParent(pathURI)) {
          path = new Path(this.root.path).join(rootUri.relative(pathURI)!.toString()).toString();
        }
      }
    }

    if (path) {
      // 压缩模式下查找不到对应节点时，需要查看是否已有包含的文件夹存在
      // 如当收到的变化是 /root/test_folder/test_file，而当前缓存中的路径只有/root/test_folder/test_folder2的情况
      // 需要用当前缓存路径校验是否存在包含关系，这里/root/test_folder/test_folder2与/root/test_folder存在路径包含关系
      // 此时应该重载/root下的文件，将test_folder目录折叠并清理缓存
      if (this.isCompactMode && !this._cacheNodesMap.has(path)) {
        const allNearestPath = Array.from(this._cacheNodesMap.keys()).filter((cache) => cache.indexOf(path!) >= 0);
        let nearestPath;
        for (const nextPath of allNearestPath) {
          const depth = Path.pathDepth(nextPath);
          if (nearestPath) {
            if (depth < nearestPath.depth) {
              nearestPath = {
                path: nextPath,
                depth,
              };
            }
          } else {
            nearestPath = {
              path: nextPath,
              depth,
            };
          }
        }
        if (nearestPath) {
          return this._cacheNodesMap.get(nearestPath.path);
        }
      }
      return this._cacheNodesMap.get(path);
    }
  }

  sortComparator(a: ITreeNodeOrCompositeTreeNode, b: ITreeNodeOrCompositeTreeNode) {
    if (a.constructor === b.constructor) {
      if (a instanceof ServerNode && b instanceof ServerNode) {
        // 针对node类型具有排序字段的，特殊处理
        if (a.sort && b.sort) {
          return a.sort === b.sort ? 0 : a.sort > b.sort ? -1 : 1;
        }
      }
      // numeric 参数确保数字为第一排序优先级
      return a.name.localeCompare(b.name, 'en', { numeric: true }) as any;
    }
    return a.type === TreeNodeType.CompositeTreeNode ? -1 : b.type === TreeNodeType.CompositeTreeNode ? 1 : 0;
  }

  get contextMenuContextKeyService() {
    if (this.connectContextKey) {
      return this.connectContextKey.service;
    } else {
      return this.contextKeyService;
    }
  }

  // public reWatch() {
  //   // 重连时重新监听文件变化
  //   for (const [uri, watcher] of this._fileServiceWatchers) {
  //     watcher.dispose();
  //     this.watchFilesChange(new URI(uri));
  //   }
  // }

  get isMultipleWorkspace(): boolean {
    return !!this.workspaceService.workspace && !this.workspaceService.workspace.isDirectory;
  }

  getDisplayName(uri: URI) {
    return this.workspaceService.getWorkspaceName(uri);
  }

  // 只能
  async immediateRefresh(node: ServerNode | ServerEntity, current = false) {
    if (!node) {
      return;
    }
    if (current && ServerNode.is(node)) {
      await (node as ServerNode).refresh([node.path]);
      // const path = node.path;
      // const watcher = this.root?.watchEvents.get(path);
      // if (watcher && typeof watcher.callback === 'function') {
      //   //console.log('connect-tree.service---->路径：', path, '执行刷新')
      //   await watcher.callback({type: WatchEvent.Changed, path});
      // }
    } else if (node.parent) {
      let parentNode = node.parent as ServerNode;
      await parentNode.refresh([parentNode.path]);
    }
  }

  /**
   * 服务下的node节点被删除时，进行调用
   * @param path
   */
  async refreshByPathForServerNode(path: string) {
    let treeNode = this.getNodeByPathOrUri(path);
    if (treeNode) {
      this.refresh(treeNode.parent as ServerNode);
    }
  }

  /**
   * 刷新指定下的所有子节点
   * @lengbingzi 啥意思，需要研究下
   * 传入的节点会自动转换为父类
   */
  async refresh(node: ServerNode | ServerEntity = this.root as ServerNode) {
    //console.log('connect-tree.service refresh----进入刷新----------------------->');
    // 如果正在刷新，就不要创建新的 Defer
    // 否则会导致下面的 callback 闭包 resolve 的仍然是之前捕获的旧 defer
    if (!this.willRefreshDeferred) {
      this.willRefreshDeferred = new Deferred();
    }
    if (!node) {
      return;
    }
    if (!ServerNode.is(node) && node.parent) {
      node = node.parent as ServerNode;
    }
    if (ServerNode.isRoot(node)) {
      // 根目录刷新时情况忽略队列
      this._cacheIgnoreFileEvent.clear();
    }

    // 队列化刷新动作减少更新成本
    this._changeEventDispatchQueue.add(node.path);
    this.doHandleQueueChange();
  }

  private doHandleQueueChange = throttle(
    async () => {
      try {
        // console.log('我应该开始执行-----doHandleQueueChange,询问是否此时可进行刷新事件')
        // 询问是否此时可进行刷新事件
        await this.requestFlushEventSignalEmitter.fireAndAwait();
        await this.flushEventQueue();
      } catch (error) {
        this.logger.error('flush file change event queue error:', error);
      } finally {
        this.onNodeRefreshedEmitter.fire();
        this.willRefreshDeferred?.resolve();
        this.willRefreshDeferred = null;
      }
    },
    ConnectTreeService.DEFAULT_FLUSH_FILE_EVENT_DELAY,
    {
      leading: true,
      trailing: true,
    },
  );

  /**
   * 将文件排序并删除多余文件（指已有父文件夹将被删除）
   */
  public sortPaths(_paths: (string | URI)[]) {
    const paths = _paths.slice();
    const nodes = paths
      .map((path) => ({
        node: this.getNodeByPathOrUri(path),
        path,
      }))
      .filter((node) => node && !!node.node) as ISortNode[];

    nodes.sort((pathA, pathB) => {
      // 直接获取节点深度比通过path取深度更可靠
      const pathADepth = pathA.node?.depth || 0;
      const pathBDepth = pathB.node?.depth || 0;
      return pathADepth - pathBDepth;
    });

    const roots = [] as ISortNode[];
    for (let index = nodes.length - 1; index >= 0; index--) {
      // 从后往前遍历整个列表
      const later = nodes[index];
      let canRemove = false;
      for (let j = 0; j < index; j++) {
        const former = nodes[j];
        // 如果树的某个父节点包括了当前项
        if (ServerNode.is(former) && later.node.path.startsWith(former.node.path)) {
          canRemove = true;
        }
      }
      if (!canRemove) {
        roots.push(later);
      }
    }
    return roots;
  }

  // aa
  // aa:a
  // bb:b

  public sortNodes(nodes: (ServerNode | ServerEntity)[]) {
    nodes.sort((pathA, pathB) => {
      // 直接获取节点深度比通过path取深度更可靠
      const pathADepth = pathA?.depth || 0;
      const pathBDepth = pathB?.depth || 0;
      return pathADepth - pathBDepth;
    });
    let roots = [] as (ServerNode | ServerEntity)[];
    for (let index = nodes.length - 1; index >= 0; index--) {
      const later = nodes[index];
      let canRemove = false;
      for (let j = 0; j < index; j++) {
        const former = nodes[j];
        // 如果树的某个父节点包括了当前项
        if (ServerNode.is(former) && later.path.startsWith(former.path)) {
          canRemove = true;
        }
        //console.log('former:', former.path, '\nlater:', later.path, ';canRemove:', canRemove);
      }
      if (!canRemove) {
        roots.push(later);
      }
    }
    return roots;
  }

  public flushEventQueue = () => {
    // console.log('flushEventQueue--->', this._changeEventDispatchQueue)
    if (!this._changeEventDispatchQueue || this._changeEventDispatchQueue.size === 0) {
      return;
    }

    const queue = Array.from(this._changeEventDispatchQueue);

    const effectedRoots = this.sortPaths(queue);

    const promise = pSeries(
      effectedRoots.map((root) => async () => {
        const path = root.node.path;
        const watcher = this.root?.watchEvents.get(path);
        if (watcher && typeof watcher.callback === 'function') {
          // console.log('connect-tree.service---->路径：', path, '执行刷新')
          await watcher.callback({ type: WatchEvent.Changed, path });
        }
      }),
    );
    // 重置更新队列
    this._changeEventDispatchQueue.clear();
    return promise;
  };

  public getBreadCrumb(path: string): IBreadCrumbPart[] {
    if (!path) {
      return [];
    }
    let treeNode = this.getNodeByPathOrUri(path);
    let breadCrumbs: IBreadCrumbPart[] = [];
    while (true) {
      if (!treeNode) {
        return [];
      }
      let item: IBreadCrumbPart = {
        name: treeNode.nodeName,
        serverType: treeNode.serverType,
        nodeType: treeNode.nodeType,
      };
      breadCrumbs.unshift(item);
      if (treeNode.levelType === 'server') {
        break;
      }
      treeNode = treeNode.parent as ServerNode | ServerEntity;
    }

    return breadCrumbs;
  }

  /**
   * 打开文件
   * @param uri
   */
  public openFile(node: ServerEntity | ServerNode) {
    const serverNode = node.serverTreeNode!;
    //const db = serverNode.db ? serverNode.db : '';
    let openParam: OpenParam = {
      nodeName: node.nodeName,
      nodeValue: serverNode!.nodeValue,
      serverId: node.getServerInfo()!.serverId!,
      serverType: node.serverType!,
      db: node.dbName,
      //dbName: node.dbName,
      schema: serverNode!.schema,
      nodeType: node.nodeType!,
      option: 'open',
      path: node.path,
      extra: serverNode.extra,
    };
    //console.log('connect-tree.serveice opfile->', openParam)
    // 当打开模式为双击同时预览模式生效时，默认单击为预览文件
    const preview = this.preferenceService.get<boolean>('editor.previewMode');
    this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
      disableNavigate: true,
      preview,
    });
  }

  /**0
   * 打开并固定文件
   * @param uri
   */
  public openAndFixedFile(node: ServerEntity | ServerNode) {
    const serverNode = node.serverTreeNode!;
    //const db = serverNode.db ? serverNode.db : '';
    let openParam: OpenParam = {
      nodeName: node.nodeName,
      nodeValue: serverNode.nodeValue,
      serverId: node.getServerInfo()!.serverId!,
      serverType: node.serverType!,
      db: node.dbName,
      //dbName: node.dbName,
      schema: serverNode!.schema,
      nodeType: node.nodeType!,
      option: 'open',
      path: node.path,
      extra: serverNode.extra,
    };
    //console.log('connect-tree.serveice openAndFixedFile->', openParam)
    this.commandService.executeCommand(ServerCommandIds.openDataView.id, openParam, {
      disableNavigate: true,
      preview: false,
      focus: true,
    });
  }

  /**
   * 在侧边栏打开文件
   * @param {URI} uri
   * @memberof FileTreeService
   */
  public openToTheSide(uri: URI) {
    this.commandService.executeCommand(EDITOR_COMMANDS.OPEN_RESOURCE.id, uri, {
      disableNavigate: true,
      split: 4 /** right */,
    });
  }

  /**
   * 比较选中的两个文件
   * @param original
   * @param modified
   */
  public compare(original: URI, modified: URI) {
    this.commandService.executeCommand(EDITOR_COMMANDS.COMPARE.id, {
      original,
      modified,
    });
  }

  /**
   * 开关筛选输入框
   */
  public toggleFilterMode() {
    this._filterMode = !this.filterMode;
    this.onFilterModeChangeEmitter.fire(this.filterMode);
    this.connectContextKey.filesExplorerFilteredContext.set(this.filterMode);
    // 清理掉输入值
    if (this.filterMode === false) {
      // 退出时若需要做 filter 值清理以及聚焦操作
      this.commandService.executeCommand(FILE_COMMANDS.LOCATION.id);
    }
  }

  public openFilterQuery(node: ServerNode) {
    // console.log('node->', node);
    //if(this._customSearch && this)
    let title = node.getServerInfo().serverName;
    if (node.nodeType !== 'server') {
      title = title + ':' + node.nodeName;
    }
    this._customSearch = { mode: true, title, node };
    this.serverTreeApiService.setFilterSearch('');
    this.onCustomSearchChangeEmitter.fire(this.customSearch);
  }

  public filterQuery(pattern: string) {
    const filterNode = this.customSearch.node;
    this.serverTreeApiService.setFilterSearch(pattern);
    this.refresh(filterNode);
  }

  public closeFilterQuery() {
    //if(this._customSearch && this)
    this._customSearch = { mode: false, title: '', node: null };
    this.serverTreeApiService.setFilterSearch('');
    this.onCustomSearchChangeEmitter.fire(this.customSearch);
  }

  public locationToCurrentFile = () => {
    this.commandService.executeCommand(FILE_COMMANDS.LOCATION.id);
  };
}
