import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Select, Tabs } from '@opensumi/ide-components';
import { TabsTitleItem } from '../../../components/title';
import { IListColumn, TableView } from '../../../components/table-view';
import { IBaseState, ViewState } from '../../common/data-browser.types';
import styles from './index.module.less';
import cls from 'classnames';
import { DisposableCollection } from '@opensumi/ide-utils';
import { useInjectable } from '@opensumi/ide-core-browser';
import { TopicViewService } from './topic-view.service';
import { LabelItem } from '../../../components/form';
import { ISortColumn } from '../../../components/table-editor';
import { IconSvg } from '../../../icons';
import { Run, Stop } from '../../../icons/tools';
import { IMessage, IPartition, IQueryStart } from '../../../server-client/common';

// const testData = [
//   {partition: 0, offset: 1, key: 'test', value: 'one-1', timestamp: '2002-12-12 10:22:36'},
//   {partition: 0, offset: 2, key: 'test', value: 'one-2', timestamp: '2002-12-12 11:22:36'},
//   {partition: 0, offset: 3, key: 'test', value: 'one-3', timestamp: '2002-12-12 12:22:36'},
//   {partition: 0, offset: 4, key: 'test', value: 'one-4', timestamp: '2002-12-12 13:22:36'},
// ]
export const TopicView = (props: IBaseState) => {
  const {
    openUri,
    nodeName,
    nodePath,
    serverId,
    serverType,
    nodeType,
    viewState: { width, height },
  } = props;

  const [tabIndex, setTabIndex] = useState<number>(0);
  const [data, setData] = useState<IMessage[]>([]);
  const [partitionOption, setPartitionOption] = useState<string[]>([]);
  const [partitions, setPartitions] = useState<IPartition[]>([]);
  const [selectedPartition, setSelectedPartition] = useState<string>('');
  const [selectedQuerySize, setSelectedQuerySize] = useState<string>('100');
  const [selectedQueryStart, setSelectedQueryStart] = useState<IQueryStart>('Newest');
  const [column, setColumn] = useState<IListColumn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  const topicViewService = useInjectable<TopicViewService>(TopicViewService);

  useEffect(() => {
    //console.log('topic-view-----在什么时候执行')
    topicViewService.init(openUri, nodeName, nodePath, serverId, nodeType);
    ensureIsReady();
  }, [openUri, nodeName, nodePath, serverId, nodeType]);

  const ensureIsReady = useCallback(async () => {
    await topicViewService.whenReady;
    //加载data,不能一开始就加载data，否者会导致消息被消费
    //topicViewService.loadData();
    //加载partition；
    const queryPartitions = await topicViewService.getTopicPartition();
    const partitionOption = queryPartitions.map((value) => String(value.partitionId));
    setPartitionOption(partitionOption);
    setPartitions(queryPartitions);
  }, [topicViewService]);

  useEffect(() => {
    disposableRef.current?.push(
      topicViewService.onDataChange((data) => {
        setData(data);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (width === 0) return;
    const columnInit = [
      { title: 'Partition', columnKey: 'partition', width: 100 },
      { title: 'Offset', columnKey: 'offset', width: 100 },
      { title: 'Key', columnKey: 'key', width: 200 },
      { title: 'Value', columnKey: 'value', width: 300 },
      { title: 'Timestamp', columnKey: 'timestamp', width: 200 },
    ];
    const fullColumnWidth = columnInit.reduce((pre, cur) => {
      return pre + cur.width;
    }, 0);
    if (fullColumnWidth > width) {
      setColumn(columnInit);
    } else {
      columnInit[3].width = width - fullColumnWidth + columnInit[3].width - 50;
      setColumn(columnInit);
    }
  }, [width]);

  const tableHeight = useMemo(() => {
    if (height) {
      return height - 37; //37 标题框的高度
    }
    return 500;
  }, [height]);

  const handleTableChange = useCallback((index: number) => {
    setTabIndex(index);
  }, []);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    await topicViewService.loadData(selectedPartition, Number(selectedQuerySize), selectedQueryStart);
    setIsLoading(false);
  }, [selectedPartition, selectedQuerySize, selectedQueryStart]);

  const handleTest = () => {
    topicViewService.test();
  };

  const handleShowInfo = useCallback(() => {
    topicViewService.showDataItemInfoPanel();
  }, [topicViewService]);

  const handleAddMessage = useCallback(() => {
    topicViewService.openAddMessageView();
  }, [topicViewService]);

  const handleRowClick = useCallback(
    (data) => {
      topicViewService.showDataItemInfo(data, true);
    },
    [topicViewService],
  );

  const handleClick = useCallback(
    (data) => {
      topicViewService.showDataItemInfo(data);
    },
    [topicViewService],
  );

  const handleSort = useCallback(
    (sortColumn: ISortColumn) => {
      //2 1 desc 2 1 desc
      if (sortColumn && data) {
        const { column, orderBy } = sortColumn;
        const newData = data.sort((a, b) => {
          if (orderBy === 'asc') {
            return a[column] > b[column] ? 1 : -1;
          } else {
            return a[column] > b[column] ? -1 : 1;
          }
        });
        setData([...newData]);
      }
    },
    [data],
  );

  const renderFilter = useCallback(() => {
    return (
      <div className={styles['filter-container']}>
        <div className={styles['label']}>Partition</div>
        <div className={styles['item-value']}>
          <Select
            options={['', ...partitionOption]}
            size={'small'}
            value={selectedPartition}
            onChange={(selected) => {
              setSelectedPartition(selected);
            }}
            style={{ width: 100 }}
          />
        </div>
        <div className={styles['label']}>QuerySize</div>
        <div className={styles['item-value']}>
          <Select
            options={['10', '50', '100', '200', '300', '500', '1000', '2000']}
            value={selectedQuerySize}
            onChange={(selected) => {
              setSelectedQuerySize(selected);
            }}
            size={'small'}
            style={{ width: 100 }}
          />
        </div>
        <div className={styles['label']}>QueryStart</div>
        <div className={styles['item-value']}>
          <Select
            options={['Newest', 'Oldest']}
            value={selectedQueryStart}
            onChange={(selected) => {
              setSelectedQueryStart(selected);
            }}
            size={'small'}
            style={{ width: 100 }}
          />
        </div>

        <div className={cls(styles['label'], styles['icon-custom'])}>
          {isLoading ? (
            <IconSvg icon={<Stop />} onClick={handleTest} />
          ) : (
            <IconSvg icon={<Run />} onClick={handleSearch} />
          )}
        </div>
        <div className={cls(styles['label'], styles['icon'])}>
          <Icon icon={'dock-down'} onClick={handleShowInfo} className={cls('kt-clickable-icon')} />
        </div>
        <div className={cls(styles['label'], styles['icon'])}>
          <Icon icon={'plus'} onClick={handleAddMessage} className={cls('kt-clickable-icon')} />
        </div>
      </div>
    );
  }, [selectedPartition, selectedQueryStart, selectedQuerySize]);

  const renderData = useCallback(() => {
    return (
      <div className={cls(tabIndex === 0 ? styles['data-container-show'] : styles['data-container-hidden'])}>
        <TableView
          tableWidth={width ? width : 500}
          tableHeight={tableHeight}
          columns={column}
          data={data ? data : []}
          dataType={'Object'}
          option={true}
          optionArgs={{ search: true }}
          optionView={{ location: 'afterSearch', view: renderFilter() }}
          onClick={handleClick}
          onRowClick={handleRowClick}
          sort={handleSort}
          emptyTitle={''}
        />
      </div>
    );
  }, [width, height, tabIndex, data, renderFilter, handleClick, handleRowClick, column]);

  const renderPartition = useCallback(() => {
    const partitionList: any[] = [];
    if (partitions) {
      for (let i = 0; i < partitions.length; i++) {
        const item = partitions[i];
        const { partitionId, leader, replicas, offlineReplicas } = item;
        partitionList.push(
          <div className={styles['partition-item-wrap']} key={`partition-item-${partitionId}`}>
            <LabelItem label={'partitionId'}>{partitionId}</LabelItem>
            <LabelItem label={'leader'}>{leader}</LabelItem>
            <LabelItem label={'replicas'}>{replicas ? replicas.join(',') : ''}</LabelItem>
            <LabelItem label={'offlineReplicas'}>{offlineReplicas ? offlineReplicas.join(',') : ''}</LabelItem>
          </div>,
          // <div className={styles['partition-item-line']} key={`partition-line-${partitionId}`}/>
        );
      }
    }

    return (
      <div
        className={cls(
          tabIndex === 1 ? styles['data-container-show'] : styles['data-container-hidden'],
          styles['partition-container'],
        )}
      >
        {partitionList}
      </div>
    );
  }, [tabIndex, partitions]);

  return (
    <div>
      <Tabs
        tabs={[<TabsTitleItem title={'Data'} fixWidth={60} />, <TabsTitleItem title={'Partition'} fixWidth={60} />]}
        value={tabIndex}
        onChange={handleTableChange}
      />
      {renderData()}
      {renderPartition()}
    </div>
  );
};
export const TopicFilter = () => {
  return (
    <div className={styles['filter-container']}>
      <div>Partition</div>
      <div>
        <Select options={['0', '1', '2']} />
      </div>
      <div>Messages</div>
      <div>
        <Select options={['0', '1', '2']} />
      </div>
      <div>query</div>
    </div>
  );
};
