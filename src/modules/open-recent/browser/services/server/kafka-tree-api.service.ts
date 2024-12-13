import { Autowired, Injectable } from '@opensumi/di';
import { IKafkaService, IKafkaServiceToken, IQueryResult } from '../../../../server-client/common';
import { ServerInfo } from '../../../../local-store-db/common';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../../../base/model/server-tree-node.model';
import { ServerType } from '../../../../base/types/server-node.types';
import { IDialogService } from '@opensumi/ide-overlay';
import { IChildrenResult } from '../server-tree-api.service';

@Injectable()
export class KafkaTreeApiService {
  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IKafkaServiceToken)
  private kafkaService: IKafkaService;

  public async resolveKafkaChildren(server: ServerInfo, parentNode: IServerTreeNode): Promise<IChildrenResult> {
    const { nodeType } = parentNode;
    let result: IQueryResult = { success: false };
    let tree = [];
    switch (nodeType) {
      case 'server':
        result = await this.kafkaService.ping({ server });
        if (result.success) {
          tree = this.showKafkaModelItem(server.serverType!);
        }
        break;
      case 'topics':
        result = await this.kafkaService.showTopics({ server });
        if (result.success) {
          tree = result!.data!.map((item) =>
            ServerTreeNodeUtils.convertNode(item!, item!, item!, 'Kafka', 'entity', 'topic', 'success'),
          );
        }
        break;
      case 'kafkaBrokers':
        result = await this.kafkaService.showBrokers({ server });
        if (result.success) {
          tree = result!.data!.map((item) => {
            const name = `${item.host}:${item.port}`;
            return ServerTreeNodeUtils.convertNode(
              name,
              name,
              name,
              'Kafka',
              'entity',
              'kafkaBroker',
              'success',
              '',
              '',
              '',
              '',
              JSON.stringify(item),
            );
          });
        }
        break;
      case 'groups':
        result = await this.kafkaService.showGroups({ server });
        if (result.success) {
          tree = result!.data!.map((item) => {
            const name = item.groupId;
            return ServerTreeNodeUtils.convertNode(
              name,
              name,
              name,
              'Kafka',
              'entity',
              'group',
              'success',
              '',
              '',
              '',
              '',
              JSON.stringify(item),
            );
          });
        }
        break;
      case 'status':
        result = { success: true,};
        break;
    }

    return { success: result.success, result, tree };
  }

  /**
   * kafka,rockermq,mqtt
   * @param serverType
   */
  showKafkaModelItem(serverType: ServerType): IServerTreeNode[] {
    const treeNodes: IServerTreeNode[] = [
      {
        displayName: 'Status',
        nodeName: 'Status',
        serverType: serverType,
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'status',
        sort: 10,
        clickLoadData:true
      },
      {
        displayName: 'Topics',
        nodeName: 'Topics',
        serverType: serverType,
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'topics',
        sort: 9,
      },
      {
        displayName: 'Brokers',
        nodeName: 'Brokers',
        serverType: serverType,
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'kafkaBrokers',
        sort: 8,
      },
      {
        displayName: 'Groups',
        nodeName: 'Groups',
        serverType: serverType,
        levelType: 'node',
        nodeStat: 'success',
        nodeType: 'groups',
        sort: 7,
      },
    ];
    return treeNodes;
  }
}
