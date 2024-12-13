import React, { PropsWithChildren, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DisposableCollection, useInjectable, ViewState } from '@opensumi/ide-core-browser';
import { Scrollbars, Tabs } from '@opensumi/ide-components';
import { IKeyResult, IRunSqlResult } from '../../server-client/common';
import { SummaryView } from './summary.view';
import { IQuerySqlExplorerServiceToken } from '../common';
import { QuerySqlExplorerService } from './query-sql-explorer.service';
import { QueryEmptyView } from './query-empty.view';
import styles from './query-explorer.module.less';
import { SqlTableResultView } from './table-result/sql-table-result.view';
import { FileSuffixType, ServerType } from '../../base/types/server-node.types';
import { RedisResultView } from './redis-result/redis-result.view';
import { TabsTitleItem } from '../../components/title';
import { ConfigProvider } from 'antd';
import '@opensumi/antd-theme/lib/index.css';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import { EsResultView } from './es-result/es-result.view';
import TimerComponent from './timer-view';

export const DEFAULT_TITLE_HEIGHT = 41;
export const DEFAULT_TITLE_ITEM_WIDTH = 50 + 24;

export const QueryExplorerView = ({ viewState }: PropsWithChildren<{ viewState: ViewState }>) => {
  //console.log('uery-explorer---->', viewState);
  const { width, height } = viewState;
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [serverClass, setServerClass] = useState<FileSuffixType>();
  const [serverType, setServerType] = useState<ServerType>();

  const [sqlRunResult, setSqlRunResult] = useState<IRunSqlResult[]>();
  const [queryResult, setQueryResult] = useState<IRunSqlResult[]>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());
  const querySqlExplorerService = useInjectable<QuerySqlExplorerService>(IQuerySqlExplorerServiceToken);
  const ref = React.useRef<any>(null);

  const tableChangeHandle = useCallback((index: number) => {
    //console.log('切换table', index);
    setSelectedIndex(index);
  }, []);

  useEffect(() => {
    disposableRef.current?.push(
      querySqlExplorerService.onLoadingChange((isLoading) => {
        setIsLoading(isLoading);
      }),
    );

    disposableRef.current?.push(
      querySqlExplorerService.onQueryResultChange((queryResult) => {
        setQueryResult(queryResult);
      }),
    );

    disposableRef.current?.push(
      querySqlExplorerService.onSqlRunResultChange((sqlRunResult) => {
        setSqlRunResult(sqlRunResult);
      }),
    );

    disposableRef.current?.push(
      querySqlExplorerService.onSelectedIndexChange((selected) => {
        setSelectedIndex(selected);
      }),
    );

    disposableRef.current?.push(
      querySqlExplorerService.onServerClassChange((serverClass) => {
        setServerClass(serverClass);
      }),
    );
    disposableRef.current?.push(
      querySqlExplorerService.onServerTypeChange((serverType) => {
        setServerType(serverType);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const responseHeight = useMemo(() => height - DEFAULT_TITLE_HEIGHT, [height]);

  const titleViewCal = useMemo(() => {
    let titles: string[] = ['Summary'];
    if (queryResult) {
      for (let i = 0; i < queryResult.length; i++) {
        //es的成功失败都展示
        if (serverClass === 'es') {
          titles.push(`Result${i + 1}`);
        } else if (queryResult[i].success) {//只展示成功的
          titles.push(`Result${i + 1}`);
        }
      }
    }
    let titleListView: React.ReactNode[] = [];
    for (let title of titles) {
      titleListView.push(<TabsTitleItem title={title} />);
    }
    return [titles, titleListView];
  }, [queryResult]);

  const renderTitle = useCallback(() => {
    const [titles, titleListView] = titleViewCal;
    const showWidth = width - 20; //两边padding20 图标：20
    const titleWidth = titles.length * DEFAULT_TITLE_ITEM_WIDTH;
    const tabsWidth = titleWidth > showWidth ? titleWidth : showWidth;
    console.log('titles--->', titles);
    return (
      <Scrollbars
        style={{
          width: showWidth,
          height: 41,
        }}
      >
        <Tabs style={{ width: tabsWidth }} tabs={titleListView} value={selectedIndex} onChange={tableChangeHandle} />
      </Scrollbars>
    );
  }, [width, selectedIndex, sqlRunResult, queryResult]);

  //
  //const resultViewCal = useMemo(() => {
  // //useEffect(()=>{},[])
  //     console.log('我多久render一次 resultViewCal')
  //     let resultViews: React.ReactNode[] = [];
  //     if (!queryResult) {
  //       return [];
  //     }
  //     queryResult.map((item, index) => {
  //       resultViews.push(
  //         <SqlTableResultView
  //           key={index}
  //           width={width}
  //           height={responseHeight}
  //           serverInfo={querySqlExplorerService.serverInfo}
  //           dbName={querySqlExplorerService.dbName}
  //           schemaName={querySqlExplorerService.schemaName}
  //           runResult={item}
  //         />
  //       )
  //     })
  //     return resultViews;
  //   }, [width, responseHeight, queryResult])

  /**
   * 此处切换有bug，切换标签，会导致编辑的状态消失，暂时不知道如何解决
   */
    // const renderData = useCallback(() => {
    //   if (selectedIndex === 0) {
    //     return (<SummaryView width={width}
    //                          height={responseHeight}
    //                          responses={sqlRunResult}/>)
    //   }
    //   if (!queryResult) {
    //     return null;
    //   }
    //   const index = selectedIndex - 1;
    //   const data = queryResult[index];
    //   return (<SqlTableResultView
    //     key={data.sql!+index}
    //     width={width}
    //     height={responseHeight}
    //     serverInfo={querySqlExplorerService.serverInfo}
    //     dbName={querySqlExplorerService.dbName}
    //     schemaName={querySqlExplorerService.schemaName}
    //     runResult={data}
    //   />)
    //
    // }, [width, responseHeight, selectedIndex, sqlRunResult, queryResult, querySqlExplorerService])
    //console.log('query explorer width:', width)
  const renderData = useCallback(() => {
      let dataViews: any[] = [];
      if (sqlRunResult && sqlRunResult.length > 0) {
        dataViews.push(
          <SummaryView
            serverClass={serverClass}
            isShow={selectedIndex == 0}
            key={'summary'}
            width={width}
            height={responseHeight}
            responses={sqlRunResult}
          />,
        );
      }
      if (queryResult) {
        switch (serverClass) {
          case 'sql':
            queryResult.forEach((item, index) => {
              if (item.success) {
                dataViews.push(
                  <SqlTableResultView
                    key={item.sql! + index}
                    isShow={selectedIndex === index + 1}
                    width={width}
                    height={responseHeight}
                    serverInfo={querySqlExplorerService.serverInfo}
                    dbValue={querySqlExplorerService.dbValue as string}
                    schemaName={querySqlExplorerService.schemaName}
                    runResult={item}
                  />,
                );
              }
            });
            break;
          case 'redis':
            queryResult.forEach((item, index) => {
              if (item.success) {
                dataViews.push(
                  <RedisResultView
                    key={(item as IKeyResult).command! + index}
                    isShow={selectedIndex === index + 1}
                    width={width}
                    height={responseHeight}
                    serverInfo={querySqlExplorerService.serverInfo}
                    dbValue={querySqlExplorerService.dbValue as string}
                    runResult={item}
                  />,
                );
              }
            });
            break;
          case 'es':
            queryResult.forEach((item, index) => {
              dataViews.push(
                <EsResultView
                  key={index}
                  isShow={selectedIndex === index + 1}
                  width={width}
                  height={responseHeight}
                  serverInfo={querySqlExplorerService.serverInfo}
                  runResult={item}
                />,
              );
            });
            break;
        }
        return dataViews;
      }
    }, [width, responseHeight, selectedIndex, serverClass, sqlRunResult, queryResult, querySqlExplorerService]);

  if (isLoading) {
    return (<>
        <ProgressBar loading />
        <TimerComponent />
      </>
    );
  }
  if (sqlRunResult && sqlRunResult.length > 0) {
    return (
      <div className={styles['query-explorer-container']} ref={ref}>
        <ConfigProvider prefixCls="sumi_antd" getPopupContainer={() => ref.current}>
          <div className={styles['title-container']}>{renderTitle()}</div>
          <div className={styles['response-container']}>{renderData()}</div>
        </ConfigProvider>
      </div>
    );
  } else {
    return <QueryEmptyView />;
  }
};
