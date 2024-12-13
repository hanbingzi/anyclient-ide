import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ITableColumn, ITableRow, TableEditor } from '../../../../components/table-editor';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { EtcdRoleService } from './etcd-role.service';
import { IBaseState } from '../../../common/data-browser.types';
import { DataInputEnum } from '../../../../base/types/edit-input.types';
import { EtcdView } from '../etcd-constant';
import { LabelInput, LabelItem } from '../../../../components/form';
import { Button } from '@opensumi/ide-components';
import styles from '../etcd-view.module.less';
import cls from 'classnames';
import { Icon } from '@opensumi/ide-core-browser/lib/components';
import useTable from '../../../../components/table-editor/hook/useTable';
import { IEtcdAddPermission } from '../../../../server-client/common/types/etcd.types';

const InputWidth = EtcdView.InputWidth;
/**
 * table view 展示
 * @param props
 * @constructor
 */

export const EtcdRoleView = (props: IBaseState) => {
  const { viewState } = props;
  const { width, height } = viewState;
  console.log('width----->', width);

  const [tableData, setTableData] = useState<ITableRow[]>([]);
  const [addState, setAddState] = useState<boolean>(false);
  const [isLoading,setIsLoading] = useState<boolean>(true)

  const etcdRoleService = useInjectable<EtcdRoleService>(EtcdRoleService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  useEffect(() => {
    etcdRoleService.init(props);
    ensureIsReady();
  }, []);

  const roleColumn = useCallback(() => {
    if (width !== 0) {
      const viewWidth = width < 600 ? 600 : width - 100 < 600 ? 600 : width - 100;
      const roleWidth = Math.floor(viewWidth * 0.3);
      const permissionWidth = Math.floor(viewWidth * 0.7);
      console.log(`role:${roleWidth},roleWidth:${roleWidth}`);
      return [
        { title: 'Role', columnKey: EtcdView.Role, dataType: DataInputEnum.string, width: roleWidth },
        {
          title: 'Permission',
          columnKey: EtcdView.Permissions,
          dataType: DataInputEnum.string,
          width: permissionWidth,
        },
      ];
    }
    return [];
  }, [width]);

  const ensureIsReady = useCallback(async () => {
    await etcdRoleService.whenReady;
  }, [etcdRoleService]);

  useEffect(() => {
    disposableRef.current?.push(
      etcdRoleService.onDataChange((data) => {
        console.log('dataChange', data);
        setTableData(data);
        setIsLoading(false)

      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    const result =  await etcdRoleService.reloadData();
    setIsLoading(false)
    return result
  }, [etcdRoleService]);

  const handleRemove = useCallback(
    async (rows: ITableRow[]) => {
      return await etcdRoleService.removeRole(rows);
    },
    [etcdRoleService],
  );

  const handleAddRole = useCallback(
    async (role: string, permissions: IEtcdAddPermission[]) => {
      setIsLoading(true)
      const isSuccess = await etcdRoleService.save(role, permissions);
      if (isSuccess) {
        handleRefresh();
        setAddState(false);
      }
      isLoading && setIsLoading(false)
    },
    [etcdRoleService, handleRefresh,isLoading],
  );

  const handleShowAddView = useCallback(async () => {
    setAddState(true);
  }, []);

  const renderExtraAdd = useCallback(() => {
    return (
      <div className={styles['etcd-opt-item-icon']} style={{ marginLeft: 10 }} onClick={handleShowAddView}>
        <Icon
          tooltip={'保存'}
          icon={'plus'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    );
  }, [addState]);

  return (
    <div style={{ marginTop: 6 }}>
      <TableEditor
        columns={roleColumn()}
        data={tableData}
        tableHeight={addState ? height - 400 : height}
        isLoading={isLoading}
        tableWidth={width}
        showTitleTypeIcon={true}
        onRefresh={handleRefresh}
        onRemove={handleRemove}
        optionView={{ location: 'afterSearch', view: renderExtraAdd() }}
        option={true}
        optionArgs={{ search: true, remove: true, refresh: true }}
        immediateRemove={true}
        cellStyle={{ textAlign: 'center' }}
      />
      {addState ? (
        <AddRoleView
          onSave={handleAddRole}
          onCancel={() => {
            setAddState(false);
          }}
        />
      ) : null}
    </div>
  );
};

const AddRoleColumn: ITableColumn[] = [
  { title: 'Prefix', columnKey: 'key', width: 200, dataType: DataInputEnum.string, nullAble: 'NO' },
  {
    title: 'Permission',
    columnKey: 'permission',
    nullAble: 'NO',
    width: 150,
    dataType: DataInputEnum.string,
    inputType: 'select',
    selectGroup: [
      { label: 'Read', value: 'Read' },
      { label: 'Write', value: 'Write' },
      {
        label: 'Readwrite',
        value: 'Readwrite',
      },
    ],
  },
];
export const AddRoleView = ({
  onSave,
  onCancel,
}: {
  onSave: (role: string, permissions: IEtcdAddPermission[]) => void;
  onCancel: () => void;
}) => {
  const [role, setRole] = useState<string>('');
  const [tableInstance] = useTable();
  const { getStore, getDeleteStore, dataObserver } = tableInstance;
  const handleSubmit = useCallback(() => {
    const addPermissions: IEtcdAddPermission[] = [];
    for (let item of getStore()) {
      addPermissions.push(item[1] as IEtcdAddPermission);
    }
    onSave(role,addPermissions)
   // console.log('addRoleView', getStore(), ',per:', addPermissions);
  }, [dataObserver, role,onSave]);
  return (
    <div className={styles['etcd-add-container']}>
      <div>
        <LabelInput
          label={'Role'}
          value={role}
          style={{ width: InputWidth }}
          required={true}
          onValueChange={(value) => {
            setRole(value);
          }}
        />

        <LabelItem label={'Permission'} style={{ width: InputWidth }}>
          <div className={styles['cluster-member']}>
            <TableEditor
              tableWidth={450}
              tableHeight={160}
              columns={AddRoleColumn}
              table={tableInstance}
              data={[]}
              optionArgs={{ add: true, remove: true, update: true }}
              cellStyle={{ textAlign: 'center' }}
              firstRowIsEdit={true}
              immediateRemove={false}
            />
          </div>
        </LabelItem>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Button size='large' type={'primary'} onClick={handleSubmit}>
          保存
        </Button>
        <Button size='large' type={'secondary'} style={{ marginLeft: 18 }} onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
};
