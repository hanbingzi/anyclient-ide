import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  DataOptionBase,
  IClickCellData, ISelectMenuData,
  ITableColumn,
  ITableRow,
  IUpdateDataResult,
  TableEditor,
} from '../../../components/table-editor';
import { IPage } from '../../../components/pagination';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { TableViewService } from './table-view.service';
import { IBaseState } from '../../common/data-browser.types';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { ErrorPage } from '../../../components/error';
import { IErrorLoad } from '../../../base/model/error-load.model';

export const TableViewView = (props: IBaseState) => {
  const { viewState, serverId, db, nodeName: tableName } = props;
  const { width, height } = viewState;

  const [option, setOption] = useState<DataOptionBase>();
  const [tableData, setTableData] = useState<ITableRow[]>([]);
  const [tableColumn, setTableColumn] = useState<ITableColumn[]>([]);
  const [page, setPage] = useState<IPage>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<IErrorLoad>({ success: true });

  const tableViewService = useInjectable<TableViewService>(TableViewService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  useEffect(() => {
    tableViewService.init(props);
    ensureIsReady();
  }, []);

  // useEffect(() => {
  //   //console.log('TableViewView - > viewState-------------->', viewState);
  // }, [viewState]);

  const ensureIsReady = useCallback(async () => {
    await tableViewService.whenReady;
    setIsLoading(false);
  }, [tableViewService]);

  useEffect(() => {
    disposableRef.current?.push(
      tableViewService.onOptionChange((option) => {
        setOption(option);
      }),
    );
    disposableRef.current?.push(
      tableViewService.onTableDataChange((data) => {
        //console.log('接收到的tableData________>', data)
        setTableData(data);
      }),
    );
    disposableRef.current?.push(
      tableViewService.onTableColumnChange((column) => {
        setTableColumn(column);
      }),
    );
    disposableRef.current?.push(
      tableViewService.onPageChange((page) => {
        setPage(page);
      }),
    );
    disposableRef.current?.push(
      tableViewService.onDataLoadingChange((loading) => {
        setDataLoading(loading);
      }),
    );
    disposableRef.current?.push(
      tableViewService.onDataLoadingError((isError) => {
        setLoadError(isError);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRemove = useCallback(
    async (removeData: ITableRow[]): Promise<boolean> => await tableViewService.remove(removeData),
    [tableViewService],
  );

  const handleRefresh = useCallback(async () => {
    setDataLoading(true);
    return await tableViewService.refresh();
  }, [tableViewService]);

  const handlePage = useCallback(
    async (page: number, pageSize: number) => {
      setDataLoading(true);
      //console.log('--===----====---->page:', page, ';pageSize:', pageSize);
      await tableViewService.loadDataByPage(page, pageSize);
    },
    [page, tableViewService],
  );

  const handleSave = useCallback(
    async (updateResult: IUpdateDataResult) => {
      setDataLoading(true);
      const optResult = await tableViewService.save(updateResult);

      setDataLoading(false);
      return optResult;
    },
    [tableViewService],
  );

  const handleFilter = useCallback(
    async (filters: IWhereParam[]) => {
      await tableViewService.filter(filters);
    },
    [tableViewService],
  );

  const handleFilterClose = useCallback(() => {
    tableViewService.setFilterSetting(false);
  }, [tableViewService]);

  const handleFilterOpen = useCallback(() => {
    tableViewService.setFilterSetting(true);
  }, [tableViewService]);

  const handleClick = useCallback(
    (value: any) => {
      //tableViewService.showDataItemInfo(value);
    },
    [tableViewService],
  );

  const handleRowClick = useCallback(
    (rowData: IClickCellData[][]) => {
      //tableViewService.showDataItemInfo(rowData, true);
    },
    [tableViewService],
  );
  const handleCopyInsertSql = useCallback((selectedData:ISelectMenuData) => {
    tableViewService.copyRowSql(selectedData.row.rows,'insert');
  }, [tableViewService]);

  const handleCopyUpdateSql = useCallback((selectedData:ISelectMenuData) => {
    tableViewService.copyRowSql(selectedData.row.rows,'update');
  }, [tableViewService]);

  const handleCopyDeleteSql = useCallback((selectedData:ISelectMenuData) => {
    tableViewService.copyRowSql(selectedData.row.rows,'delete');
  }, [tableViewService]);


  return (
    <div>
      {isLoading ? (
        <ProgressBar loading />
      ) : !loadError.success ? (
        <ErrorPage message={loadError.message} onRefresh={handleRefresh} />
      ) : (
        <TableEditor
          columns={tableColumn}
          data={tableData}
          tableHeight={height}
          tableWidth={width - 2}
          isLoading={dataLoading}
          showTitleTypeIcon={true}
          menuOption={{
            customMenu: [
              [
                {
                  label: '复制为insert语句',
                  visible: true,
                  onClick: handleCopyInsertSql,
                },
                {
                  label: '复制为update语句',
                  visible: option.update,
                  onClick: handleCopyUpdateSql,
                },
                {
                  label: '复制为delete语句',
                  visible: option.remove,
                  onClick: handleCopyDeleteSql,
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
          onClick={handleClick}
          onRowClick={handleRowClick}
          pagination={{ ...page, onChange: handlePage }}
          option={true}
          optionArgs={option}
          immediateRemove={true}
        />
      )}
    </div>
  );
};
