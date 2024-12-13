import { Injectable } from '@opensumi/di';
import { AbstractBaseClient } from './base-client';
import {
  IBroker,
  IKafkaServiceClient,
  IKafkaStatus,
  IMessage,
  IMessageBase,
  IPartition,
  IQueryResult,
  IQueryStart,
  TopicCreateParam,
} from '../common';
import { GroupOverview, Kafka } from 'kafkajs';
import { uuid } from '@opensumi/ide-utils';
import { DateUtil } from '../../base/utils/date-util';
import { isEmpty } from '../../base/utils/object-util';
import { ConnectQuery, ServerInfo } from '../../local-store-db/common';
import { AppConstants } from '../../../common/constants';

@Injectable()
export class KafkaServiceClient extends AbstractBaseClient<Kafka> implements IKafkaServiceClient {
  showMessage(message: string) {
    //console.log('KafkaRpcClient -node', message);
    let i = 0;
    setInterval(() => {
      i++;
      this.client.onMessage(`I got you message, echo again. ${message}-${i}`);
    }, 1000);
  }

  private groupId: string;

  public getErrorResult(error: any): IQueryResult {
    return { success: false, message: JSON.stringify(error), code: error.errno }; //sql: error.sql,
  }

  public getGroupId(serverInfo: ServerInfo) {
    if (serverInfo.groupId) {
      return serverInfo.groupId;
    }
    if (this.groupId) {
      return this.groupId;
    }
    this.groupId = `${AppConstants.AppName}-${uuid(10)}`;
    return this.groupId;
  }

  async ping(connect: ConnectQuery): Promise<IQueryResult> {
    try {
      //console.log('kafka ping_____------------------->')
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return { success: true };
    } catch (e) {
      console.log('kafka ping-------->', JSON.stringify(e));
      return { success: false, message: JSON.stringify(e) };
    } finally {
      await this.closeConnection(connect);
    }
  }

  async getKafkaStatus(connect: ConnectQuery): Promise<IKafkaStatus> {

    try {
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();

      // 获取集群信息
      const clusterInfo = await admin.describeCluster();
      // 获取所有 topic
      const topics = await admin.listTopics();
      // 获取 topic 详细信息
      const topicMetadata = await admin.fetchTopicMetadata({
        topics: topics,
      });
      // 获取消费者组
      const groups = await admin.listGroups();
      // 获取消费者组详细信息
      const groupDescriptions = await admin.describeGroups(
        groups.groups.map(group => group.groupId),
      );
      // 转换 broker 信息
      const brokers = clusterInfo.brokers;
      // 转换 topic 信息
      const topicsInfo = topicMetadata.topics.map(topic => {
        const partitionCount = topic.partitions.length;
        const replicationFactor = topic.partitions[0]?.replicas.length || 0;
        return {
          name: topic.name,
          partitions: partitionCount,
          replicationFactor: replicationFactor,
          messageCount: -1, // KafkaJS 不直接提供消息数量
          sizeBytes: -1, // KafkaJS 不直接提供大小信息
        };
      });

      // 转换消费者组信息
      const consumerGroups = groupDescriptions.groups.map(group => ({
        groupId: group.groupId,
        status: group.state,
        members: group.members.length,
        lag: -1, // 需要单独计算消费延迟
      }));

      // 计算基本指标
      // const metrics = {
      //   messagesPerSec: -1, // 需要通过监控系统获取
      //   bytesInPerSec: -1,
      //   bytesOutPerSec: -1,
      //   activeControllers: clusterInfo.controllers.length,
      //   underReplicatedPartitions: 0, // 需要单独计算
      //   offlinePartitionsCount: 0, // 需要单独计算
      // };
      await admin.disconnect();

      return {
        brokers,
        topics: topicsInfo,
        consumerGroups,
        // metrics,
      };
    } catch (e) {
      return {
        brokers: [],
        topics: [],
        consumerGroups: [],
        // metrics,
      };
    }

  }


  async showTopics(connect: ConnectQuery): Promise<IQueryResult<string[]>> {
    const kafka = await this.getClient(connect);
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();
    return { success: true, data: topics };
  }

  async deleteTopic(connect: ConnectQuery, topics: string[]): Promise<IQueryResult> {
    try {
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();
      await admin.connect();
      await admin.deleteTopics({ topics });
      await admin.disconnect();
      return { success: true };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async createTopic(connect: ConnectQuery, topicCreateParam: TopicCreateParam): Promise<IQueryResult> {
    try {
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();
      await admin.connect();
      const success = await admin.createTopics({ topics: [topicCreateParam] });
      await admin.disconnect();
      return { success, message: !success ? 'topic create error' : '' };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async showGroups(connect: ConnectQuery): Promise<IQueryResult<GroupOverview[]>> {
    try {
      const kafka = await this.getClient(connect);
      //const kafka = this.getKafka(serverInfo)
      const admin = kafka.admin();
      await admin.connect();
      const groupInfo = await admin.listGroups();
      await admin.disconnect();
      return { success: true, data: groupInfo.groups };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async showBrokers(connect: ConnectQuery): Promise<IQueryResult<IBroker[]>> {
    //const kafka = this.getKafka(serverInfo)
    try {
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();
      await admin.connect();
      const cluster = await admin.describeCluster();
      await admin.disconnect();
      return { success: true, data: cluster.brokers };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async showPartitions(connect: ConnectQuery, topic: string): Promise<IQueryResult<IPartition[]>> {
    //const kafka = this.getKafka(serverInfo)
    try {
      const kafka = await this.getClient(connect);
      const admin = kafka.admin();
      await admin.connect();
      const meta = await admin.fetchTopicMetadata({ topics: [topic] });
      console.log('partition:', meta.topics[0]);
      await admin.disconnect();
      const partitions = meta.topics[0] ? meta.topics[0].partitions : [];
      return { success: true, data: partitions };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async sendOneMessage(connect: ConnectQuery, topic: string, message: IMessageBase): Promise<IQueryResult> {
    try {
      const kafka = await this.getClient(connect);
      const producer = kafka.producer();
      await producer.connect();
      const sendResult = await producer.send({ topic, messages: [message] });
      console.log('sendResult->', sendResult);
      await producer.disconnect();
      return { success: true };
    } catch (error) {
      return this.getErrorResult(error);
    }
  }

  async getOffset(connect: ConnectQuery, topic: string) {
    const kafka = await this.getClient(connect);
    const admin = kafka.admin();
    await admin.connect();
    const result = await admin.fetchTopicOffsets(topic);
    await admin.disconnect();
    return result;
  }

  /**
   * 查100个:size=100
   * 只有60个 offset=59
   * seekOffset=0
   * querySize=60
   * @param serverInfo
   * @param topic
   * @param queryPartition
   * @param size
   * @param queryStart
   */
  async queryNewData(
    connect: ConnectQuery,
    topic: string,
    queryPartition: string,
    size: number,
    queryStart: IQueryStart,
  ): Promise<IQueryResult> {
    const kafka = await this.getClient(connect);
    const partitionOffsetInfos = await this.getOffset(connect, topic);
    const consumer = kafka.consumer({ groupId: this.getGroupId(connect.server) });
    // const partitionLength = partitionOffsetInfo.length;
    const seekParams: { partition: number; offset: number }[] = [];
    const partitionQuerySize: { [key: string]: number } = {};
    let allSize: number = 0;
    //构建查询条件
    for (let partitionOffset of partitionOffsetInfos) {
      const { partition, offset, high, low } = partitionOffset;
      if (isEmpty(queryPartition) || Number(queryPartition) === partition) {
        const hasMessageSize = Number(high) - Number(low);
        const seekOffset: number = queryStart === 'Newest' ? Math.max(hasMessageSize - size, 0) : Number(low);
        seekParams.push({ partition: partition, offset: seekOffset });
        const querySize = size > hasMessageSize ? hasMessageSize : size;
        partitionQuerySize[`${partition}`] = querySize;
        allSize = allSize + querySize;
      }
    }
    if (allSize === 0) {
      return { success: true, data: [] };
    }
    // dataLength % partitionLength
    // Producing
    // Consuming
    await consumer.connect();
    await consumer.subscribe({ topic });
    let data: IMessage[] = [];
    return new Promise<IQueryResult<IMessage[]>>((resolve, reject) => {
      //设置过期时间
      const timer = setTimeout(() => {
        console.log('拿取数据超时setTimeout');
        consumer.disconnect();
        resolve({ success: false, data, error: '拿取数据超时' });
      }, 1000 * 120); //两分钟超时
      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const currentPartitionIndex = partitionQuerySize[`${partition}`];
          if (currentPartitionIndex > 0) {
            data.push({
              partition,
              key: message.key ? message.key.toString() : '',
              value: message.value ? message.value.toString() : '',
              timestamp: message.timestamp ? DateUtil.timestampToString(Number(message.timestamp))! : '',
              offset: Number(message.offset),
            });
            //判断数据是否都刷完
            partitionQuerySize[`${partition}`] = currentPartitionIndex - 1;
            allSize--;
          }
          if (allSize === 0) {
            clearTimeout(timer);
            consumer.disconnect();
            resolve({ success: true, data });
          }
        },
      });
      for (let seekParam of seekParams) {
        const { partition, offset } = seekParam;
        consumer.seek({ topic, partition, offset: String(offset) });
      }
    });
  }
}
