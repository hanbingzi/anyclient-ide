// ClusterHealth.tsx
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Progress, Row, Spin, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import styles from './es-cluster-health.module.less';
import { useInjectable } from '@opensumi/ide-core-browser';
import { IEsService } from '../../../server-client/common/types/es.types';
import { IBaseState } from '../../common/data-browser.types';
import { EsService } from '../../../server-client/browser/services/es-service';

// 定义接口
interface ClusterHealthData {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
  delayed_unassigned_shards: number;
  number_of_pending_tasks: number;
  number_of_in_flight_fetch: number;
  task_max_waiting_in_queue_millis: number;
  active_shards_percent_as_number: number;
}


export const ClusterHealthInfo: React.FC<{ data?: ClusterHealthData; loading?: boolean; error?: string }> = ({
                                                                                                               data,
                                                                                                               loading = false,
                                                                                                               error,
                                                                                                             }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return '#52c41a';
      case 'yellow':
        return '#faad14';
      case 'red':
        return '#f5222d';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'yellow':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'red':
        return <WarningOutlined style={{ color: '#f5222d' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!data) {
    return <Alert message="No data available" type="warning" showIcon />;
  }

  const shardMetrics = [
    { label: 'Active Shards', value: data.active_shards },
    { label: 'Active Primary', value: data.active_primary_shards },
    { label: 'Relocating', value: data.relocating_shards },
    { label: 'Initializing', value: data.initializing_shards },
    { label: 'Unassigned', value: data.unassigned_shards },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div>
        Cluster: {data.cluster_name}
        <Badge
          style={{ marginLeft: '10px' }}
          color={getStatusColor(data.status)}
          text={data.status.toUpperCase()}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 30 }}>
        {/* 分片健康度 */}
        <Col xs={24} lg={8}>
          <div className={styles['card-container']} title="Shard Health">
            <Tooltip title="Active Shards Percentage">
              <Progress
                type="circle"
                percent={Math.round(data.active_shards_percent_as_number)}
                status={data.status === 'green' ? 'success' : 'normal'}
              />
              <div className={styles['metric-label']}>Active Shards Percentage</div>
            </Tooltip>
          </div>
        </Col>

        {/* 集群概览 */}
        <Col xs={24} lg={8}>
          <div className={styles['card-container']} title="Cluster Overview">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Tooltip title="Total Nodes">
                  <div className={styles['metric-value']}>{data.number_of_nodes}</div>
                  <div className={styles['metric-label']}>Total Nodes</div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Data Nodes">
                  <div className={styles['metric-value']}>{data.number_of_data_nodes}</div>
                  <div className={styles['metric-label']}>Data Nodes</div>
                </Tooltip>
              </Col>
            </Row>
          </div>
        </Col>


        {/* 任务状态 */}
        <Col xs={24} lg={8}>
          <div className={styles['card-container']} title="Task Status">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Tooltip title="Pending Tasks">
                  <div className={styles['metric-value']}>{data.number_of_pending_tasks}</div>
                  <div className={styles['metric-label']}>Pending Tasks</div>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="In Flight Fetch">
                  <div className={styles['metric-value']}>{data.number_of_in_flight_fetch}</div>
                  <div className={styles['metric-label']}>In Flight Fetch</div>
                </Tooltip>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      {/* 分片详情 */}
      <div className={styles['card-container']} style={{ marginTop: 20 }} title="Shard Details">
        <Row gutter={[16, 16]}>
          {shardMetrics.map((metric) => (
            <Col xs={24} sm={12} md={8} lg={4} key={metric.label}>
              <Card>
                <Tooltip title={metric.label}>
                  <div className={styles['metric-value']}>{metric.value}</div>
                  <div className={styles['metric-label']}>{metric.label}</div>
                </Tooltip>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};


export const EsClusterHealth = (props: IBaseState) => {
  const { server } = props;
  const [healthData, setHealthData] = useState<ClusterHealthData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const esService = useInjectable<IEsService>(EsService);
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await esService.clusterHealth({ server });
        // const data = await response.json();
        if (response.success) {
          setHealthData(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthData();
    // 可以设置定时刷新
    const interval = setInterval(fetchHealthData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ClusterHealthInfo
      data={healthData}
      loading={loading}
      error={error}
    />
  );
};

