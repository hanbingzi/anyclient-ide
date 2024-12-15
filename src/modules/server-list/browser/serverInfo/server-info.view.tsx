import React, { useCallback, useState } from 'react';
import { ReactEditorComponent } from '@opensumi/ide-editor/lib/browser';
import styles from './server-info.module.less';
import { Button } from '@opensumi/ide-components';
import { ServerInfo } from '../../../local-store-db/common';
import { ServerIcon } from '../../../base/config/server-icon.config';
import { useInjectable } from '@opensumi/ide-core-browser';
import { Disposable } from '@opensumi/ide-core-common';
import { ServerInfoService } from './server-info.service';
import { IOpenRecentStatService, IOpenRecentStatServiceToken } from '../../../open-recent';
import { IQueryResult } from '../../../server-client/common';

export const ServerInfoComponent: ReactEditorComponent<{ serverInfo: ServerInfo }> = ({ resource }) => {
  const { serverInfo } = resource.metadata!;

  const serverInfoService = useInjectable<ServerInfoService>(ServerInfoService);
  const serverOpenRecentManager = useInjectable<IOpenRecentStatService>(IOpenRecentStatServiceToken);
  const [connectLoading, setConnectLoading] = useState<boolean>(false);

  const [connectResult, setConnectResult] = useState<IQueryResult>();

  const [connectStat, setConnectStat] = useState<boolean>();

  const disposer = new Disposable();

  React.useEffect(() => {
    if (serverOpenRecentManager.isConnect(serverInfo.serverId!)) {
      setConnectStat(true);
    }

    disposer.addDispose(
      serverInfoService.onLoadingChange((value: boolean) => {
        setConnectLoading(value);
      }),
    );
    disposer.addDispose(
      serverInfoService.onConnectChange((value: IQueryResult) => {
        setConnectResult(value);
      }),
    );
    disposer.addDispose(
      serverOpenRecentManager.onConnectChange((event) => {
        if (event.server.serverId !== serverInfo.serverId) return;
        if (event.option === 'open') {
          setConnectStat(true);
        } else if (event.option === 'close') {
          setConnectStat(false);
        }
      }),
    );
    return () => {
      disposer.dispose();
    };
  }, [serverInfo]);

  const handleConnect = useCallback(() => {
    // serverRecentManagerService.addConnect(serverInfo)
    serverInfoService.connectServer(serverInfo);
  }, [serverInfo]);

  return (
    <div className={styles['server-info-container']}>
      <div className={styles['header']}>
        <div className={styles['server-icon']}>{ServerIcon[serverInfo.serverType!].icon}</div>
        <div className={styles['server-name']}>
          <h1> {serverInfo.serverName}</h1>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles['main-left']}>
          <div className={styles['info-title']}>配置详情</div>
          <div className={styles['server-info']}>
            <ul>
              {['Elasticsearch'].includes(serverInfo.serverType)  ?
                <li>
                  <span>地址:</span>
                  <span>{serverInfo.url}</span>
                </li>
                :
                <>
                  <li>
                    <span>地址:</span>
                    <span>{serverInfo.host}</span>
                  </li>
                  <li>
                    <span>端口:</span>
                    <span>{serverInfo.port}</span>
                  </li>
                </>
              }
              {serverInfo.user ? (
                <li>
                  <span>用户名:</span>
                  <span>{serverInfo.user}</span>
                </li>
              ) : null}
            </ul>
          </div>
          <div className={styles['info-title']}>操作</div>

          <div className={styles['server-info-option']}>
            {connectStat === true ? (
              <Button block disabled onClick={handleConnect} type={'primary'}>
                已连接
              </Button>
            ) : (
              <Button block onClick={handleConnect} type={'primary'} loading={connectLoading}>
                连接
              </Button>
            )}
          </div>
        </div>

        <div className={styles['main-right']}>
          <div className={styles['info-title']}>使用详情</div>
          <div className={styles['server-info']}>
            <ul>
              <li>
                <span>最近一次打开时间:</span>
                <span>{serverInfo.lastOpenTime}</span>
              </li>
              <li>
                <span>创建时间:</span>
                <span>{serverInfo.createDate}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        {connectResult ? (
          connectResult.success ? (
            <span className={styles.text_success}>连接成功</span>
          ) : (
            <span className={styles.text_error}>
              连接失败: &nbsp;
              {connectResult.code ? `错误编码:${connectResult.code}, ` : null}
              {connectResult.message}
            </span>
          )
        ) : null}
      </div>
    </div>
  );
};
