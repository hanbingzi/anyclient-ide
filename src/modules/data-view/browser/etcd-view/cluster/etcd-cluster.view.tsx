import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ITableRow, TableEditor } from '../../../../components/table-editor';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { EtcdClusterService } from './etcd-cluster.service';
import { IBaseState } from '../../../common/data-browser.types';
import { DataInputEnum } from '../../../../base/types/edit-input.types';
import { EtcdView } from '../etcd-constant';

/**
 * table view 展示
 * @param props
 * @constructor
 */

export const EtcdClusterView = (props: IBaseState) => {
  const { viewState } = props;
  const { width, height } = viewState;
  console.log('width----->', width);

  const [tableData, setTableData] = useState<ITableRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const etcdClusterService = useInjectable<EtcdClusterService>(EtcdClusterService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  useEffect(() => {
    etcdClusterService.init(props);
    ensureIsReady();
  }, []);

  const clusterColumn = useCallback(() => {
    return [
      { title: EtcdView.peerURLs, columnKey: EtcdView.peerURLs, dataType: DataInputEnum.string },
      { title: EtcdView.clientURLs, columnKey: EtcdView.clientURLs, dataType: DataInputEnum.string },
      { title: EtcdView.ID, columnKey: EtcdView.ID, dataType: DataInputEnum.string },
      { title: EtcdView.name, columnKey: EtcdView.name, dataType: DataInputEnum.string },
      { title: EtcdView.isLearner, columnKey: EtcdView.isLearner, dataType: DataInputEnum.boolean },
    ];
  }, []);

  const ensureIsReady = useCallback(async () => {
    await etcdClusterService.whenReady;
  }, [etcdClusterService]);

  useEffect(() => {
    disposableRef.current?.push(
      etcdClusterService.onDataChange((data) => {
        console.log('dataChange', data);
        setTableData(data);
        setIsLoading(false);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    const result = await etcdClusterService.reloadData();
    setIsLoading(false);
    return result;
  }, [etcdClusterService]);
  return (
    <div style={{ marginTop: 6 }}>
      <TableEditor
        columns={clusterColumn()}
        data={tableData}
        tableHeight={height}
        isLoading={isLoading}
        tableWidth={width}
        showTitleTypeIcon={true}
        onRefresh={handleRefresh}
        option={true}
        optionArgs={{ search: true, refresh: true }}
        cellStyle={{ textAlign: 'center' }}
      />
    </div>
  );
};
