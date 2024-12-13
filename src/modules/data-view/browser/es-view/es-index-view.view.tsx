import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { IBaseState } from '../../common/data-browser.types';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { EsIndexViewService } from './es-index-view.service';
import { IPage } from '../../../components/pagination';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import { ITableColumn, ITableRow, IUpdateDataResult, TableEditor } from '../../../components/table-editor';
import { IWhereParam } from '../../../base/model/sql-param.model';

const extra_height = 59; //6+30 22 30(标题高)22（详情高）6(margin-top)不知道哪多了1px
export const EsIndexView = (props: IBaseState) => {
  const { width, height } = props.viewState;
  //保持和数据库中的ttl一致
  const [indexData, setIndexData] = useState<any>();
  const [page, setPage] = useState<IPage>();
  const [tableColumn, setTableColumn] = useState<ITableColumn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);


  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());
  const esViewService = useInjectable<EsIndexViewService>(EsIndexViewService);


  useEffect(() => {
    esViewService.init(props);
    ensureIsReady();
    //
  }, [props]);

  const ensureIsReady = useCallback(async () => {
    await esViewService.whenReady;
    setIsLoading(false);
    // setIsLoading(false);
    // redis type 一旦声明，不会改变
  }, [esViewService]);


  useEffect(() => {
    disposableRef.current?.push(
      esViewService.onIndexDataChange((data) => {
        setIndexData(data);
      }),
    );
    disposableRef.current?.push(
      esViewService.onIndexColumnChange((column) => {
        setTableColumn(column);
      }),
    );
    disposableRef.current?.push(
      esViewService.onPageChange((page) => {
        setPage(page);
      }),
    );
    disposableRef.current?.push(
      esViewService.onDataLoadingChange((loading) => {
        setDataLoading(loading);
      }),
    );


    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    await esViewService.loadData();
    return true;
  }, [esViewService]);

  const handlePage = useCallback((page: number, pageSize: number) => {
    esViewService.loadDataByPage(page, pageSize);
  }, [esViewService]);

  const handleRemove = useCallback(async (removeData: ITableRow[]) => {
    return await esViewService.remove(removeData);
  }, [esViewService]);

  const handleFilterOpen = useCallback(() => {
    esViewService.setFilterSetting(true);
  }, [esViewService]);

  const handleFilterClose = useCallback(() => {
    esViewService.setFilterSetting(false);
  }, [esViewService]);

  const handleFilter = useCallback(
    async (filters: IWhereParam[]) => {
      await esViewService.filter(filters);
    },
    [esViewService],
  );

  const handleSave = useCallback(async (updateData: IUpdateDataResult) => {
    return await esViewService.save(updateData);

  }, []);


  return (
    <div>
      {isLoading ? (
        <ProgressBar loading />
      ) : (
        <TableEditor
          columns={tableColumn}
          data={indexData}
          tableHeight={height}
          tableWidth={width - 2}
          isLoading={dataLoading}
          showTitleTypeIcon={true}
          menuOption={{
            customMenu: [
              [
                {
                  label: '复制为insert语句',
                  onClick: () => {
                  },//handleCopyInsertSql,
                },
                {
                  label: '复制为update语句',
                  onClick: () => {
                  },//handleCopyUpdateSql,
                },
                {
                  label: '复制为delete语句',
                  onClick: () => {
                  },//handleCopyDeleteSql,
                },
              ],

            ],
          }}
          onRemove={handleRemove}
          onRefresh={handleRefresh}
          onSave={handleSave}
          onFilter={handleFilter}
          onFilterClose={handleFilterClose}
          onFilterOpen={handleFilterOpen}
          // onClick={handleClick}
          // onRowClick={handleRowClick}
          pagination={{ ...page, onChange: handlePage }}
          option={true}
          optionArgs={{
            search: true,
            add: true,
            remove: true,
            update: true,
            save: true,
            revert: true,
            refresh: true,
            filter: true,
            cancel: true,
          }}
          immediateRemove={true}
        />
      )}
    </div>
  );
};
