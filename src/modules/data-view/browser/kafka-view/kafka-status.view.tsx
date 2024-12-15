import React, { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Row, Spin, Statistic, Table } from 'antd';
import { ApartmentOutlined, CloudServerOutlined, LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { WindowsTitle } from '../../../components/title';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import { IBroker, IConsumerGroup, IKafkaMetrics, IKafkaService, ITopicInfo } from '../../../server-client/common';
import { KafkaService } from '../../../server-client/browser/services/kafka-service';
import { useInjectable } from '@opensumi/ide-core-browser';
import { IBaseState } from '../../common/data-browser.types';

// 类型定义

interface KafkaStatusProps {
  loading?: boolean;
  dataLoading?: boolean;
  error?: string;
  data?: {
    brokers: IBroker[];
    topics: ITopicInfo[];
    consumerGroups: IConsumerGroup[];
    metrics: IKafkaMetrics;
  };
  refreshClick: () => void;
}

// const testData: KafkaStatusProps = {
//   error: '',
//   loading: false,
//   data: {
//     brokers: [
//       {
//         nodeId: 1,
//         host: '127.0.0.1',
//         port: 3306,
//       },
//     ],
//     topics: [{
//       name: 'localhost',
//       partitions: 3,
//       replicationFactor: 3,
//       messageCount: 1,
//       sizeBytes: 2,
//     }],
//     consumerGroups: [{
//       groupId: '1221232132123123',
//       status: 'a',
//       lag: 1,
//       members: 3,
//
//     }],
//     metrics: {
//       messagesPerSec: 1,
//       bytesInPerSec: 2,
//       bytesOutPerSec: 3,
//       activeControllers: 4,
//       underReplicatedPartitions: 5,
//       offlinePartitionsCount: 6,
//     },
//   },
// };


export const KafkaStatusInfo: React.FC<KafkaStatusProps> = ({
                                                              loading = false,
                                                              dataLoading,
                                                              error,
                                                              data,
                                                              refreshClick,
                                                            }) => {


  if (loading || error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '30px' }}>
        {loading ? <Spin size="large" /> :
          error ? <Alert message="Error" description={error} type="error" showIcon /> :
            !data ? <Alert message="No data available" type="warning" showIcon /> : null}
      </div>
    );
  }


  // Broker列定义
  const brokerColumns = [
    {
      title: 'Broker ID',
      dataIndex: 'nodeId',
      key: 'nodeId',
    },
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={'success'}
          text={'online'}
        />
      ),
    },
  ];

  const groupColumns = [
    {
      title: 'Group ID',
      dataIndex: 'groupId',
      key: 'groupId',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Members',
      dataIndex: 'members',
      key: 'members',
    },
  ];
  // Topic列定义
  const topicColumns = [
    {
      title: 'Topic Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Partitions',
      dataIndex: 'partitions',
      key: 'partitions',
    },
    {
      title: 'Replication Factor',
      dataIndex: 'replicationFactor',
      key: 'replicationFactor',
    },

  ];


  return (
    <div style={{ paddingLeft: '20px', paddingRight: '20px', marginTop: '12px' }}>
      {/* 健康状态概览 */}
      <Card title="Statistic"
            extra={<ReloadOutlined spin={dataLoading} onClick={refreshClick} size={24} />}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div className={styles['metric-card']}>
              <Statistic
                title="Active Brokers"
                value={data.brokers.length}
                suffix={`/ ${data.brokers.length}`}
                prefix={<CloudServerOutlined />}
              />
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className={styles['metric-card']}>
              <Statistic
                title="Total Topics"
                value={data.topics.length}
                prefix={<ApartmentOutlined />}
              />
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className={styles['metric-card']}>
              <Statistic
                title="Messages/sec"
                value={'未知'}
                prefix={<LineChartOutlined />}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区 */}
      <div style={{ marginTop: '10px' }}>
        <div className={styles['metric-card']}>
          <WindowsTitle
            title={'Brokers'}
            icon={ServerIconFinder.getServerIcon('Kafka', 'kafkaBroker')}
            size={'default'}
          />
          <Table
            columns={brokerColumns}
            dataSource={data.brokers}
            rowKey="nodeId"
            pagination={false}
            size="middle"
          />
        </div>

        <div className={styles['metric-card']}>
          <WindowsTitle
            title={'Topics'}
            icon={ServerIconFinder.getServerIcon('Kafka', 'topic')}
            size={'default'}
          />
          <Table
            columns={topicColumns}
            dataSource={data.topics}
            rowKey="name"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </div>

        <div className={styles['metric-card']}>
          <WindowsTitle
            title={'ConsumerGroups'}
            icon={ServerIconFinder.getServerIcon('Kafka', 'group')}
            size={'default'}
          />
          <Table
            columns={groupColumns}
            dataSource={data.consumerGroups}
            rowKey="groupId"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </div>

        {/*<div style={{ marginTop: '20px' }}>*/}
        {/*  <WindowsTitle*/}
        {/*    title={'Metrics'}*/}
        {/*    size={'default'}*/}
        {/*    icon={ServerIconFinder.getServerIcon('Kafka', 'status')}*/}
        {/*  />*/}
        {/*  <Row gutter={[16, 16]}>*/}
        {/*    <Col xs={24} md={12}>*/}
        {/*      <div className={styles['card-container']} title="Throughput">*/}
        {/*        <Statistic*/}
        {/*          title="Bytes In/sec"*/}
        {/*          value={formatBytes(data.metrics.bytesInPerSec)}*/}
        {/*          style={{ marginBottom: '20px' }}*/}
        {/*        />*/}
        {/*        <Statistic*/}
        {/*          title="Bytes Out/sec"*/}
        {/*          value={formatBytes(data.metrics.bytesOutPerSec)}*/}
        {/*        />*/}
        {/*      </div>*/}
        {/*    </Col>*/}
        {/*    <Col xs={24} md={12}>*/}
        {/*      <div className={styles['card-container']} title="Partition Health">*/}
        {/*        <Space direction="vertical" style={{ width: '100%' }}>*/}
        {/*          <div>*/}
        {/*            <div style={{ marginBottom: '8px' }}>Under Replicated Partitions</div>*/}
        {/*            <Progress*/}
        {/*              percent={data.metrics.underReplicatedPartitions}*/}
        {/*              status={data.metrics.underReplicatedPartitions > 0 ? 'exception' : 'success'}*/}
        {/*              showInfo={false}*/}
        {/*            />*/}
        {/*          </div>*/}
        {/*          <div>*/}
        {/*            <div style={{ marginBottom: '8px' }}>Offline Partitions</div>*/}
        {/*            <Progress*/}
        {/*              percent={data.metrics.offlinePartitionsCount}*/}
        {/*              status={data.metrics.offlinePartitionsCount > 0 ? 'exception' : 'success'}*/}
        {/*              showInfo={false}*/}
        {/*            />*/}
        {/*          </div>*/}
        {/*        </Space>*/}
        {/*      </div>*/}
        {/*    </Col>*/}
        {/*  </Row>*/}
        {/*</div>*/}


      </div>
    </div>
  );
};

export const KafkaStatus = (props: IBaseState) => {
  const { server } = props;
  const [kafkaData, setKafkaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const kafkaService = useInjectable<IKafkaService>(KafkaService);

  useEffect(() => {


    fetchKafkaData();
    // const interval = setInterval(fetchKafkaData, 10000); // 每10秒刷新一次
    // return () => clearInterval(interval);
  }, []);
  const fetchKafkaData = async () => {
    try {
      setDataLoading(true);
      const response = await kafkaService.getKafkaStatus({ server });
      setKafkaData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };


  return (
    <KafkaStatusInfo
      data={kafkaData}
      loading={loading}
      dataLoading={dataLoading}
      error={error}
      refreshClick={fetchKafkaData}
    />
  );
};

