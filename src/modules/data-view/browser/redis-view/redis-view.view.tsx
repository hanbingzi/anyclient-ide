import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IBaseState } from '../../common/data-browser.types';
import cls from 'classnames';
import styles from './redis-view.module.less';
import { Button, ValidateInput } from '@opensumi/ide-components';
import { Icon } from '@opensumi/ide-core-browser/lib/components';
import { DisposableCollection, getIcon, useInjectable } from '@opensumi/ide-core-browser';
import { RedisViewService } from './redis-view.service';
import { isEmpty, isNotEmpty } from '../../../base/utils/object-util';
import { StringEditorView } from '../../../doc-editor/browser/string-editor.view';
import { ITableColumn, ITableRow, IUpdateDataResult, TableEditor } from '../../../components/table-editor';
import { RedisType } from '../../../base/types/common-fields.types';
import { DataInputEnum } from '../../../base/types/edit-input.types';
import { uuid } from '@opensumi/ide-utils';

const extra_height = 42; //6(margin-top) +30(opt-height)+6(margin opt),不知道哪多了2px
export const RedisKeyView = (props: IBaseState) => {
  const { openUri, nodePath, serverId, server, nodeType, viewState, db, nodeName: currentKeyName } = props;
  const { width, height } = viewState;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyType, setKeyType] = useState<string>('');
  const [keyName, setKeyName] = useState<string>(currentKeyName);
  const [inputKey, setInputKey] = useState<string>(currentKeyName);
  //保持和数据库中的ttl一致
  const [ttl, setTtl] = useState<number>(0);
  const [inputTtl, setInputTTL] = useState<number>(0);
  const [keyValue, setKeyValue] = useState<any>();

  const [initFinish,setInitFinish] = useState<boolean>(false)


  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());
  const redisViewService = useInjectable<RedisViewService>(RedisViewService);
  useEffect(() => {
    redisViewService.init(openUri, nodePath, server!, Number(db), currentKeyName!, nodeType);
    ensureIsReady();
    //
  }, []);

  const viewId = useMemo(() => {
    const shortUUID = uuid(5);
    return `redis-view-${serverId}-${db}-${keyName}-${shortUUID}`;
  }, [serverId, db, keyName]);


  const ensureIsReady = useCallback(async () => {
    await redisViewService.whenReady;
    setIsLoading(false);
    // redis type 一旦声明，不会改变
    setKeyType(redisViewService.getKeyType());
    setInputTTL(redisViewService.getKeyTtl());
    setTtl(redisViewService.getKeyTtl());
    setKeyValue(redisViewService.getData());
    //console.log('此时，数据能获取吗:',redisViewService.getKeyValue().toString())
  }, [redisViewService]);

  useEffect(() => {
    disposableRef.current?.push(
      redisViewService.onDataLoadingChange((isLoading) => {
        setIsLoading(isLoading);
      }),
    );
    disposableRef.current?.push(
      redisViewService.onKeyNameChange((keyName) => {
        setKeyName(keyName);
      }),
    );
    disposableRef.current?.push(
      redisViewService.onTtlChange((ttl) => {
        setTtl(ttl);
        setInputTTL(ttl);
      }),
    );
    disposableRef.current?.push(
      redisViewService.onKeyValueChange((keyValue) => {
        setKeyValue(keyValue);
      }),
    );
    disposableRef.current?.push(
      redisViewService.onFirstInitFinish((init) => {
        setInitFinish(init);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleKeyRevert = useCallback(() => {
    setInputKey(keyName);
  }, [keyName]);

  const handleTtlRevert = useCallback(() => {
    setInputTTL(ttl);
  }, [ttl]);

  const handleKeyRename = useCallback(() => {
    redisViewService.keyRename(inputKey);
  }, [keyName, inputKey]);

  const handleTtlUpdate = useCallback(() => {
    redisViewService.keyExpire(inputTtl);
  }, [ttl, inputTtl]);

  const handleKeyInfoRefresh = useCallback(() => {
    redisViewService.refreshInfo();
  }, []);

  const handleDataRefresh = useCallback(async () => {
    return await redisViewService.refreshData();
  }, []);

  const handleRemove = useCallback(async (removeData: ITableRow[]) => {
    return await redisViewService.removeData(removeData);
  }, []);

  const handleSave = useCallback(async (updateData: IUpdateDataResult): Promise<boolean> => {
    //console.log('-----------', updateData)
    return await redisViewService.save(updateData);
  }, []);

  const getColumn = useCallback(
    (redisType: RedisType): ITableColumn[] => {
      const viewWidth = width < 600 ? 600 : width - 100 < 600 ? 600 : width - 100;
      if (redisType == 'hash') {
        const keyWidth = Math.floor(viewWidth * 0.3);
        const valueWidth = Math.floor(viewWidth * 0.7);
        return [
          { title: 'Key', columnKey: 'key', dataType: DataInputEnum.string, width: keyWidth, nullAble: 'NO' },
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: valueWidth, nullAble: 'NO' },
        ];
      } else if (redisType === 'zset') {
        const scoreWidth = Math.floor(viewWidth * 0.3);
        const valueWidth = Math.floor(viewWidth * 0.7);
        return [
          { title: 'Score', columnKey: 'score', dataType: DataInputEnum.string, width: scoreWidth, nullAble: 'NO' },
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: valueWidth, nullAble: 'NO' },
        ];
      } else {
        return [
          { title: 'Value', columnKey: 'value', dataType: DataInputEnum.string, width: viewWidth, nullAble: 'NO' },
        ];
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
              width={width}
              height={height - extra_height}
              keyName={keyName}
              keyData={keyValue}
              viewId={viewId}
              modelMethod={'Redis'}
              dataType={'buffer'}
              connect={{ server: server!, db }}
              enableRefresh={true}
              enableCopy={true}
              enableSave={true}
              initFinish={initFinish}
            />
          );
        case RedisType.hash:
        case RedisType.set:
        case RedisType.zset:
        case RedisType.list:
          return (
            <TableEditor
              style={{ marginTop: '6px' }}
              cellStyle={{ textAlign: 'center' }}
              {...{
                tableWidth: width,
                tableHeight: height - extra_height,
                isLoading,
                option: true,
              }}
              columns={getColumn(keyType)}
              data={keyValue ? keyValue : []}
              optionArgs={{
                search: true,
                add: true,
                save: true,
                cancel: true,
                refresh: true,
                remove: true,
                revert: true,
                update:true
              }}
              onRefresh={handleDataRefresh}
              immediateRemove={true}
              onRemove={handleRemove}
              onSave={handleSave}
            />
          );
      }
    }
  }, [
    serverId,
    keyName,
    keyValue,
    width,
    height,
    keyType,
    getColumn,
    handleDataRefresh,
    handleRemove,
    initFinish,
    redisViewService,
  ]);

  return (
    <div className={styles['main-container']} style={{ width: width + 'px', height: height }}>
      <div className={styles['header-container']}>
        <div className={cls(styles['header-group'], styles['key-container'])}>
          <div className={cls(styles['group-item'], styles['group-title'])}>{keyType}</div>
          <div className={cls(styles['group-item'], styles['key-input'])}>
            <ValidateInput
              type={'text'}
              // validate={hasValidateError}
              onBlur={() => {
                // handleKeyNameChange(value);
              }}
              onValueChange={(value) => {
                setInputKey(value);
              }}
              value={inputKey}
            />
          </div>
          <div className={cls(styles['group-item'], styles['option'])}>
            <Icon
              tooltip={'撤销'}
              disabled={inputKey === keyName}
              icon={'rollback'}
              onClick={handleKeyRevert}
              className={cls('kt-clickable-icon', styles['cache-icon'])}
            />

            <Icon
              tooltip={'保存'}
              disabled={inputKey === keyName || isEmpty(inputKey)}
              icon={'check'}
              onClick={handleKeyRename}
              className={cls('kt-clickable-icon', styles['cache-icon'])}
            />
          </div>
        </div>
        <div className={cls(styles['header-group'], styles['ttl-container'])}>
          <div className={cls(styles['group-item'], styles['group-title'])}>TTL</div>
          <div className={cls(styles['group-item'], styles['ttl-input'])}>
            <ValidateInput
              type={'number'}
              onValueChange={(value) => {
                setInputTTL(Number(value));
              }}
              value={inputTtl + ''}
            />
          </div>
          <div className={cls(styles['group-item'], styles['option'])}>
            <Icon
              tooltip={'撤销'}
              disabled={ttl === inputTtl}
              icon={'rollback'}
              onClick={handleTtlRevert}
              className={cls('kt-clickable-icon', styles['cache-icon'])}
            />
            <Icon
              tooltip={'保存'}
              disabled={Number.isNaN(inputTtl) || ttl === inputTtl}
              icon={'check'}
              onClick={handleTtlUpdate}
              className={cls('kt-clickable-icon', styles['cache-icon'])}
            />
          </div>
        </div>
        <div className={cls(styles['header-group'], styles['key-opt-container'])}>
          <Button title={'刷新'} iconClass={getIcon('refresh')} size={'small'} onClick={handleKeyInfoRefresh}>
            刷新
          </Button>
          <Button
            title={'删除key'}
            iconClass={getIcon('close1')}
            size={'small'}
            type={'danger'}
            className={styles['right-button']}
            onClick={() => {
              redisViewService.deleteKey();
            }}
          >
            删除
          </Button>
        </div>
      </div>
      <div
        className={styles['text-container']}
        style={{ width: width + 'px', height: height - extra_height, marginTop: '6px' }}
      >
        {renderContent()}
      </div>
    </div>
  );
};
