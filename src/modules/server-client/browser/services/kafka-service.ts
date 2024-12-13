import { Autowired, Injectable } from '@opensumi/di';
import {
  IBroker,
  IKafkaClientRPCPath,
  IKafkaClientServicePath,
  IKafkaService,
  IKafkaServiceClient, IKafkaStatus,
  IMessageBase,
  IPartition,
  IQueryResult,
  IQueryStart,
  TopicCreateParam,
} from '../../common';
import { ConnectQuery } from '../../../local-store-db/common';
import { GroupOverview } from 'kafkajs';
import { RPCService } from '@opensumi/ide-connection';

@Injectable()
export class KafkaService extends RPCService implements IKafkaService {
  @Autowired(IKafkaClientServicePath)
  private kafkaClientService: IKafkaServiceClient;

  // @Autowired(IKafkaClientRPCPath)
  // private kafkaRpcClient: KafkaRpcClient;

  showMessage(): void {
    console.log('showMessage');
    this.kafkaClientService.showMessage('test');
  }

  onMessage(message: string) {
    console.log('browser----->', message);
  }

  ping(connect: ConnectQuery): Promise<IQueryResult> {
    return this.kafkaClientService.ping(connect);
  }

  closeConnection(connect: ConnectQuery) {
    return this.kafkaClientService.closeConnection(connect);
  }
  //
  // public closeServerAllConnections(serverId: string) {
  //   return this.kafkaClientService.closeServerAllConnections(serverId!);
  // }

  showBrokers(connect: ConnectQuery): Promise<IQueryResult<IBroker[]>> {
    return this.kafkaClientService.showBrokers(connect);
  }

  showGroups(connect: ConnectQuery): Promise<IQueryResult<GroupOverview[]>> {
    return this.kafkaClientService.showGroups(connect);
  }

  showTopics(connect: ConnectQuery): Promise<IQueryResult<string[]>> {
    return this.kafkaClientService.showTopics(connect);
  }

  createTopic(connect: ConnectQuery, topicCreateParam: TopicCreateParam): Promise<IQueryResult> {
    return this.kafkaClientService.createTopic(connect, topicCreateParam);
  }

  deleteTopic(connect: ConnectQuery, topics: string[]): Promise<IQueryResult> {
    return this.kafkaClientService.deleteTopic(connect, topics);
  }

  showPartitions(connect: ConnectQuery, topic: string): Promise<IQueryResult<IPartition[]>> {
    return this.kafkaClientService.showPartitions(connect, topic);
  }

  queryNewData(
    connect: ConnectQuery,
    topic: string,
    partition: string,
    size: number,
    queryStart: IQueryStart,
  ): Promise<IQueryResult> {
    return this.kafkaClientService.queryNewData(connect, topic, partition, size, queryStart);
  }

  sendOneMessage(connect: ConnectQuery, topic: string, message: IMessageBase): Promise<IQueryResult> {
    return this.kafkaClientService.sendOneMessage(connect, topic, message);
  }

  getKafkaStatus(connect: ConnectQuery): Promise<IKafkaStatus>{
    return this.kafkaClientService.getKafkaStatus(connect);
  }
}
