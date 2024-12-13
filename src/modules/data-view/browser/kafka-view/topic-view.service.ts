import { Autowired, Injectable } from '@opensumi/di';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { ConnectQuery, IServerService, IServerServiceToken } from '../../../local-store-db/common';
import {
  IKafkaService,
  IKafkaServiceRPCToken,
  IMessage,
  IMessageBase,
  IPartition,
  IQueryResult,
  IQueryStart,
  TopicCreateParam,
} from '../../../server-client/common';
import { Emitter, URI } from '@opensumi/ide-utils';
import { AllNodeType } from '../../../base/types/server-node.types';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { IConnectTreeServiceToken } from '../../../open-recent';
import { ConnectTreeService } from '../../../open-recent/browser/connect-tree.service';
import { ServerCommandIds } from '../../../base/command/menu.command';
import { CommandService } from '@opensumi/ide-core-common';
import { OpenParam } from '../../../base/param/open-view.param';
import { DataItemInfoVisible } from '../../../base/command/panel.command';
import { DataItemInfoService } from '../../../data-item-info/browser/data-item-info.service';
import { IKafkaServiceToken } from '../../../server-client/common/types/kafka.types';

@Injectable({ multiple: true })
export class TopicViewService {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  @Autowired(WorkbenchEditorService)
  private readonly workbenchEditorService: WorkbenchEditorService;

  @Autowired(IKafkaServiceToken)
  private kafkaService: IKafkaService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(CommandService)
  private readonly commandService: CommandService;

  @Autowired(DataItemInfoService)
  private readonly dataItemInfoService: DataItemInfoService;
  private readonly onDataChangeEmitter = new Emitter<IMessage[]>();

  get onDataChange() {
    return this.onDataChangeEmitter.event;
  }

  private openUri: URI;
  private topic: string;
  private nodePath: string;
  private serverId: string;
  //private serverInfo: ServerInfo;
  //private cluster:ServerCluster[];
  private connect: ConnectQuery;
  private nodeType: AllNodeType;

  private _whenReady: Promise<void>;

  get whenReady() {
    return this._whenReady;
  }

  public async init(openUri: URI, nodeName: string, nodePath: string, serverId: string, nodeType: AllNodeType) {
    this.openUri = openUri;
    this.topic = nodeName;
    this.nodePath = nodePath;
    this.serverId = serverId;
    this.nodeType = nodeType;
    this.nodePath = nodePath;
    this._whenReady = this.resolveWorkspaceData();
  }

  public async resolveWorkspaceData() {
    if (!this.connect) {
      this.connect = await this.serverService.findConnectById(this.serverId);
    }
  }

  public async loadData(partition: string = '', querySize: number = 100, queryStart: IQueryStart = 'Newest') {
    const queryResult = await this.kafkaService.queryNewData(
      this.connect,
      this.topic,
      partition,
      querySize,
      queryStart,
    );
    if (!queryResult.success) {
      this.dialogService.error('查询出错:' + queryResult.error);
    }
    if (queryResult.data) {
      // console.log('load data:', queryResult.data)
      this.onDataChangeEmitter.fire(queryResult.data);
    }
  }
  public test() {
    //this.kafkaRPCService.showMessage();
    this.kafkaService.showMessage();
  }

  public async getTopicPartition(): Promise<IPartition[]> {
    const queryResult = await this.kafkaService.showPartitions(this.connect, this.topic);
    //console.log('queryTopicPartition:', queryResult);
    if (!queryResult.success || !queryResult.data) {
      return [];
    }
    return queryResult.data;
    //return queryResult.data.map(value => String(value.partitionId));
  }

  public async saveTopic(topicParam: TopicCreateParam, closeTab: boolean): Promise<IQueryResult> {
    const result = await this.kafkaService.createTopic(this.connect, topicParam);
    if (result.success) {
      this.messages.info('保存成功');
      await this.connectTreeService.refreshByPathForServerNode(this.nodePath);
      if (closeTab) {
        await this.workbenchEditorService.close(this.openUri, false);
      }
    }
    return result;
  }

  public async addMessage(message: IMessageBase, closeTab: boolean): Promise<IQueryResult> {
    const result = await this.kafkaService.sendOneMessage(this.connect, this.topic, message);
    if (result.success) {
      this.messages.info('发送成功');
      if (closeTab) {
        this.workbenchEditorService.close(this.openUri, false);
      }
    }
    return result;
  }

  /**
   * 打开消息新增窗口
   */
  public openAddMessageView() {
    let openParam: OpenParam = {
      nodeName: this.topic,
      serverId: this.serverId!,
      db: '',
      schema: '',
      serverType: 'Kafka',
      nodeType: this.nodeType!,
      option: 'addChild',
      path: this.nodePath,
    };

    this.commandService.executeCommand(ServerCommandIds.topicAddMessage.id, null, openParam);
  }

  /**
   *
   */
  public showDataItemInfoPanel() {
    this.commandService.executeCommand(DataItemInfoVisible.id);
  }

  public showDataItemInfo(data: any, isRowData: boolean = false) {
    if (isRowData) {
      data = JSON.stringify(data);
    }
    this.dataItemInfoService.showData(data);
  }
}
