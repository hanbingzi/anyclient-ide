import React, { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import {
  DataOptionBase, ISelectMenuData,
  ITableColumn,
  ITableRow,
  IUpdateDataResult,
  TableEditor,
} from '../../../components/table-editor';
import { ISqlTableResultServiceToken, ResultExplorerProps } from '../../common';
import { SqlTableResultService } from './sql-table-result.service';
import cls from 'classnames';
import styles from '../query-explorer.module.less';
import { ViewState } from '../../../data-view/common/data-browser.types';

const OptionHeight = 36; //AppConstants.Electron ? 36 : 0;
export const SqlTableResultView = (props: ResultExplorerProps) => {
  const { isShow, width, height, serverInfo, dbValue, schemaName, runResult } = props;
  //const { column, fields, data } = runResult;
  const [option, setOption] = useState<DataOptionBase>({ search: true, refresh: true });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [tableData, setTableData] = useState<ITableRow[]>([]);
  const [tableColumn, setTableColumn] = useState<ITableColumn[]>([]);
  const [viewState, setViewState] = useState<ViewState>(null);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  const sqlTableResultService = useInjectable<SqlTableResultService>(ISqlTableResultServiceToken);

  //console.log('---->width: ' + width + ' ,height: ' + height)
  useEffect(() => {
   // console.log('useEffect--------------------------------------------->',runResult, serverInfo, dbValue, schemaName);
    sqlTableResultService.init(runResult, serverInfo, dbValue, schemaName);
    ensureIsReady();
 // }, [serverInfo, dbValue, schemaName, runResult]);
  }, []);

  useEffect(() => {
    if (width > 0 && height > 0) {
      setViewState({ width, height });
    }
  }, [width, height]);

  // useEffect(() => {
  //   if (column) {
  //     const tableColumn: ITableColumn[] = column!.map((columnMeta) => {
  //       return {
  //         title: columnMeta.name,
  //         columnKey: columnMeta.name,
  //         inputType: 'input',
  //         dataType: columnMeta.dataType
  //       }
  //     });
  //     console.log('重新生成column--------原生fields》', fields, ';column:', column, ';重新生成的:', tableColumn)
  //     sqlTableResultService.initColumn(tableColumn);
  //     setTableColumn(tableColumn);
  //   }
  // }, [])

  //
  const ensureIsReady = useCallback(async () => {
    await sqlTableResultService.whenReady;
    setIsLoading(false);
  }, [SqlTableResultService]);

  useEffect(() => {
    disposableRef.current?.push(
      sqlTableResultService.onOptionChange((one) => {
        //console.log('接收到的tableOpeion____<>____>', one)
        setOption(one);
      }),
    );
    disposableRef.current?.push(
      sqlTableResultService.onTableDataChange((data) => {
        console.log('接收到的tableData____<>____>', data)
        setTableData(data);
      }),
    );
    disposableRef.current?.push(
      sqlTableResultService.onTableColumnChange((column) => {
        console.log('接收到的tableColumn____<>____>', column)
        setTableColumn(column);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const handleRemove = useCallback(
    async (removeData: ITableRow[]): Promise<boolean> => {
      let result = await sqlTableResultService.remove(removeData);
      return result;
    },
    [sqlTableResultService],
  );

  const handleRefresh = useCallback(async () => {
    setDataLoading(true);
    const result = await sqlTableResultService.refresh();
    //使用户有感觉数据被刷新
    setTimeout(() => {
      setDataLoading(false);
    }, 40);

    return result;
  }, [sqlTableResultService]);

  const handleSave = useCallback(
    async (updateResult: IUpdateDataResult) => {
      const optResult = await sqlTableResultService.save(updateResult);
      return optResult;
    },
    [sqlTableResultService],
  );

  const handleCopyInsertSql = useCallback((selectedData:ISelectMenuData) => {
    sqlTableResultService.copyRowSql(selectedData.row.rows,'insert');
  }, [sqlTableResultService]);

  const handleCopyUpdateSql = useCallback((selectedData:ISelectMenuData) => {
    sqlTableResultService.copyRowSql(selectedData.row.rows,'update');
  }, [sqlTableResultService]);

  const handleCopyDeleteSql = useCallback((selectedData:ISelectMenuData) => {
    sqlTableResultService.copyRowSql(selectedData.row.rows,'delete');
  }, [sqlTableResultService]);

  return (
    <div className={cls(isShow ? styles['data-container-show'] : styles['data-container-hidden'])}>
      {isLoading || !viewState ? (
        <ProgressBar loading />
      ) : (
        <TableEditor
          columns={tableColumn}
          data={tableData}
          tableHeight={viewState.height - OptionHeight}
          tableWidth={viewState.width - 2}
          showTitleTypeIcon={true}
          onRemove={handleRemove}
          onRefresh={handleRefresh}
          onSave={handleSave}
          //onFilter={handleFilter}
          //onFilterClose={handleFilterClose}
          //onFilterOpen={handleFilterOpen}
          pagination={false}
          option={true}
          optionArgs={option}
          immediateRemove={true}
          isLoading={dataLoading}
          menuOption={{  customMenu: [
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
              [
                {
                  label: '刷新',
                  visible: true,
                  onClick: handleRefresh,
                },
              ],
            ],}}
        />
      )}
    </div>
  );
};
