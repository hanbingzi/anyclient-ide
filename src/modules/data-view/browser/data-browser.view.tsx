import React, { useCallback, useState } from 'react';
import ResizeObserver from 'rc-resize-observer';
import { ConfigProvider } from 'antd';
import '@opensumi/antd-theme/lib/index.css';
import { ReactEditorComponent } from '@opensumi/ide-editor/lib/browser';
import { NavigationBar } from './navigation/navigation.view';
import { OpenViewParam } from '../../base/param/open-view.param';
import { TableViewView } from './table-view/table-view.view';
import { IBaseState, ViewState } from '../common/data-browser.types';
import { TableEditView } from './table-edit/table-edit.view';
import { RedisKeyView } from './redis-view/redis-view.view';
import { ViewViewView } from './view-view/view-view.view';
import { AllNodeType, ServerType } from '../../base/types/server-node.types';
import { ZookeeperView } from './zk-view/zookeeper-view.view';
import { KeyValueList } from '../../components/data-view';
import { WindowsTitle } from '../../components/title';
import { ServerIconFinder } from '../../base/config/server-icon.config';
import { TopicAddMessageView, TopicCreateView } from './kafka-view';
import { TopicView } from './kafka-view/topic-view.view';
import { ServerClassNamespace } from '../../base/config/server.config';
import { SqlDbEditView } from './sql-db-edit';
import { KeyAddView } from './redis-view/key-add.view';
import { ObjectDataView } from './object-data/object-data.view';
import styles from './data-browser.module.less';
import { EtcdKeyView } from './etcd-view/etcd-key-view.view';
import { EtcdUserView } from './etcd-view/users/etcd-user.view';
import { EtcdRoleView } from './etcd-view/roles/etcd-role.view';
import { EtcdClusterView } from './etcd-view/cluster/etcd-cluster.view';

import { EsIndexView } from './es-view/es-index-view.view';
import { EsClusterHealth } from './es-view/es-cluster-health';
import SqlModeServer = ServerClassNamespace.SqlModeServer;
import { KafkaStatus } from './kafka-view/kafka-status.view';

export const DataBrowserView: ReactEditorComponent<OpenViewParam> = ({ resource }) => {
  const { nodeName, nodeValue, db, schema, serverId, serverType, nodeType, option, path, extra, server, breadCrumb } =
    resource.metadata!;
  const openUri = resource.uri;
  const ref = React.useRef<any>(null);

  const [viewState, setViewState] = useState<ViewState>({ width: 0, height: 0 });
  const baseProps: IBaseState = {
    viewState,
    serverId,
    server,
    serverType,
    openUri,
    nodeName,
    nodePath: path,
    nodeType,
    option,
    db,
    schema,
  };
  //console.log(`dataView---->`, baseProps);
  const renderSimpleData = useCallback(
    ({ data, title }: { data: { [key: string]: any }; title: string }) => {
      return (
        <div className={styles['simple-data-container']}>
          <WindowsTitle
            title={title}
            icon={ServerIconFinder.getServerIcon(serverType as ServerType, nodeType)}
            size={'default'}
          />
          <KeyValueList value={data} lineStyle={{ marginTop: '22px' }} />
        </div>
      );
    },
    [nodeType, serverType, nodeValue],
  );

  const renderContent = () => {
    if (SqlModeServer.includes(serverType)) {
      if (nodeType === 'server') {
        //关系数据库
        if (option === 'create') return <SqlDbEditView {...baseProps} />;
      } else if ((['db', 'schema', 'basicDb'] as AllNodeType[]).includes(nodeType)) {
        if (option === 'edit' || option === 'create') return <SqlDbEditView {...baseProps} />;
      } else if (nodeType === 'table' || nodeType === 'basicTable') {
        if (option === 'open') {
          return <TableViewView {...baseProps} />;
        } else if (option === 'edit' || option === 'create') {
          return <TableEditView {...baseProps} />;
        }
      } else if (nodeType === 'view' || nodeType === 'basicView') {
        return <ViewViewView {...baseProps} />;
      } else if (
        nodeType === 'sequence' ||
        nodeType === 'function' ||
        nodeType === 'procedure' ||
        nodeType === 'trigger'
      ) {
        return <ObjectDataView {...baseProps} />;
      }
    } else if (serverType === 'Redis') {
      if (nodeType === 'redisDb') {
        if (option === 'create') return <KeyAddView {...baseProps} />;
      } else if (
        nodeType === 'redisHash' ||
        nodeType === 'redisList' ||
        nodeType === 'redisSet' ||
        nodeType === 'redisString' ||
        nodeType === 'redisZSet'
      )
        return <RedisKeyView {...baseProps} />;
    } else if (serverType === 'Elasticsearch') {
      if (nodeType === 'index') {
        if (option === 'open') {
          return <EsIndexView {...baseProps} />;
        }
      } else if (nodeType === 'cluster') {
        return <EsClusterHealth {...baseProps} />;
      }
    } else if (serverType === 'Zookeeper') {
      if (nodeType === 'zkNode') return <ZookeeperView {...baseProps} fullPath={nodeValue as string} />;
    } else if (serverType === 'Kafka') {
      if (nodeType === 'kafkaBroker' || nodeType === 'group') {
        return renderSimpleData({ data: extra ? JSON.parse(extra as string) : {}, title: nodeType });
      } else if (option === 'create' && (nodeType === 'topic' || nodeType === 'topics')) {
        return <TopicCreateView {...baseProps} />;
      } else if (nodeType === 'topic' && option === 'open') {
        return <TopicView {...baseProps} />;
      } else if (nodeType === 'topic' && option === 'addChild') {
        return <TopicAddMessageView {...baseProps} />;
      } else if(nodeType==='status'){
        return <KafkaStatus {...baseProps}/>
      }
    } else if (serverType === 'Etcd') {
      if (option === 'open') {
        if (nodeType === 'key') {
          return <EtcdKeyView {...baseProps} />;
        } else if (nodeType === 'users') {
          return <EtcdUserView {...baseProps} />;
        } else if (nodeType === 'roles') {
          return <EtcdRoleView {...baseProps} />;
        } else if (nodeType === 'cluster') {
          return <EtcdClusterView {...baseProps} />;
        }
      } else if (option === 'create' && (nodeType === 'key' || nodeType === 'dic' || nodeType === 'data')) {
        return <EtcdKeyView {...baseProps} />;
      }
    }
    return <div>数据错误</div>;
  };

  return (
    <>
      <NavigationBar parts={breadCrumb} />
      <ResizeObserver
        onResize={({ width, height }) => {
          //console.log(`onResize:,width:${width},height:${height}`)
          setViewState({ width, height });
        }}
      >
        <div className={styles['data-browser-container']} ref={ref}>
          <ConfigProvider prefixCls="sumi_antd" getPopupContainer={() => ref.current}>
            {renderContent()}
          </ConfigProvider>
        </div>
      </ResizeObserver>
    </>
  );
};
