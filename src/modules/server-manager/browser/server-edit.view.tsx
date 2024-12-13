import React, { useCallback, useEffect, useState } from 'react';
import styles from './server.module.less';
import { useInjectable, uuid } from '@opensumi/ide-core-browser';
import { IServerEditService } from '../common';
import { ServerIcon } from '../../base/config/server-icon.config';
import { Alert, Checkbox } from 'antd';
import { Button, Select, Tabs } from '@opensumi/ide-components';
import { ServerCluster, ServerInfo } from '../../local-store-db/common';
import { LabelInput, LabelItem } from '../../components/form';
import { observer } from 'mobx-react-lite';
import { ITableColumn } from '../../components/table-editor';
import { ServerType } from '../../base/types/server-node.types';
import useTable from '../../components/table-editor/hook/useTable';
import { AppConstants } from '../../../common/constants';
import { QueryUtil } from '../../base/utils/query-util';
import { ServerPreferences } from '../../base/config/server-info.config';
import cls from 'classnames';
import {
  ClusterMember,
  CommonServerInfoForm,
  EsServerForm,
  ExtraConnectInputForm,
  OracleServerForm,
  RedisServerForm,
} from './server-edit-info.view';
import { isEmpty } from '../../base/utils/object-util';

export interface ServerEditProps {
  selectedServer: ServerType;
  activeTabId: number;
  form: Partial<ServerInfo>;
  handleChangeForm: (name: string, value: string | number | boolean) => void;
}

export interface ServerInputFormProps {
  form: Partial<ServerInfo>;
  handleChangeForm: (name: string, value: string | number | boolean) => void;
  //defaultHost?: string;
  //defaultPort?: number;
  enableUser?: boolean;
  //defaultUser?: string;
  enablePassword?: boolean;
  enableToken?: boolean;
  //defaultPassword?: string;
  enableClientId?: boolean;
  enableGroupId?: boolean;
  clientIdRequired?: boolean;
  enableDatabase?: boolean;
  databaseRequired?: boolean;
  enableTenant?: boolean;
  tenantRequired?: boolean;
  enableShowDefaultDb?: boolean;
  enableTimezone?: boolean;
  enableConnectEncoding?: boolean;
  enableMaximumPoolSize?: boolean;
  enableMininumIdle?: boolean;
  enableIdleTimeout?: boolean;
  enableMaxLifeTime?: boolean;
}

//import {Button} from "@opensumi/ide-components";

const ServerEditView = observer(() => {
  const serverEditService = useInjectable<IServerEditService>(IServerEditService);

  const {
    selectedServer,
    pageState,
    serverInfo,
    cluster: storeCluster,
    testConnectResult: connectResult,
    testIsLoading: isLoading,
    jdkIsError,
  } = serverEditService;
  const serverSetting = ServerPreferences[selectedServer];
  //let serverNameIsInput = false;
  const [form, setForm] = useState<Partial<ServerInfo>>({});

  //标识用户是否输入过servername，没有输入过，就自动生成servername

  const [activeTabId, setActiveTabId] = useState<number>(0);
  const [cluster, setCluster] = useState<ServerCluster[]>([]);
  const [userInputName, setUserInputName] = useState<boolean>(false);
  const [columns, setColumns] = useState<ITableColumn[]>([]);
  const [tableInstance] = useTable();
  const { getStore, getDeleteStore } = tableInstance;
  //console.log('server edit:', tableInstance?.getStore())

  useEffect(() => {
    //console.log('我是在什么时候运行', serverInfo);
    if (pageState === 'edit') {
      //console.log('我会被初始化几次edit');
      if (serverInfo) {
        setForm({ ...serverInfo });
        //if (serverInfo.connectionType && serverInfo.connectionType === 'Cluster' && storeCluster) {
        setCluster(storeCluster ? storeCluster : []);
        //}
        if (serverInfo.serverName !== getServerName(serverInfo)) {
          //验证servername是否是自动生成的，
          setUserInputName(true);
        }
      }
    }
    if (pageState === 'input') {
      // let defaultUser = '';
      // let defaultPort = 0;
      // let defaultInstanceName = '';
      // let defaultClientId = '';
      // let defaultGroupId = '';
      // let defaultConnectionType: AllConnectionType = '';
      // let defaultOrclServerType = '';
      // let defaultTenant = '';
      // let defaultRedisMasterName = ''
      let tempForm: ServerInfo = {
        rememberMe: true,
        serverType: selectedServer,
        usingSsh: false,
        sshPort: 22,
        sshCheckType: 1,
        sshRememberMe: true,
        connectTimeout: 5000,
        requestTimeout: 5000,
        maximumPoolSize: 5,
        minimumIdle: 1,
        idleTimeout: 600000,
        maxLifeTime: 1800000,
      };
      switch (selectedServer) {
        case 'Mariadb':
        case 'Mysql':
          tempForm.user = 'root';
          tempForm.port = 3306;
          break;
        case 'Postgresql':
          tempForm.user = 'postgres';
          tempForm.port = 5432;
          break;
        case 'Oracle':
          tempForm.port = 1521;
          tempForm.instanceName = 'ORCL';
          tempForm.orclServerType = 'Service Name';
          break;
        case 'SQLServer':
          tempForm.user = 'sa';
          tempForm.port = 1433;
          break;
        case 'DM':
          tempForm.user = 'SYSDBA';
          tempForm.port = 5236;
          break;
        case 'TiDB':
          tempForm.user = 'root';
          tempForm.port = 4000;
          break;
        case 'OceanBase':
          tempForm.user = 'root';
          tempForm.port = 2881;
          break;
        case 'DB2':
          tempForm.user = 'db2inst1';
          tempForm.port = 50000;
          break;
        case 'ClickHouse':
          tempForm.user = 'default';
          tempForm.port = 8123;
          break;
        case 'Redis':
          tempForm.connectionType = 'Standalone';
          tempForm.port = 6379;
          tempForm.redisMasterName = 'mymaster';
          break;
        case 'Hive':
          tempForm.user = 'root';
          tempForm.port = 10000;
          break;
        case 'Etcd':
          tempForm.port = 2379;
          break;
        case 'Zookeeper':
          tempForm.port = 2181;
          break;
        case 'Consul':
          tempForm.port = 8500;
          break;
        case 'Eureka':
          tempForm.port = 8761;
          break;
        case 'Kafka':
          tempForm.port = 9092;
          tempForm.connectionType = 'Standalone';
          tempForm.clientId = `${AppConstants.AppName}-${uuid(10)}`;
          tempForm.groupId = `${AppConstants.AppName}-groupid-${uuid(10)}`;
          break;
        case 'Rabbitmq':
          tempForm.port = 5672;
          break;
        case 'Rocketmq':
          tempForm.port = 9876;
          break;
        case 'Influxdb':
          tempForm.port = 8086;
          break;
        case 'Elasticsearch':
          tempForm.url = 'http://localhost:9200';
          tempForm.authType = 'noAuth';
          break;
        case 'Presto':
        case 'Trino':
          tempForm.port = 8080;
          tempForm.user = 'root';
          break;
        case 'TDEngine':
          tempForm.port = 6041;
          tempForm.user = 'root';
          break;

      }

      let serverName = getServerName(tempForm);
      setForm({ serverName, ...tempForm });
    }

    let columns: ITableColumn[] = [];
    let host = { title: 'host', columnKey: 'host', width: 150 };
    let port = { title: 'port', columnKey: 'port', width: 100 };
    let user = { title: 'user', columnKey: 'user', width: 150 };
    let password = { title: 'password', columnKey: 'password', width: 150 };
    switch (selectedServer) {
      case 'Redis':
        columns = [
          { ...host, width: 250 },
          { ...port, width: 150 },
        ];
        break;
      case 'Kafka':
        columns = [
          { ...host, width: 250 },
          { ...port, width: 150 },
        ];
        break;
    }
    setColumns(columns);
  }, [pageState, serverInfo, selectedServer, storeCluster]);

  const getClusterData = (): ServerCluster[] => {
    const store = getStore();
    let cluster: ServerCluster[] = [];
    if (store) {
      for (let item of store) {
        cluster.push(item[1] as ServerCluster);
      }
    }
    return cluster;
  };
  const getDeleteClusterId = (): string[] => {
    const deleteStore = getDeleteStore();
    let deleteClusterId: string[] = [];
    if (deleteStore) {
      for (let item of deleteStore) {
        deleteClusterId.push((item[1] as ServerCluster).clusterId);
      }
    }
    return deleteClusterId;
  };

  const handleSubmit = useCallback(() => {
    let tableCluster: ServerCluster[] | null = null;
    let deleteClusterId: string[] | null = null;
    if (form.connectionType === 'Cluster') {
      tableCluster = getClusterData();
      deleteClusterId = getDeleteClusterId();
    }
    //prettier-ignore
    console.log('onFinish,form:', form, 'pageState:', pageState, ',new cluster:', tableCluster, 'deleteClusterId', deleteClusterId);
    if (pageState === 'input') {
      serverEditService.saveConnect(form, tableCluster);
    } else {
      serverEditService.editConnect(form, tableCluster, deleteClusterId);
    }
  }, [pageState, form, getClusterData, getDeleteClusterId]);

  const handleTestConnect = useCallback(async () => {
    //const serverInfo = form.getFieldsValue();
    // console.log('testConnect->', form.getFieldsValue())

    let tableCluster: ServerCluster[] | null = null;
    if (form.connectionType === 'Cluster') {
      tableCluster = getClusterData();
      //console.log('cluster:', tableCluster);
    }

    serverEditService.testConnect(form, tableCluster);
  }, [form, getClusterData]);

  const getServerName = (serverInfo: Partial<ServerInfo>) => {
    let serverName = selectedServer;
    if (serverInfo.host) {
      serverName += `-${serverInfo.host}`;
    }
    if (serverInfo.user) {
      serverName += `-${serverInfo.user}`;
    }
    return serverName;
  };

  const handleChangeForm = (formName: string, value) => {
    serverEditService.resetTestConnect();
    console.log(`handleChangeForm:name:${formName};value:${value}`)
    form[formName] = value;
    if (!userInputName) {
      const serverName = getServerName(form);
      if (form.serverName !== serverName) form.serverName = serverName;
    }
    // console.log('set serverName:', serverName, form)
    setForm({ ...form });
  };

  const handleServerNameChange = (value: string) => {
    form.serverName = value;
    if (!userInputName) {
      setUserInputName(true);
    }
    setForm({ ...form });
  };

  const renderSelectConnectionType = useCallback(() => {
    return (
      <LabelItem label={'Connection'}>
        <Select
          style={{ width: '100%' }}
          options={['Standalone', 'Cluster']}
          value={form.connectionType}
          onChange={(value) => {
            setForm({ ...form, connectionType: value });
          }}
        />
      </LabelItem>
    );
  }, [form]);

  const renderServerEditInfo = () => {
    const props: ServerEditProps = { form, selectedServer, activeTabId, handleChangeForm };
    let formHtml = null;
    switch (selectedServer) {
      case 'Redis':
        formHtml = <RedisServerForm {...props} enableUser={true} enablePassword={true} />;
        break;
      case 'Oracle':
        formHtml = <OracleServerForm {...props} enableUser={true} enablePassword={true} />;
        break;
      case 'OceanBase':
        formHtml = <CommonServerInfoForm {...props} enableTenant={true} enableUser={true} enablePassword={true} />;
        break;
      case 'DB2':
        formHtml = (
          <CommonServerInfoForm
            {...props}
            enableDatabase={true}
            databaseRequired={true}
            enableUser={true}
            enablePassword={true}
          />
        );
        break;
      case 'Elasticsearch':
        formHtml = <EsServerForm {...props} />;
        break;
      case 'Etcd':
        formHtml = <CommonServerInfoForm {...props} enableUser={true} enablePassword={true} />;
        break;
      case 'Zookeeper':
        formHtml = <CommonServerInfoForm {...props} enableUser={true} enablePassword={true} />;
        break;
      case 'Consul':
        break;
      case 'Eureka':
        break;
      case 'Kafka':
        formHtml = (
          <>
            {renderSelectConnectionType()}
            {form.connectionType === 'Standalone' ? (
              <CommonServerInfoForm {...props} enableClientId={true} enableGroupId={true} />
            ) : (
              <>
                <ClusterMember columns={columns} tableInstance={tableInstance} cluster={cluster} />
                <ExtraConnectInputForm {...props} enableClientId={true} enableGroupId={true} />
              </>
            )}
          </>
        );
        break;
      default:
        formHtml = <CommonServerInfoForm {...props} enableUser={true} enablePassword={true} />;
    }

    const serverSetting = ServerPreferences[form.serverType];
    return (
      <div
        className={cls(
          styles['server-info'],
          activeTabId === 0 ? styles['server-edit-show'] : styles['server-edit-hidden'],
        )}
      >
        <LabelInput
          label={'连接名'}
          value={form.serverName}
          required={true}
          message={'连接名不能为空'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleServerNameChange(value);
          }}
        />
        {serverSetting?.versions ? (
          <LabelItem label={'version'}
                     style={{ marginTop: '12px' }}
                     required={serverSetting.versionForce}
          >
            <Select
              value={form.version}
              options={['', ...serverSetting.versions]}
              onChange={(value) => handleChangeForm('version', value)}
            ></Select>
          </LabelItem>
        ) : null}
        {formHtml}
      </div>
    );
  };

  //[form, tableInstance, cluster, renderSelectConnectionType, handleChangeForm])

  return (
    <div className={styles['server-edit-wrap']}>
      <div className={styles['server-edit-title']}>
        <span className={styles['server-edit-title-icon']}>{selectedServer && ServerIcon[selectedServer].icon}</span>
        <span className={styles['server-edit-title-content']}>{selectedServer}</span>
      </div>
      <Tabs
        tabs={['主要', '配置']} //'SSH'
        value={activeTabId}
        onChange={(index) => {
          console.log('--->', index);
          setActiveTabId(index);
        }}
      />
      <div className={styles['server-edit-container']}>
        {renderServerEditInfo()}
        <ServerEditSetting {...{ form, selectedServer, activeTabId, handleChangeForm }} />
        {/*<ServerEditSsh {...{ form, selectedServer, activeTabId, handleChangeForm }} />*/}
        <div style={{ marginTop: '16px' }}>
          {connectResult.stat === 'success' && <Alert message="连接成功" type="success" />}
          {jdkIsError && <Alert message={`JDK未安装，请先安装JDK，然后重启IDE`} type="error" />}
          {connectResult.stat === 'error' && (
            <Alert message={`连接失败:` + QueryUtil.getErrorMessage(connectResult.result!)} type="error" />
          )}
        </div>
      </div>

      <div className={styles['edit-option-container']}>
        <div>
          <Button size="large" onClick={handleTestConnect} loading={isLoading} type={'secondary'}>
            测试连接
          </Button>
        </div>
        {/*type='secondary'*/}
        <div>
          {pageState === 'input' && (
            <Button
              size="large"
              type={'secondary'}
              onClick={() => {
                serverEditService.last();
              }}
            >
              上一步
            </Button>
          )}
          &nbsp;
          {pageState === 'input' ? (
            <Button size="large" type={'primary'} onClick={handleSubmit}>
              保存
            </Button>
          ) : (
            <Button size="large" type={'primary'} onClick={handleSubmit}>
              修改
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export const ServerEditSetting = (props: ServerEditProps) => {
  const { form, handleChangeForm, activeTabId, selectedServer } = props;
  let enableTimezone = false,
    enableMaximumPoolSize = false,
    enableMininumIdle = false,
    enableIdleTimeout = false,
    enableMaxLifeTime = false,
    enableConnectEncoding = false,
    enableConnectTimeout = false,
    enableRequestTimeout = false;

  switch (selectedServer) {
    case 'OceanBase':
    case 'TiDB':
    case 'Presto':
    case 'Trino':
    case 'ClickHouse':
    case 'Hive':
    case 'DB2':
      enableTimezone = true;
      enableMaximumPoolSize = true;
      enableMininumIdle = true;
      enableIdleTimeout = true;
      enableMaxLifeTime = true;
      enableConnectEncoding = true;
      break;
    case 'Mysql':
    case 'Postgresql':
    case 'Oracle':
      enableTimezone = true;
      enableConnectEncoding = true;
      break;
    case 'SQLServer':
      enableTimezone = true;
      enableConnectEncoding = true;
      enableMaximumPoolSize = true;
      enableMininumIdle = true;
      enableIdleTimeout = true;
      break;
  }
  return (
    <div
      className={cls(
        styles['server-setting'],
        activeTabId === 1 ? styles['server-edit-show'] : styles['server-edit-hidden'],
      )}
    >


      <LabelInput
        label={'连接超时时间(毫秒)'}
        value={String(form.connectTimeout)}
        type={'number'}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('connectTimeout', value);
        }}
      />
      <LabelInput
        label={'请求超时时间(毫秒)'}
        value={String(form.requestTimeout)}
        type={'number'}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('requestTimeout', value);
        }}
      />
      {enableTimezone ? (
        <LabelInput
          label={'时区'}
          value={form.timezone}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('timezone', value);
          }}
        />
      ) : null}
      {enableMaximumPoolSize ? (
        <LabelInput
          label={'最大连接数'}
          value={String(form.maximumPoolSize)}
          type={'number'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('maximumPoolSize', value);
          }}
        />
      ) : null}
      {enableMininumIdle ? (
        <LabelInput
          label={'最小空闲连接数'}
          value={String(form.minimumIdle)}
          type={'number'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('minimumIdle', value);
          }}
        />
      ) : null}
      {enableIdleTimeout ? (
        <LabelInput
          label={'空闲连接超时时间(毫秒)'}
          value={String(form.idleTimeout)}
          type={'number'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('idleTimeout', value);
          }}
        />
      ) : null}

      {enableMaxLifeTime ? (
        <LabelInput
          label={'连接最大生命周期(毫秒)'}
          value={String(form.maxLifeTime)}
          type={'number'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('maxLifeTime', value);
          }}
        />
      ) : null}
    </div>
  );
};

export const ServerEditSsh = (props: ServerEditProps) => {
  const { form, handleChangeForm, activeTabId } = props;
  const [usingSsh, setUsingSsh] = useState<boolean>(false);

  useEffect(() => {
    setUsingSsh(form.usingSsh);
  }, [form.usingSsh]);

  return (
    <div
      className={cls(
        styles['server-ssh'],
        activeTabId === 2 ? styles['server-edit-show'] : styles['server-edit-hidden'],
      )}
    >
      <LabelItem label={'使用ssh隧道'} style={{ marginTop: '12px' }}>
        <Checkbox
          onChange={(value) => {
            console.log('使用ssh隧道', value.target.checked);
            handleChangeForm('usingSsh', value.target.checked);
          }}
          checked={form.usingSsh}
        />
      </LabelItem>
      <LabelInput
        label={'主机'}
        disabled={!usingSsh}
        value={form.sshHost}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('sshHost', value);
        }}
      />
      <LabelInput
        disabled={!usingSsh}
        label={'端口'}
        value={isEmpty(form.sshPort) ? '' : String(form.sshPort)}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('sshPort', value);
        }}
      />
      <LabelInput
        disabled={!usingSsh}
        label={'用户名'}
        value={form.sshUser}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('sshUser', value);
        }}
      />

      <LabelItem label={'验证方式'} style={{ marginTop: '12px' }}>
        <Select
          disabled={!usingSsh}
          value={form.sshCheckType}
          options={[
            { label: '密码', value: 1 },
            { label: '秘钥', value: 2 },
            { label: '密码加秘钥', value: 3 },
          ]}
          onChange={(value) => handleChangeForm('sshCheckType', value)}
        ></Select>
      </LabelItem>
      {(form.sshCheckType === 1 || form.sshCheckType === 3) && (
        <>
          <LabelInput
            disabled={!usingSsh}
            label={'密码'}
            value={form.sshPassword}
            style={{ marginTop: '12px' }}
            onValueChange={(value) => {
              handleChangeForm('sshPassword', value);
            }}
          />
          <LabelItem label={'记住密码'} style={{ marginTop: '12px' }}>
            <Checkbox
              onChange={(value) => {
                handleChangeForm('sshRememberMe', value.target.checked);
              }}
              checked={form.sshRememberMe}
            />
          </LabelItem>
        </>
      )}
      {(form.sshCheckType === 2 || form.sshCheckType === 3) && (
        <LabelInput
          disabled={!usingSsh}
          label={'私钥'}
          value={form.sshPublicKeyUrl}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('sshPublicKeyUrl', value);
          }}
        />
      )}
    </div>
  );
};

export default ServerEditView;
