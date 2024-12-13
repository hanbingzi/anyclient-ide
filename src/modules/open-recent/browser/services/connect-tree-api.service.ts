import { Autowired, Injectable } from '@opensumi/di';
//import { ITree } from '@opensumi/ide-components';
import { path } from '@opensumi/ide-utils';
import { CorePreferences } from '@opensumi/ide-core-browser';
import { CommandService, URI } from '@opensumi/ide-core-common';
import { FileStat } from '@opensumi/ide-file-service';
import { IFileServiceClient } from '@opensumi/ide-file-service/lib/common';
import { IMessageService } from '@opensumi/ide-overlay';
import { IWorkspaceEditService } from '@opensumi/ide-workspace-edit';

import {
  IConnectTreeAPI,
  IConnectTreeService,
  IOpenRecentStatService,
  IOpenRecentStatServiceToken,
  IServerTreeApiServiceToken,
} from '../../common';
import { ServerEntity, ServerNode } from '../../common/connect-tree-node.define';
import { ITree } from '../../../components/recycle-tree';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../../base/model/server-tree-node.model';
import { OpenRecentInfo, ServerInfo } from '../../../local-store-db/common/model.define';
import {
  IOpenRecentDao,
  IOpenRecentDaoPath,
  IOpenRecentService,
  IOpenRecentServiceToken,
  IServerDao,
  IServerDaoPath,
} from '../../../local-store-db/common';
import { isNotEmpty } from '../../../base/utils/object-util';
import { IChildrenResult, ServerTreeApiService } from './server-tree-api.service';

const { Path } = path;

@Injectable()
export class ConnectTreeAPI implements IConnectTreeAPI {
  @Autowired(IFileServiceClient)
  protected fileServiceClient: IFileServiceClient;

  @Autowired(IWorkspaceEditService)
  private workspaceEditService: IWorkspaceEditService;

  @Autowired(CommandService)
  private commandService: CommandService;

  @Autowired(CorePreferences)
  private readonly corePreferences: CorePreferences;

  // @Autowired(IDialogService)
  // private readonly dialogService: IDialogService;

  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IOpenRecentDaoPath)
  protected readonly openRecentDao: IOpenRecentDao;

  @Autowired(IServerDaoPath)
  protected readonly serverDao: IServerDao;

  @Autowired(IServerTreeApiServiceToken)
  protected readonly serverTreeApiService: ServerTreeApiService;

  @Autowired(IOpenRecentServiceToken)
  private readonly openRecentService: IOpenRecentService;

  @Autowired(IOpenRecentStatServiceToken)
  private readonly openRecentStatService: IOpenRecentStatService;

  private cacheFileStat: Map<string, FileStat> = new Map();
  private cacheNodeID: Map<string, number> = new Map();
  //记录节点是否在已经成功加载过，因为每次刷新都会把节点状态改为init
  //记录的路径都是有哪些
  private cacheSuccessLoadNode = new Set<string>();

  private userhomePath: URI;

  //如果关闭连接，需要删除成功加载的数据
   async clearSuccessLoadNode(path: string) {
    const newCacheNode = new Set<string>();
    for(const node of this.cacheSuccessLoadNode){
      if(node!==path && !node.startsWith(path)){
        newCacheNode.add(node);
      }
    }
    this.cacheSuccessLoadNode = newCacheNode;
  }

  async resolveFileChildren(
    tree: IConnectTreeService,
    path: string | FileStat,
    parent?: ServerNode,
    compact?: boolean,
  ) {
    let file: FileStat | undefined;
    if (!this.userhomePath) {
      const userhome = await this.fileServiceClient.getCurrentUserHome();
      if (userhome) {
        this.userhomePath = new URI(userhome.uri);
      }
    }
    if (typeof path === 'string') {
      file = await this.fileServiceClient.getFileStat(path);
    } else {
      file = await this.fileServiceClient.getFileStat(path.uri);
    }
    //console.log('resolveFileChildren--------><<<<<<<<<<<<')
    if (file) {
      //如果只有一个文件夹，则此文件夹和父文件夹显示为一个节点
      if (file.children?.length === 1 && file.children[0].isDirectory && compact && parent instanceof ServerNode) {
        const parentURI = new URI(file.children[0].uri);
        if (!!parent && parent.parent) {
          const parentName = (parent.parent as ServerNode).uri.relative(parentURI)?.toString();
          if (parentName && parentName !== parent.name) {
            const prePath = parent.path;
            tree.removeNodeCacheByPath(prePath);
            parent.updateMetaData({
              name: parentName,
              displayName: parentName,
              uri: parentURI,
              fileStat: file.children[0],
              tooltip: this.getReadableTooltip(parentURI),
            });
            // Re-Cache Node
            tree.reCacheNode(parent, prePath);
          }
        }
        return await this.resolveFileChildren(tree, file.children[0].uri, parent, compact);
      } else {
        // 为文件树节点新增isInSymbolicDirectory属性，用于探测节点是否处于软链接文件中
        const filestat = {
          ...file,
          isInSymbolicDirectory: parent?.filestat.isSymbolicLink || parent?.filestat.isInSymbolicDirectory,
        };
        return {
          children: this.toNodes(tree, filestat, parent),
          filestat,
        };
      }
    } else {
      return {
        children: [],
        filestat: null,
      };
    }
  }

  async resolveServerChildren(tree: IConnectTreeService, path: string | IServerTreeNode, parent?: ServerNode) {
    // let file: FileStat | undefined;
    // if (!this.userhomePath) {
    //   const userhome = await this.fileServiceClient.getCurrentUserHome();
    //   if (userhome) {
    //     this.userhomePath = new URI(userhome.uri);
    //   }
    // }
    //console.log('connect-tree-api>resolveChild:')
    //工作空间目录查询,查询server
    if (typeof path === 'string') {
      let file: FileStat | undefined = await this.fileServiceClient.getFileStat(path);
      //console.log('connect-tree-api resolveServerChildren root path:', path, file.children)
      let fileMap = new Map<string, FileStat>();
      if (file && file.children) {
        file.children.forEach((value) => {
          let fileName = new URI(value.uri).displayName;
          fileMap.set(fileName, value);
        });
      }
      const rootUri = new URI(path);
      const serverNodeList = await this.findRecentOpen(rootUri.path.toString());
      //console.log('connect-tree-api>resolveChild:', serverNodeList)
      const children = serverNodeList.map((value) => {
        return this.toServerNode(tree, value, fileMap.get(value.nodeName), parent);
      });
      //console.log('connect-tree-api resolveServerChildren root children',children)
      return {
        children: children,
      };
    } else {
      //调用 serverClientApi查询子项，
      //console.log('connect-tree-api --resolveServerChildren--请求后台，刷新节点-->', parent.path)
      if (
        //init 说明未初始化，需要双击服务，进行确认打开，才可以连接mysql等服务
        path.nodeStat === 'init' ||
        path.nodeStat === 'error'
      ) {
        return null;
      }
      let childrenResult:IChildrenResult={success:true,tree:[]};
      if (path.children && path.children.length > 0) {
        childrenResult.tree = path.children;
      } else {
        let serverInfo = (parent as ServerNode).getServerInfo()!;
        //console.log('connect-tree-api --resolveServerChildren-->mysql:刷新子节点：', ';serverInfo:', serverInfo);
         childrenResult = await this.serverTreeApiService.resolveChildren(serverInfo, path);
      }
      return this.resolveQueryResult(childrenResult, tree, parent as ServerNode);
    }
    return null;
  }

  async findRecentOpen(workspace: string): Promise<IServerTreeNode[]> {
    const openRecentList = await this.openRecentDao.findByWorkspace(workspace);
    //console.log('findRecentOpen--->',workspace,openRecentList)
    if (!openRecentList || openRecentList.length === 0) {
      return [];
    }
    let serverIds: string[] = openRecentList.map((value) => value.serverId);
    let serverList: ServerInfo[] = await this.serverDao.findByIds(serverIds);
    let openRecentMap = new Map<string, OpenRecentInfo>();
    openRecentList.forEach((value) => {
      openRecentMap.set(value.serverId, value);
    });
    const treeNodes: IServerTreeNode[] = serverList.map((server) => {
      const openRecent = openRecentMap.get(server.serverId!);

      return ServerTreeNodeUtils.convertServer(server, openRecent);
    });

    return treeNodes;
  }

  resolveQueryResult(queryResult: IChildrenResult, tree: ITree, parent: ServerNode) {
    if (queryResult && queryResult.success) {
      if (parent.nodeStat === 'loading') {
        parent.updateNodeStat('success');
        if (!this.cacheSuccessLoadNode.has(parent.path)) {
          this.cacheSuccessLoadNode.add(parent.path);
        }
      }
      if (parent.levelType === 'server') {
        //成功打开过的，排序到上面
        this.openRecentStatService.pushOpenConnect(parent.serverInfo!, parent.openRecentId);
      }
      const children: (ServerNode | ServerEntity)[] = queryResult.tree.map((value) =>
        this.toServerNode(tree, value, undefined, parent),
      );
      return {
        children,
      };
    } else {
      if (parent.nodeStat === 'loading') {
        parent.updateNodeStat('error');
      }
      //重新加载失败，如果以前有成功的标记，需要删除。
      if (this.cacheSuccessLoadNode.has(parent.path)) {
        this.cacheSuccessLoadNode.delete(parent.path);
      }
      // const errorMessage = `加载失败，错误编码：${queryResult.errorCode}; 错误原因：${queryResult.errorMessage}`;
      // this.messages.error(errorMessage, [
      //   'ok',
      // ]);
      //  console.log('此处应弹出错误信息')
      return null;
    }
  }

  // processTreeChild(serverTreeNodes: IServerTreeNode[], treeNodes: (ServerNode | ServerEntity)[], tree: ITree, parent?: ServerNode,) {
  //   for (let item of serverTreeNodes) {
  //     let treeNode = this.toServerNode(tree, undefined, item, parent)
  //     if (item.children && item.children.length > 0) {
  //       const children: (ServerNode | ServerEntity)[] = []
  //       this.processTreeChild(item.children, children, tree, treeNode as ServerNode);
  //     }
  //     treeNodes.push(treeNode)
  //   }
  // }

  async resolveNodeByPath(tree: ITree, path: string, parent?: ServerNode) {
    const file = await this.fileServiceClient.getFileStat(path);
    if (file) {
      return this.toRootNode(tree, file, parent);
    }
  }

  async resolveFileStat(uri: URI) {
    return await this.fileServiceClient.getFileStat(uri.toString());
  }

  toNodes(tree: ITree, filestat: FileStat, parent?: ServerNode) {
    // 如果为根目录，则返回其节点自身，否则返回子节点
    if (!parent) {
      return [this.toRootNode(tree, filestat, parent)];
    } else {
      if (filestat.children) {
        return filestat.children.map((child) => this.toRootNode(tree, child, parent));
      }
    }
    return [];
  }

  /**
   * 转换FileStat对象为TreeNode
   */
  toRootNode(tree: ITree, filestat: FileStat, parent?: ServerNode, presetName?: string): ServerNode {
    const uri = new URI(filestat.uri);
    // 这里的name主要用于拼接节点路径，即path属性, 必须遵循路径原则
    // labelService可根据uri参数提供不同的展示效果
    const name = presetName ? presetName : uri.displayName;
    let node: ServerNode;
    if (!this.cacheFileStat.has(filestat.uri)) {
      this.cacheFileStat.set(filestat.uri, filestat);
    }
    //if (filestat.isDirectory) {
    node = new ServerNode(
      tree as any,
      parent,
      uri,
      name,
      filestat,
      { nodeName: 'root', displayName: 'root', levelType: 'root' },
      this.getReadableTooltip(uri),
      parent && this.cacheNodeID.get(new Path(parent.path).join(name).toString()),
    );

    //}
    // 用于固定各个节点的ID，防止文件操作出现定位错误
    this.cacheNodeID.set(node.path, node.id);
    return node;
  }

  /**
   * 转换FileStat对象为TreeNode
   */
  toServerNode(
    tree: ITree,
    treeNode: IServerTreeNode,
    filestat?: FileStat,
    parent?: ServerNode,
  ): ServerNode | ServerEntity {
    //const uri = new URI(filestat.uri);
    // 这里的name主要用于拼接节点路径，即path属性, 必须遵循路径原则
    // 允许nodeValue为0
    const name: string = isNotEmpty(treeNode.nodeValue) ? treeNode.nodeValue!.toString() : treeNode.nodeName;
    let node: ServerNode | ServerEntity;
    //serverNode 不需要移动，所有用不到缓存
    // if (!this.cacheFileStat.has(filestat.uri)) {
    //   this.cacheFileStat.set(filestat.uri, filestat);
    // }
    let tooltip =
      treeNode.levelType === 'server'
        ? `${treeNode.serverType} ${treeNode.serverInfo?.host} ${
            treeNode.serverInfo!.user ? treeNode.serverInfo!.user : ''
          } 拖拽排序`
        : treeNode.tooltip;
    if (treeNode.levelType !== 'entity') {
      if (treeNode.levelType === 'server') {
        treeNode.nodeStat = this.openRecentStatService.isConnect(treeNode.primaryId!) ? 'success' : 'init';
      }
      node = new ServerNode(
        tree as any,
        parent,
        filestat ? new URI(filestat.uri) : undefined,
        name,
        filestat,
        treeNode,
        tooltip,
        parent && this.cacheNodeID.get(new Path(parent.path).join(name).toString()),
      );
      if (this.cacheSuccessLoadNode.has(node.path)) {
        node.updateNodeStat('success');
      }
    } else {
      node = new ServerEntity(
        tree as any,
        parent,
        name,
        treeNode,
        tooltip,
        parent && this.cacheNodeID.get(new Path(parent.path).join(name).toString()),
      );
    }
    // 用于固定各个节点的ID，防止文件操作出现定位错误
    this.cacheNodeID.set(node.path, node.id);
    return node;
  }

  // async mvFiles(fromFiles: URI[], targetDir: URI) {
  //   const error: string[] = [];
  //   for (const from of fromFiles) {
  //     if (from.isEqualOrParent(targetDir)) {
  //       return;
  //     }
  //   }
  //   // 合并具有包含关系的文件移动
  //   const sortedFiles = fromFiles.sort((a, b) => a.toString().length - b.toString().length);
  //   const mergeFiles: URI[] = [];
  //   for (const file of sortedFiles) {
  //     if (mergeFiles.length > 0 && mergeFiles.find((exist) => exist.isEqualOrParent(file))) {
  //       continue;
  //     }
  //     mergeFiles.push(file);
  //   }
  //   if (this.corePreferences['explorer.confirmMove']) {
  //     const ok = localize('file.confirm.move.ok');
  //     const cancel = localize('file.confirm.move.cancel');
  //     const confirm = await this.dialogService.warning(
  //       formatLocalize(
  //         'file.confirm.move',
  //         `[ ${mergeFiles.map((uri) => uri.displayName).join(',')} ]`,
  //         targetDir.displayName,
  //       ),
  //       [cancel, ok],
  //     );
  //     if (confirm !== ok) {
  //       return;
  //     }
  //   }
  //   for (const from of mergeFiles) {
  //     const filestat = this.cacheFileStat.get(from.toString());
  //     const res = await this.mv(from, targetDir.resolve(from.displayName), filestat && filestat.isDirectory);
  //     if (res) {
  //       error.push(res);
  //     }
  //   }
  //   return error;
  // }

  // async mv(from: URI, to: URI, isDirectory = false) {
  //   try {
  //     await this.workspaceEditService.apply({
  //       edits: [
  //         {
  //           newResource: to,
  //           oldResource: from,
  //           options: {
  //             isDirectory,
  //             overwrite: true,
  //           },
  //         },
  //       ],
  //     });
  //   } catch (e) {
  //     return e.message;
  //   }
  //   return;
  // }

  // async createFile(uri: URI) {
  //   try {
  //     await this.workspaceEditService.apply({
  //       edits: [
  //         {
  //           newResource: uri,
  //           options: {},
  //         },
  //       ],
  //     });
  //   } catch (e) {
  //     return e.message;
  //   }
  //   this.commandService.executeCommand(EDITOR_COMMANDS.OPEN_RESOURCE.id, uri, {disableNavigate: true});
  //   return;
  // }

  // async createDirectory(uri: URI) {
  //   try {
  //     await this.workspaceEditService.apply({
  //       edits: [
  //         {
  //           newResource: uri,
  //           options: {
  //             isDirectory: true,
  //           },
  //         },
  //       ],
  //     });
  //   } catch (e) {
  //     return e.message;
  //   }
  //   return;
  // }

  // async delete(uri: URI) {
  //   try {
  //     await this.workspaceEditService.apply({
  //       edits: [
  //         {
  //           oldResource: uri,
  //           options: {},
  //         },
  //       ],
  //     });
  //     return;
  //   } catch (e) {
  //     return e.message;
  //   }
  // }

  // async copyFile(from: URI, to: URI) {
  //   let idx = 1;
  //   let exists;
  //   try {
  //     exists = await this.fileServiceClient.access(to.toString());
  //   } catch (e) {
  //     return e.message;
  //   }
  //   while (exists) {
  //     const name = to.displayName.replace(/\Wcopy\W\d+/, '');
  //     const extname = paths.extname(name);
  //     const basename = paths.basename(name, extname);
  //     const newFileName = `${basename} copy ${idx}${extname}`;
  //     to = to.parent.resolve(newFileName);
  //     idx++;
  //     try {
  //       exists = await this.fileServiceClient.access(to.toString());
  //     } catch (e) {
  //       return;
  //     }
  //   }
  //   try {
  //     return await this.fileServiceClient.copy(from.toString(), to.toString());
  //   } catch (e) {
  //     return e.message;
  //   }
  // }

  /**
   * 替换用户目录为 ~
   * 移除协议头文本 file://
   *
   * @param {URI} path
   * @returns
   * @memberof FileTreeAPI
   */
  public getReadableTooltip(path: URI) {
    const pathStr = path.toString();
    const userhomePathStr = this.userhomePath && this.userhomePath.toString();
    if (!this.userhomePath) {
      return decodeURIComponent(path.withScheme('').toString());
    }
    if (this.userhomePath.isEqualOrParent(path)) {
      return decodeURIComponent(pathStr.replace(userhomePathStr, '~'));
    }
    return decodeURIComponent(path.withScheme('').toString());
  }
}
