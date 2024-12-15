import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IBaseState } from '../../common/data-browser.types';
import cls from 'classnames';
import styles from './etcd-view.module.less';
import { Button, ValidateInput } from '@opensumi/ide-components';
import { DisposableCollection, getIcon, localize, useInjectable } from '@opensumi/ide-core-browser';
import { EtcdKeyViewService } from './etcd-key-view.service';
import { StringEditorView } from '../../../doc-editor/browser/string-editor.view';
import { IEtcdDataInfo } from '../../../server-client/common/types/etcd.types';
import { uuid } from '@opensumi/ide-utils';

const extra_height = 59; //6(margin-top) +30(opt-height)+6(margin opt),不知道哪多了2px
export const EtcdKeyView = (props: IBaseState) => {
  const { openUri, option, nodePath, serverId, server, viewState, nodeName } = props;
  const { width, height } = viewState;
  const [keyName, setKeyName] = useState<string>(option === 'open' ? nodeName : '');

  //保持和数据库中的ttl一致
  const [keyValue, setKeyValue] = useState<any>();
  const [keyDataInfo, setKeyDataInfo] = useState<IEtcdDataInfo>();
  const [initFinish, setInitFinish] = useState<boolean>(false);

  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());
  const etcdViewService = useInjectable<EtcdKeyViewService>(EtcdKeyViewService);

  const viewId = useMemo(() => {
    const shortUUID = uuid(5);
    //这个变了会怎么样，研究下
    if (option === 'open') {
      return `etcd-view-${serverId}-${nodeName}-${shortUUID}`;
    } else if (option === 'create') {
      return `etcd-view-${serverId}-${nodeName}-create-${shortUUID}`;
    }
  }, [serverId, nodeName, option]);

  useEffect(() => {
    etcdViewService.init(openUri, nodePath, server!, option, nodeName!, viewId);
    ensureIsReady();
    //
  }, [serverId, nodeName, option]);

  const ensureIsReady = useCallback(async () => {
    await etcdViewService.whenReady;
  }, [etcdViewService]);

  useEffect(() => {
    disposableRef.current?.push(
      etcdViewService.onKeyInfoChange((keyInfo) => {
        //console.log('KeyInfo fire =====>:', keyInfo);
        setKeyDataInfo(keyInfo);
      }),
    );
    disposableRef.current?.push(
      etcdViewService.onDataChange((fireKeyValue) => {
        //console.log('chuanshu=====>:', keyValue.toString());
        setKeyValue(fireKeyValue);
      }),
    );

    disposableRef.current?.push(
      etcdViewService.onFirstInitFinish((init) => {
        // console.log('chuanshu=====>:', keyValue.toString());
        setInitFinish(init);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    etcdViewService.loadData();
  }, [keyName, option]);

  const handleAdd = useCallback(() => {
    etcdViewService.add(keyName);
  }, [keyName, etcdViewService]);

  const handleUpdate = useCallback(() => {
    etcdViewService.save(keyName);
  }, [keyName, etcdViewService]);

  const handleDelete = useCallback(() => {
    etcdViewService.deleteKey();
  }, [keyName, etcdViewService]);

  const renderInfo = useCallback(() => {
    //console.log('renderInfo,', keyDataInfo);
    let statView: any[] = [];
    if (keyDataInfo) {
      Object.keys(keyDataInfo).map((key) => {
        let itemValue = keyDataInfo[key];
        if (itemValue) {
          //console.log('key:',key,';itemValue',itemValue)
          // let value = (typeof itemValue === 'string' || typeof itemValue === 'number') ? itemValue : itemValue.toString('utf8');
          statView.push(
            <div key={key} className={styles['info-item']}>
              {key} : {itemValue}
            </div>,
          );
          //statView.push({name:key,value:stat[key]})
        }
      });
    }
    return [statView];
  }, [keyDataInfo]);

  return (
    <div className={styles['main-container']} style={{ width: width + 'px', height: height }}>
      <div className={styles['header-container']}>
        <div className={cls(styles['header-group'], styles['key-container'])}>
          <div className={cls(styles['group-item'], styles['group-title'])}>Key</div>
          <div className={cls(styles['group-item'], styles['key-input'])}>
            <ValidateInput
              type={'text'}
              // validate={hasValidateError}
              onBlur={() => {
                // handleKeyNameChange(value);
              }}
              onValueChange={(value) => {
                setKeyName(value);
              }}
              value={keyName}
            />
          </div>
        </div>
        <div className={cls(styles['header-group'], styles['ttl-container'])}>
          <div className={cls(styles['group-item'], styles['group-title'])}>TTL</div>
          <div className={cls(styles['group-item'], styles['ttl-input'])}>
            <ValidateInput value={keyDataInfo?.lease || '0'} />
          </div>
        </div>
        <div className={cls(styles['header-group'], styles['key-opt-container'])}>
          {option === 'create' ? (
            <Button title={localize('file.prompt.save')} iconClass={getIcon('plus')} size={'small'} onClick={handleAdd}>
              {localize('file.prompt.save')}
            </Button>
          ) : null}

          {option === 'open' ? (
            <Button
              title={localize('file.prompt.save')}
              iconClass={getIcon('check')}
              size={'small'}
              onClick={handleUpdate}
            >
              {localize('file.prompt.save')}
            </Button>
          ) : null}
          {/*{option === 'open' ? (*/}
          {/*  <Button*/}
          {/*    title={localize('file.prompt.save')}*/}
          {/*    iconClass={getIcon('refresh')}*/}
          {/*    size={'small'}*/}
          {/*    onClick={handleRefresh}*/}
          {/*  >*/}
          {/*    {localize('file.refresh')}*/}
          {/*  </Button>*/}
          {/*) : null}*/}
          {option === 'open' ? (
            <Button
              title={localize('file.delete')}
              iconClass={getIcon('close1')}
              size={'small'}
              type={'danger'}
              className={styles['right-button']}
              onClick={handleDelete}
            >
              {localize('file.delete')}
            </Button>
          ) : null}
        </div>

        {/*height:36*/}
      </div>
      <div
        className={styles['text-container']}
        style={{ width: width + 'px', height: height - extra_height, marginTop: '6px' }}
      >
        <StringEditorView
          width={width}
          height={height - extra_height}
          keyName={nodeName}
          isAdd={option === 'create'}
          keyData={keyValue}
          viewId={viewId}
          modelMethod={'Etcd'}
          dataType={'string'}
          connect={{ server: server! }}
          enableRefresh={option === 'open'}
          enableCopy={true}
          initFinish={initFinish}
        />
      </div>
      <div className={styles['info-row']}>{renderInfo()}</div>
    </div>
  );
};
