// ElasticsearchDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Progress, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { DatabaseOutlined, OrderedListOutlined, PieChartOutlined, ReloadOutlined } from '@ant-design/icons';
import styles from './es-dashboard.module.less';
import { WindowsTitle } from '../../../components/title';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import { Cluster } from '../../../icons/node';
import { formatBytes, getStatusColor } from '../../../base/utils/view-util';
import { IESClusterStats, IEsIndexStats, IEsService } from '../../../server-client/common/types/es.types';
import { useInjectable } from '@opensumi/ide-core-browser';
import { EsService } from '../../../server-client/browser/services/es-service';
import { IBaseState } from '../../common/data-browser.types';

const { Title, Text } = Typography;

// 类型定义

const testData: IESClusterStats = {
  clusterHealth: {
    status: 'green',
    numberOfNodes: 1,
    activeShards: 1,
    relocatingShards: 2,
    initializingShards: 1,
    unassignedShards: 3,
    pendingTasks: 3,
    activePrimaryShards: 1,
    activeShardsPercentAsNumber: 66.6666666666,
  },
  nodes: [{
    name: 'cluster-index',
    ip: '127.0.0.1',
    role: ['node1'],
    cpu: 30,
    memory: {
      used: 2400,
      total: 4800,
      percent: 0.5,
    },
    // disk: {
    //   used: 12000000,
    //   total: 26000000,
    //   percent: 0.7,
    // },
    heapUsage: 120000,

  }],
  indices: [{
    name: 'book',
    docsCount: 3,
    storageSize: '12000',
    primaryShards: 1200,
    replicaShards: 12,
  }],
  cluster: {
    version: '7.1.3',
    indicesCount: 2,
    indicesDocCount: 8,
    indicesDocDeleted: 0,
    storeSizInBytes: 31555,
    storeTotalDataSetSizeInBytes: 31555,
    name: 'docker-cluster',
  },
};


// const StyledCard = styled(Card)`
//   margin-bottom: 16px;
//   border-radius: 8px;
//   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
// `;
//
// const StatusBadge = styled(Badge)`
//   .ant-badge-status-dot {
//     width: 8px;
//     height: 8px;
//   }
// `;
//
// const ProgressLabel = styled.div`
//   display: flex;
//   justify-content: space-between;
//   margin-bottom: 8px;
// `;


// 类型定义保持不变...

const ElasticsearchDashboardView: React.FC<{
  data?: IESClusterStats;
  loading?: boolean;
  dataLoading?: boolean;
  error?: string;
  refreshClick: () => void;

}> = ({
        data,
        loading = false,
        dataLoading = false,
        error,
        refreshClick,
      }) => {
  // 工具函数保持不变...

  if (loading || error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '30px' }}>
        {loading ? <Spin size="large" /> :
          error ? <Alert message="Error" description={error} type="error" showIcon /> :
            !data ? <Alert message="No data available" type="warning" showIcon /> : null}
      </div>
    );
  }

  const { clusterHealth, nodes, indices, cluster } = data;

  const nodeColumns = [
    {
      title: 'Node Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },

    {
      title: 'CPU Usage',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (cpu: number) => <Progress percent={cpu} size="small" />,
    },
    {
      title: 'Memory',
      dataIndex: 'memory',
      key: 'memory',
      render: (memory: { used: number; total: number; percent: number }) => (
        <div>
          <Progress percent={memory.percent} size="small" />
          <Text type="secondary">{formatBytes(memory.used)} / {formatBytes(memory.total)}</Text>
        </div>
      ),
    },
    {
      title: 'Heap Usage',
      dataIndex: 'heapUsage',
      key: 'heapUsage',
      render: (heap: number) => <Progress percent={heap} size="small" />,
    },
    {
      title: 'Roles',
      dataIndex: 'role',
      key: 'role',
      width: 250,
      render: (roles: string[]) => roles.map((role) => (<Tag color="blue">{role}</Tag>)),
    },
  ];

  const indexColumns = [
    {
      title: 'Index Name',
      dataIndex: 'name',
      key: 'name',
    },

    {
      title: 'Documents',
      dataIndex: 'docsCount',
      key: 'docsCount',
    },
    {
      title: 'Size',
      dataIndex: 'storageSize',
      key: 'storageSize',
    },
    {
      title: 'Shards',
      key: 'shards',
      render: (text: string, record: IEsIndexStats) => (
        `${record.primaryShards} primary, ${record.replicaShards} replica`
      ),
    },
  ];

  return (
    <div className={styles['dashboard-container']}>
      {/* 集群状态概览 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Cluster Health"
                extra={<ReloadOutlined spin={dataLoading} onClick={refreshClick} size={24} />}>
            <Space align="center" size="large">
              Cluster Status:
              <Badge
                status={getStatusColor(clusterHealth?.status)}
                text={
                  clusterHealth?.status?.toUpperCase()}
              />

              <Statistic title="Nodes" value={clusterHealth?.numberOfNodes} />
              <Statistic title="Active Shards" value={clusterHealth?.activeShards} />
              <Statistic title="Pending Tasks" value={clusterHealth?.pendingTasks} />
            </Space>

          </Card>
        </Col>
      </Row>

      <div className={styles['row-container']}>
        <WindowsTitle
          title={'Cluster Stats'}
          icon={<Cluster />}
          size={'default'}
        />
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="Version">
              <Title level={3}>{cluster?.version}</Title>
              {/*<span style={{fontSize:24,fontWeight:'bold',margin:12}}>{cluster.version}</span>*/}
            </Card>
            <Card title="Cluster Name">
              <Title level={4}>{cluster?.name}</Title>
              {/*<span style={{fontSize:18,margin:12}}>{cluster.name}</span>*/}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Active Shards Percent As Number">
              <Progress
                type="dashboard"
                percent={clusterHealth?.activeShardsPercentAsNumber}
                format={percent => `${percent.toFixed(2)}%`}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Store size in bytes">
              <Progress
                type="dashboard"
                percent={Math.min(100, ((cluster?.storeSizInBytes / cluster?.storeTotalDataSetSizeInBytes) * 100))}
                format={() => formatBytes(cluster?.storeSizInBytes)}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 性能指标 */}
      <Row gutter={[16, 16]} className={styles['row-container']}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Indices Count"
              value={cluster?.indicesCount}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Indices Doc Count"
              value={cluster?.indicesDocCount}
              prefix={<OrderedListOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Indices Doc Deleted"
              value={cluster?.indicesDocDeleted}
              prefix={<PieChartOutlined />}

            />
          </Card>
        </Col>
      </Row>


      {/* 详细信息标签页 */}
      <div className={styles['row-container']}>
        <WindowsTitle
          title={'Nodes'}
          icon={ServerIconFinder.getServerIcon('Elasticsearch', 'cluster')}
          size={'default'}
        />
        <Table
          columns={nodeColumns}
          dataSource={nodes}
          rowKey="name"
          pagination={false}
          size="middle"
        />
      </div>

      <div className={styles['row-container']}>
        <WindowsTitle
          title={'Indices'}
          icon={ServerIconFinder.getServerIcon('Elasticsearch', 'index')}
          size={'default'}
        />
        <Table
          columns={indexColumns}
          dataSource={indices}
          rowKey="name"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </div>


    </div>
  )
    ;
};


// 使用示例


export const ElasticsearchDashboard = (props: IBaseState) => {
  const { server } = props;
  const [esData, setEsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const esService = useInjectable<IEsService>(EsService);

  useEffect(() => {
    fetchESData();
    // const interval = setInterval(fetchESData, 10000); // 每10秒刷新
    // return () => clearInterval(interval);
  }, []);

  const fetchESData = async () => {
    try {
      setDataLoading(true);
      const dataResult = await esService.dashboard({ server });
      if (dataResult.success) {
        setEsData(dataResult.data);
      } else {
        setError(dataResult.message);
      }
      //setEsData(testData,);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  return (


    <ElasticsearchDashboardView
      data={esData}
      loading={loading}
      dataLoading={dataLoading}
      error={error}
      refreshClick={fetchESData}
    />

  );
};

