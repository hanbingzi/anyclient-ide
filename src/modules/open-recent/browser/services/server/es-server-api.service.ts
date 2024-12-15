import { Autowired, Injectable } from '@opensumi/di';
import { ServerInfo } from '../../../../local-store-db/common';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../../../base/model/server-tree-node.model';
import { IChildrenResult } from '../server-tree-api.service';
import { IEsService, IEsServiceToken } from '../../../../server-client/common/types/es.types';
import { IKeyPathInfo, IQueryResult } from '../../../../server-client/common';

@Injectable()
export class EsServerApiService {


  @Autowired(IEsServiceToken)
  private esService: IEsService;

  public async resolveEsChildren(server: ServerInfo, parentNode: IServerTreeNode): Promise<IChildrenResult> {
    const { nodeType } = parentNode;
    let result: IQueryResult = { success: false };
    let tree = [];
    switch (nodeType) {
      case 'server':
        const pingResult = await this.esService.ping({ server });
        if (pingResult.success) {
          tree = this.showEsModelItem();
          return { success: true, tree };
        }
        break;
      case 'indexs':
        result = await this.esService.showIndexList({server})
        if(result.success){
          tree = result!.data!.map((item) =>
            ServerTreeNodeUtils.convertNode(
              item.index,
              item.index,
              item.index,
              'Elasticsearch',
              'entity',
              'index',
              'success',
              '',
              '',
              '',
              item.index,
            ),
          );
          return { success: true, tree };
        }
        break;
    }

    return result;

  }


  showEsModelItem(): IServerTreeNode[] {
    const treeNodes: IServerTreeNode[] = [
      {
        displayName: 'Status',
        nodeName: 'Status',
        serverType: 'Elasticsearch',
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'status',
        sort: 9,
        clickLoadData:true
      },
      {
        displayName: 'Index',
        nodeName: 'Index',
        serverType: 'Elasticsearch',
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'indexs',
        sort: 7,
      },

    ];
    return treeNodes;
  }
}
