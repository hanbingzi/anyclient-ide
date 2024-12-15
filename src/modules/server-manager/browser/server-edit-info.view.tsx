import { LabelInput, LabelItem } from '../../components/form';
import { Checkbox, Radio } from 'antd';
import { Select } from '@opensumi/ide-components';
import { TableInstance } from '../../components/table-editor/hook/useTable';
import { ITableColumn, TableEditor } from '../../components/table-editor';
import { ServerCluster } from '../../local-store-db/common';
import styles from './server.module.less';
import React from 'react';
import { ServerInputFormProps } from './server-edit.view';

export const CommonServerInfoForm = (props: ServerInputFormProps) => {
  return (
    <>
      <AddressInputForm {...props} />
      <ExtraConnectInputForm {...props} />
      <UserInputForm {...props} />
    </>
  );
};
export const CommonAuthTypeForm = (props: ServerInputFormProps) => {
  const {
    handleChangeForm,
    form: { authType = 'account' },
  } = props;
  return (
    <>
      <AddressInputForm {...props} />
      <ExtraConnectInputForm {...props} />
      <LabelItem label={''}>
        <Radio.Group
          onChange={(v) => {

            handleChangeForm('authType', v.target.value);
          }}
          value={authType}
        >
          <Radio value={'account'}>Account</Radio>
          <Radio value={'token'}>Token</Radio>
        </Radio.Group>
      </LabelItem>
      {authType === 'token' ? <TokenInputForm {...props} /> : <UserInputForm {...props} />}
    </>
  );
};

export const AddressInputForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm } = props;

  return (
    <>
      <LabelInput
        label={'地址'}
        required={true}
        message={'地址不能为空'}
        value={form.host}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          //setForm({...form, host: value})
          handleChangeForm('host', value);
        }}
      />
      <LabelInput
        label={'端口'}
        type={'number'}
        value={String(form.port)}
        required={true}
        message={'端口不能为空'}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('port', value);
        }}
      />
    </>
  );
};

export const ExtraConnectInputForm = (props: ServerInputFormProps) => {
  const {
    form,
    handleChangeForm,
    enableDatabase = false,
    databaseRequired = false,
    enableTenant = false,
    tenantRequired = false,
    enableClientId = false,
    clientIdRequired = false,
    enableGroupId = false,
  } = props;
  return (
    <>
      {enableDatabase ? (
        <LabelInput
          label={'Database'}
          required={databaseRequired}
          message={'The database cannot be empty'}
          value={form.database}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            //setForm({...form, host: value})
            handleChangeForm('database', value);
          }}
        />
      ) : null}
      {enableTenant ? (
        <LabelInput
          label={'Tenant'}
          value={String(form.tenant)}
          required={tenantRequired}
          message={'The database cannot be empty'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('tenant', value);
          }}
        />
      ) : null}
      {enableClientId ? (
        <LabelInput
          label={'ClientId'}
          value={String(form.clientId)}
          required={clientIdRequired}
          message={'The clientId cannot be empty'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('clientId', value);
          }}
        />
      ) : null}
      {enableGroupId ? (
        <LabelInput
          label={'GroupId'}
          value={form.groupId}
          type={'text'}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('groupId', value);
          }}
        />
      ) : null}
    </>
  );
};

export const UserInputForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm, enableUser = false, enablePassword = false } = props;
  return (
    <>
      {enableUser ? (
        <LabelInput
          label={'用户名'}
          value={form.user}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('user', value);
          }}
        />
      ) : null}
      {enablePassword ? (
        <>
          <LabelInput
            label={'密码'}
            value={form.password}
            type={'password'}
            style={{ marginTop: '12px' }}
            onValueChange={(value) => {
              handleChangeForm('password', value);
            }}
          />
          <LabelItem label={'记住密码'} style={{ marginTop: '12px' }}>
            <Checkbox
              onChange={(value) => {
                handleChangeForm('rememberMe', value.target.checked);
              }}
              checked={form.rememberMe}
            />
          </LabelItem>
        </>
      ) : null}
    </>
  );
};

export const TokenInputForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm, enableToken = false } = props;
  return (
    <>
      {enableToken ? (
        <LabelInput
          label={'TOKEN'}
          value={form.token}
          style={{ marginTop: '12px' }}
          onValueChange={(value) => {
            handleChangeForm('token', value);
          }}
        />
      ) : null}
    </>
  );
};

export const OracleServerForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm, enableUser, enablePassword } = props;

  return (
    <>
      <AddressInputForm {...props} />
      <LabelInput
        label={'Service Name'}
        value={form.instanceName}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => handleChangeForm('instanceName', value)}
      />
      <LabelItem label={''}>
        <Radio.Group
          onChange={(v) => {
            handleChangeForm('orclServerType', v.target.value);
          }}
          value={form.orclServerType}
        >
          <Radio value={'Service Name'}>Service Name</Radio>
          <Radio value={'Sid'}>Sid</Radio>
        </Radio.Group>
      </LabelItem>
      <LabelItem label={'Role'}>
        <Select
          value={form.role}
          options={['', 'Default', 'SYSDBA', 'SYSOPER']}
          onChange={(value) => handleChangeForm('role', value)}
        ></Select>
      </LabelItem>
      <UserInputForm {...props} />
    </>
  );
};

export const RedisServerForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm, enableUser, enablePassword } = props;

  return (
    <>
      <LabelItem label={''}>
        <Radio.Group
          onChange={(v) => {
            handleChangeForm('connectionType', v.target.value);
          }}
          value={form.connectionType}
        >
          <Radio value={'Standalone'}>Standalone</Radio>
          <Radio value={'Cluster'}>Cluster</Radio>
          <Radio value={'Sentinel'}>Sentinel</Radio>
        </Radio.Group>
      </LabelItem>
      <AddressInputForm {...props} />
      <UserInputForm {...props} />
      {form.connectionType === 'Sentinel' ? (
        <>
          <LabelInput
            label={'Redis节点密码'}
            value={form.redisMasterPassword}
            type={'password'}
            style={{ marginTop: '12px' }}
            onValueChange={(value) => {
              handleChangeForm('redisMasterPassword', value);
            }}
          />

          <LabelInput
            label={'Master组名称'}
            value={form.redisMasterName}
            style={{ marginTop: '12px' }}
            onValueChange={(value) => handleChangeForm('redisMasterName', value)}
          />
        </>
      ) : null}


    </>
  );
};

export const EsServerForm = (props: ServerInputFormProps) => {
  const { form, handleChangeForm, enableUser, enablePassword } = props;

  return (
    <>
      <LabelInput
        label={'URL'}
        value={form.url}
        style={{ marginTop: '12px' }}
        onValueChange={(value) => {
          handleChangeForm('url', value);
        }}
      />
      <LabelItem label={''}>
        <Radio.Group
          onChange={(v) => {
            handleChangeForm('authType', v.target.value);
          }}
          value={form.authType}
        >
          <Radio value={'noAuth'}>No Auth</Radio>
          <Radio value={'account'}>Account</Radio>
          <Radio value={'token'}>Token</Radio>
        </Radio.Group>
      </LabelItem>


      {form.authType === 'account' ? (
        <UserInputForm form={form} handleChangeForm={handleChangeForm} enableUser={true} enablePassword={true}/>
      ) : form.authType === 'token' ? (
        <TokenInputForm form={form} handleChangeForm={handleChangeForm} enableToken={true}/>
      ) : null}


    </>
  );
};


export interface ClusterMemberProps {
  tableInstance: TableInstance;
  columns: ITableColumn[];
  cluster: ServerCluster[];
}

export const ClusterMember = (props: ClusterMemberProps) => {
  const { tableInstance, columns, cluster } = props;
  //经过测试发现，data必须使用state存储，否者会丢失数据
  //测试发现，不配置optionArgs会导致数据不可用
  return (
    <LabelItem label={'Members'}>
      <div className={styles['cluster-member']}>
        <TableEditor
          tableWidth={450}
          tableHeight={160}
          columns={columns}
          data={cluster}
          optionArgs={{ add: true, remove: true, update: true }}
          cellStyle={{ textAlign: 'center' }}
          firstRowIsEdit={true}
          table={tableInstance}
          clickOutSideClear={{ clearSelectedCell: false, clearSelectedRow: false }}
          immediateRemove={false}
        />
      </div>
    </LabelItem>
  );
};
