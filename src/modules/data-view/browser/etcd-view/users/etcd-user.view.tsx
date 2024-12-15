import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ITableRow, TableEditor } from '../../../../components/table-editor';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { IBaseState } from '../../../common/data-browser.types';
import { DataInputEnum } from '../../../../base/types/edit-input.types';
import { EtcdView,  } from '../etcd-constant';
import { LabelInput, LabelItem } from '../../../../components/form';
import { Button } from '@opensumi/ide-components';
import { Checkbox } from 'antd';
import { CheckboxValueType } from 'antd/es/checkbox/Group';
import styles from '../etcd-view.module.less';
import cls from 'classnames';
import { Icon } from '@opensumi/ide-core-browser/lib/components';
import { EtcdUserService } from './etcd-user.service';
const InputWidth = EtcdView.InputWidth;

/**
 * table view 展示
 * @param props
 * @constructor
 */

export const EtcdUserView = (props: IBaseState) => {
  const { viewState } = props;
  const { width, height } = viewState;
console.log('width----->', width);

  const [tableData, setTableData] = useState<ITableRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [addState, setAddState] = useState<boolean>(false);
  const [isLoading,setIsLoading] = useState<boolean>(true)
  const etcdUserService = useInjectable<EtcdUserService>(EtcdUserService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  useEffect(() => {
    etcdUserService.init(props);
    ensureIsReady();
  }, []);

  const userColumn = useCallback(() => {
    if (width !== 0) {
      const viewWidth = width < 600 ? 600 : width - 100 < 600 ? 600 : width - 100;
      const userWidth = Math.floor(viewWidth * 0.3);
      const roleWidth = Math.floor(viewWidth * 0.7);
      //console.log(`user:${userWidth},roleWidth:${roleWidth}`);
      return [
        { title: 'User', columnKey: EtcdView.User, dataType: DataInputEnum.string, width: userWidth },
        { title: 'Roles', columnKey: EtcdView.Roles, dataType: DataInputEnum.string, width: roleWidth },
      ];
    }
    return [];
  }, [width]);

  const ensureIsReady = useCallback(async () => {
    await etcdUserService.whenReady;
  }, [etcdUserService]);

  useEffect(() => {
    disposableRef.current?.push(
      etcdUserService.onDataChange((data) => {
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
    const result =  await etcdUserService.reloadData();
    setIsLoading(false)
    return result
  }, [etcdUserService]);

  const handleRemove = useCallback(
    (rows: ITableRow[]) => {
      return etcdUserService.removeUser(rows);
    },
    [etcdUserService],
  );
  const handleAddUser = useCallback(
    async (user: string, password: string, roles: string[]) => {
      setIsLoading(true)
      const isSuccess = await etcdUserService.save(user, password, roles);
      if (isSuccess) {
        handleRefresh();
        setAddState(false);
      }
      isLoading && setIsLoading(false)
    },
    [etcdUserService, handleRefresh,isLoading],
  );

  const handleShowAddView = useCallback(async () => {
    const roles = await etcdUserService.getAllRoles();
    setRoles(roles);
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
        columns={userColumn()}
        data={tableData}
        tableHeight={addState ? height - 400 : height}
        tableWidth={width}
        isLoading={isLoading}
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
        <AddUserView
          roles={roles}
          onSave={handleAddUser}
          onCancel={() => {
            setAddState(false);
          }}
        />
      ) : null}
    </div>
  );
};

export const AddUserView = ({
  roles,
  onSave,
  onCancel,
}: {
  roles: string[];
  onSave: (user: string, password: string, roles: string[]) => void;
  onCancel: () => void;
}) => {
  const [user, setUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectRoles, setSelectRoles] = useState<string[]>([]);
  const onChange = (checkedValues: CheckboxValueType[]) => {
    console.log('checked = ', checkedValues);
    setSelectRoles(checkedValues as string[])
    //setSelectRoles(checkedValues.map(item=>item.valueOf))
  };
  //const options = ['Apple', 'Pear', 'Orange', 'Banana', 'Purple', 'PinPear', 'Purple1', 'PinPear2'];
  return (
    <div className={styles['etcd-add-container']}>
      <div>
        <LabelInput
          size={'small'}
          label={'User'}
          value={user}
          style={{ width: InputWidth }}
          required={true}
          onValueChange={(value) => {
            setUser(value);
          }}
        />
        <LabelInput
          size={'small'}
          label={'Password'}
          value={password}
          type={'password'}
          style={{ width: InputWidth }}
          required={true}
          onValueChange={(value) => {
            setPassword(value);
          }}
        />
        <LabelItem label={'version'} size={'small'} style={{ width: InputWidth }}>
          <Checkbox.Group options={roles} defaultValue={selectRoles} onChange={onChange} />
        </LabelItem>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Button
          size='large'
          type={'primary'}
          onClick={() => {
            onSave(user, password, selectRoles);
          }}
        >
          保存
        </Button>
        <Button size='large' type={'secondary'} style={{ marginLeft: 18 }} onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
};
