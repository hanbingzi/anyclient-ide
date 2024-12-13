import { Autowired, Injectable } from '@opensumi/di';
import { IDialogService } from '@opensumi/ide-overlay';
import { ServerInfo } from '../../../../local-store-db/common';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../../../base/model/server-tree-node.model';
import { IKeyPathInfo, IQueryResult } from '../../../../server-client/common';
import { EtcdService } from '../../../../server-client/browser/services/etcd-service';
import { IChildrenResult } from '../server-tree-api.service';

@Injectable()
export class EtcdServerApiService {


  @Autowired(EtcdService)
  private etcdService: EtcdService;

  public async resolveEtcdChildren(server: ServerInfo, parentNode: IServerTreeNode): Promise<IChildrenResult> {
    const { nodeType } = parentNode;
    let result: IQueryResult = { success: false };
    let tree = [];
    switch (nodeType) {
      case 'server':
        // result = await this.kafkaService.ping({ server });
        // if (result.success) {
        tree = this.showEtcdModelItem();
        return { success: true, tree };
      // }
      case 'auth':
        tree = this.showEtcdAuthModelItem();
        return { success: true, tree };

      case 'data':
        result = await this.etcdService.showKeys({ server });
        if (result.success) {
          tree = result!.data!.map((item: IKeyPathInfo) =>
            ServerTreeNodeUtils.convertNode(
              item.name,
              item.name,
              item.name,
              'Etcd',
              item.isKey ? 'entity' : 'node',
              item.type,
              'success',
              '',
              '',
              '',
              item.fullPath,
            ),
          );
          return { success: true, tree };
        }
        break;
      case 'dic':
        result = await this.etcdService.showKeys({ server }, parentNode.nodeValue + '');
        if (result.success) {
          tree = result!.data!.map((item: IKeyPathInfo) =>
            ServerTreeNodeUtils.convertNode(
              item.name,
              item.name,
              item.name,
              'Etcd',
              item.isKey ? 'entity' : 'node',
              item.type,
              'success',
              '',
              '',
              '',
              item.fullPath,
            ),
          );
          return { success: true, tree };
        }
        break;
    }

    return { success: result.success, result, tree };
  }

  showEtcdModelItem(): IServerTreeNode[] {
    const treeNodes: IServerTreeNode[] = [
      {
        displayName: 'Data',
        nodeName: 'Data',
        serverType: 'Etcd',
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'data',
        sort: 10,
      },
      {
        displayName: 'Security',
        nodeName: 'Auth',
        serverType: 'Etcd',
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'auth',
        sort: 9,
      },
      {
        displayName: 'Cluster',
        nodeName: 'Cluster',
        serverType: 'Etcd',
        levelType: 'entity',
        nodeStat: 'success',
        nodeType: 'cluster',
        sort: 8,
      },
    ];
    return treeNodes;
  }

  showEtcdAuthModelItem(): IServerTreeNode[] {
    const treeNodes: IServerTreeNode[] = [
      {
        displayName: 'Users',
        nodeName: 'Users',
        serverType: 'Etcd',
        levelType: 'entity',
        nodeStat: 'success',
        nodeType: 'users',
        sort: 8,
      },
      {
        displayName: 'Roles',
        nodeName: 'Roles',
        serverType: 'Etcd',
        levelType: 'entity',
        nodeStat: 'success',
        nodeType: 'roles',
        sort: 9,
      },
    ];
    return treeNodes;
  }
}
