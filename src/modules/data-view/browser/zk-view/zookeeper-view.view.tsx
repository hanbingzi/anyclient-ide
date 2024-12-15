import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IZKInfoState } from '../../common/data-browser.types';
import cls from 'classnames';
import styles from './zookeeper-view.module.less';
import { Button } from '@opensumi/ide-components';
import { DisposableCollection, getIcon, localize, useInjectable } from '@opensumi/ide-core-browser';
import { ZookeeperViewService } from './zookeeper-view.service';
import { StringEditorView } from '../../../doc-editor/browser/string-editor.view';
import { IZkStat } from '../../../server-client/common';
import { BorderInput } from '../../../components/form';
import { isEmpty, isNotEmpty } from '../../../base/utils/object-util';
import { uuid } from '@opensumi/ide-utils';

const extra_height = 59; //6+30 22 30(标题高)22（详情高）6(margin-top)不知道哪多了1px
export const ZookeeperView = (props: IZKInfoState) => {
  const { openUri, nodePath, server, viewState, nodeName, fullPath, option } = props;
  const { width, height } = viewState;
  const [keyName, setKeyName] = useState<string>(option === 'create' ? fullPath + '/' : fullPath);
  //保持和数据库中的ttl一致
  const [keyData, setKeyData] = useState<any>();
  const [stat, setStat] = useState<IZkStat>();
  const [initFinish, setInitFinish] = useState<boolean>(false);

  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());
  const zookeeperViewService = useInjectable<ZookeeperViewService>(ZookeeperViewService);

  const viewId = useMemo(() => {
    const shortUUID = uuid(5);
    if (option === 'create') {
      return `zookeeper-view-${server?.serverId}-${fullPath}-create-${shortUUID}`;
    } else {
      return `zookeeper-view-${server?.serverId}-${fullPath}-${shortUUID}`;
    }
  }, [server, fullPath, option]);

  useEffect(() => {
    zookeeperViewService.init(openUri, nodePath, server!, option, nodeName, fullPath, viewId);
    ensureIsReady();
    //
  }, [props]);

  const ensureIsReady = useCallback(async () => {
    await zookeeperViewService.whenReady;
    // setIsLoading(false);
    // redis type 一旦声明，不会改变
  }, [zookeeperViewService]);

  //
  // useEffect(() => {
  //   console.log('我会初始化几次----------》zk-view')
  //   if (keyName && keyData) {
  //     console.log('真正的初始化----------》zk-view', jsonId)
  //     DocumentEditorService.JsonTempStore.set(jsonId, {
  //       keyData: keyData,
  //       keyName: fullPath,
  //       server: zookeeperViewService.getServer(),
  //       modelMethod: 'base-zk'
  //     })
  //   }
  //   return () => {
  //     DocumentEditorService.JsonTempStore.delete(jsonId)
  //   };
  //
  // }, [keyData, serverId, keyName, fullPath, zookeeperViewService, jsonId])

  useEffect(() => {
    disposableRef.current?.push(
      zookeeperViewService.onDataChange((keyValue) => {
        //console.log('zookeeper keyValue:', keyValue);
        setKeyData(keyValue);
      }),
    );
    disposableRef.current?.push(
      zookeeperViewService.onFirstInitFinish((flag) => {
        setInitFinish(flag);
      }),
    );
    disposableRef.current?.push(
      zookeeperViewService.onStatChange((stat) => {
        setStat(stat);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    zookeeperViewService.refreshDataAndInfo();
  }, [zookeeperViewService]);

  const handleDelete = useCallback(async () => {
    return await zookeeperViewService.deleteKey();
  }, [zookeeperViewService]);

  const handleAdd = useCallback(async () => {
    //console.log('-----------', newData);
    return await zookeeperViewService.add(keyName);
  }, [zookeeperViewService, keyName]);

  const handleSave = useCallback(async () => {
    //console.log('-----------', newData);
    return await zookeeperViewService.update();
  }, [zookeeperViewService, keyName]);

  const renderInfo = useCallback(() => {
    let statView: any[] = [];
    if (stat) {
      Object.keys(stat).map((key) => {
        let itemValue = stat[key];
        if (isNotEmpty(itemValue)) {
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
  }, [stat]);
  return (
    <div className={styles['main-container']} style={{ width: width + 'px', height: height }}>
      <div className={styles['header-container']}>
        {/*height:36*/}
        <div className={cls(styles['header-row'])}>
          <div className={cls(styles['header-column'], styles['key-container'])}>
            <BorderInput
              title={'Name'}
              value={keyName}
              onChange={(value) => {
                setKeyName(value);
              }}
            />
          </div>
          <div className={cls(styles['header-column'], styles['key-opt-container'])}>
            {option === 'create' ? (
              <Button
                title={localize('file.prompt.save')}
                iconClass={getIcon('plus')}
                size={'small'}
                onClick={handleAdd}
              >
                {localize('file.prompt.save')}
              </Button>
            ) : null}
            {option === 'open' ? (
              <Button
                title={localize('file.prompt.save')}
                iconClass={getIcon('check')}
                size={'small'}
                onClick={handleSave}
              >
                {localize('file.prompt.save')}
              </Button>
            ) : null}
            {option === 'open' ? (
              <Button
                title={'删除'}
                iconClass={getIcon('close1')}
                size={'small'}
                type={'danger'}
                className={styles['right-button']}
                onClick={handleDelete}
              >
                删除
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className={styles['text-container']}
        style={{ width: width + 'px', height: height - extra_height, marginTop: '6px' }}
      >
        <StringEditorView
          width={width}
          height={height - extra_height}
          keyData={keyData}
          viewId={viewId}
          modelMethod={'Zookeeper'}
          keyName={keyName}
          connect={{ server: server! }}
          dataType={'string'}
          enableRefresh={option === 'open'}
          enableCopy={true}
          isAdd={option === 'create'}
          initFinish={initFinish}
          //onSave={handleSave}
          //onRefresh={handleRefresh}
        />
      </div>
      {/*height:22*/}
      <div className={styles['info-row']}>{renderInfo()}</div>
    </div>
  );
};
