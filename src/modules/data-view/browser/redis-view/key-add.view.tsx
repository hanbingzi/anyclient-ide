import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select } from '@opensumi/ide-components';
import { useInjectable } from '@opensumi/ide-core-browser';
import { LabelInput, LabelItem } from '../../../components/form';
import { IQueryResult } from '../../../server-client/common';
import { AlertView } from '../../../components/alert/alert.view';
import { WindowsTitle } from '../../../components/title';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import styles from './key-add.module.less';
import { RedisKeyAddService } from './key-add.service';
import { IBaseState } from '../../common/data-browser.types';
import { isNotEmpty, isNotNull } from '../../../base/utils/object-util';
import { RedisInputOption, RedisInputType, RedisType } from '../../../base/types/common-fields.types';
import { ITableColumn, TableEditor } from '../../../components/table-editor';
import { DataInputEnum } from '../../../base/types/edit-input.types';
import { StringEditorView } from '../../../doc-editor/browser/string-editor.view';
import useTable from '../../../components/table-editor/hook/useTable';
import { uuid } from '@opensumi/ide-utils';

// export const viewId = 'redis-add-key';
export const KeyAddView = (props: IBaseState) => {
  const {
    viewState: { width, height },
    serverId,
    server,
    serverType,
    openUri,
    nodeName,
    nodePath,
    nodeType,
    option,
    db,
  } = props;
  const [result, setResult] = useState<IQueryResult | null>();
  const [key, setKey] = useState<string>();
  const [ttl, setTtl] = useState<number>();
  const [isValidate, setIsValidate] = useState<boolean>(false);
  const [keyType, setKeyType] = useState<RedisInputType>('string');
  const [] = useState();
  const redisKeyAddService = useInjectable<RedisKeyAddService>(RedisKeyAddService);
  const [tableInstance] = useTable();
  const { getStore, dataObserver } = tableInstance;

  useEffect(() => {
    redisKeyAddService.init(props, viewId);
  }, []);

  const viewId = useMemo(() => {
    const shortUUID = uuid(5);
    return `redis-view-${serverId}-${db}-add-${shortUUID}`;
  }, [serverId, db]);

  const handleSave = useCallback(async () => {
    if (!key) {
      setIsValidate(true);
      return;
    }
    if (keyType === 'string') {
      redisKeyAddService.addKeyString(key, ttl);
    } else {
      const storeValue = getStore();
      redisKeyAddService.addKeyTable(key, keyType, storeValue, ttl);
      //console.log('table数据：------>', storeValue, ';key:', key);
    }
  }, [key, ttl, keyType, dataObserver]);

  const getColumn = useCallback(
    (redisType: RedisInputType): ITableColumn[] => {
      const viewWidth = width > 0 ? width - 40 - 70 : 500;
      if (redisType == 'hash') {
        const keyWidth = Math.floor(viewWidth * 0.3);
        const valueWidth = Math.floor(viewWidth * 0.7);
        const tableColumn: ITableColumn[] = [
          { title: 'Key', columnKey: 'key', dataType: DataInputEnum.string, width: keyWidth, nullAble: 'NO' },
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: valueWidth, nullAble: 'NO' },
        ];
        return tableColumn;
      }else if(redisType==='zset'){
        const scoreWidth = Math.floor(viewWidth * 0.3);
        const valueWidth = Math.floor(viewWidth * 0.7);
        return [
          { title: 'Score', columnKey: 'score', dataType: DataInputEnum.string, width: scoreWidth, nullAble: 'NO' },
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: valueWidth, nullAble: 'NO' },
        ];
      }
      else {
        const tableColumn: ITableColumn[] = [
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: viewWidth, nullAble: 'NO' },
        ];
        return tableColumn;
      }
    },
    [width],
  );

  const renderContent = useCallback(() => {
    if (isNotEmpty(keyType)) {
      switch (keyType) {
        case RedisType.string:
          //36未标题栏的高度,因为opensumi展示文档的原因，此处代码写的不符合逻辑
          return (
            <StringEditorView
              width={width - 42}
              height={300}
              // keyName={keyName}
              keyData={' '}
              viewId={viewId}
              modelMethod={'empty'}
              dataType={'string'}
              connect={{ server: server!, db }}
              enableRefresh={false}
              enableCopy={true}
              enableSave={false}
              bordered={false}
              isAdd={true}
              initFinish={true}
            />
          );
        case RedisType.hash:
        case RedisType.set:
        case RedisType.zset:
        case RedisType.list:
          return (
            <TableEditor
              cellStyle={{ textAlign: 'center' }}
              {...{
                tableWidth: width - 42,
                tableHeight: 300,
                option: true,
              }}
              columns={getColumn(keyType)}
              table={tableInstance}
              data={[]}
              firstRowIsEdit={true}
              optionArgs={{ search: false, add: true, cancel: true, remove: true, revert: true }}
              immediateRemove={true}
            />
          );
      }
    }
  }, [serverId, width, height, keyType, getColumn]);

  return (
    <div className={styles['input-container']}>
      <WindowsTitle title={'Key创建'} icon={ServerIconFinder.getServerIcon(serverType, nodeType)} />
      <LabelInput
        label={'Key'}
        value={key}
        required={true}
        isValidate={isValidate}
        message={'key不能为空'}
        onValueChange={(value) => {
          result && setResult(null);
          setKey(value);
          value && isValidate && setIsValidate(false);
        }}
      />

      <LabelItem label={'Type'} required={true}>
        <Select
          options={RedisInputOption}
          value={keyType}
          onChange={(value) => {
            setKeyType(value as RedisInputType);
          }}
        />
      </LabelItem>

      <LabelInput
        label={'TTL'}
        value={ttl ? String(ttl) : ''}
        type={'number'}
        onValueChange={(value) => {
          if (isNotNull(value)) {
            setTtl(Number(value));
          }
        }}
      />
      <div className={styles['value-container']}>{renderContent()}</div>

      <div className={styles['opt-message']}>
        {result ? (
          result.success ? (
            <AlertView message={'key新增成功'} type={'success'} />
          ) : (
            <AlertView message={result.message} type={'error'} />
          )
        ) : null}
      </div>

      <div className={styles['opt-button']}>
        <Button type={'primary'} style={{ marginLeft: '10px' }} onClick={handleSave}>
          保存
        </Button>
      </div>
    </div>
  );
};
