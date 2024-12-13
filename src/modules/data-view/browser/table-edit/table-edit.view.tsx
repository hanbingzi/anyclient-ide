import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CellDataProps,
  DataOptionBase,
  ISelectOption,
  ITableColumn,
  ITableRow,
  IUpdateCell,
  IUpdateDataResult,
  TableEditor,
} from '../../../components/table-editor';
import { DisposableCollection, useInjectable } from '@opensumi/ide-core-browser';
import { TableEditService } from './table-edit.service';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import { Tabs } from '@opensumi/ide-components';
import { PrimaryKey } from '../../../icons/values';
import {
  AutoIncrement,
  CommentName,
  DefaultValueName,
  FieldName,
  LengthName,
  NotNullName,
  PrimaryKeyName,
  ScaleName,
  TypeName,
} from '../constant';
import styles from './table-edit.module.less';
import useTable from '../../../components/table-editor/hook/useTable';
import { OpenOption } from '../../../base/param/open-view.param';
import { MysqlAutoIncrementType, MysqlColumnType } from '../../../server-client/common/fields/mysql-fields';
import { DataInputEnum } from '../../../base/types/edit-input.types';
import { PostgresAutoIncrementEnum, PostgresColumnType } from '../../../server-client/common/fields/postgres-fields';
import { TabsTitleItem } from '../../../components/title';
import { ColumnEditDefaultSelect } from '../../../base/types/sql.types';
import { IBaseState } from '../../common/data-browser.types';
import { OracleColumnType } from '../../../server-client/common/fields/oracle-fields';
import { MssqlColumnType } from '../../../server-client/common/fields/mssql-fields';
import { ServerType } from '../../../base/types/server-node.types';
import { DMColumnType } from '../../../server-client/common/fields/dm-fields';

export const TableEditView = (props: IBaseState) => {
  const { option, viewState, serverId, server, serverType, db, schema, nodeName: tableName } = props;
  const { width, height } = viewState;
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [tableData, setTableData] = useState<ITableRow[]>([]);
  // const [tableColumn, setTableColumn] = useState<ITableColumn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [currentOpt, setCurrentOpt] = useState<OpenOption>(option!);
  const tableEditService = useInjectable<TableEditService>(TableEditService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  //const [currentValue, setCurrentValue] = useState<string>();

  const [tableInstance] = useTable();
  const { getColumnHasData, getColumnsHasData, getStore } = tableInstance;
  //console.log('table edit instance:getStore:', getStore())

  useEffect(() => {
    //console.log('useEffect--------tableView> 运行几次:serverInfo', schema);
    tableEditService.init(option!, server!, db!, schema ? schema : '', tableName);
    ensureIsReady();
  }, []);

  const handleTabIndex = useCallback((index: number) => {
    setTabIndex(index);
  }, []);

  const ensureIsReady = useCallback(async () => {
    //console.log('ensureIsReady---------------------->');
    await tableEditService.whenReady;
    //  setTableColumn(tableEditService.tableColumn)
    setIsLoading(false);
  }, [tableEditService]);

  useEffect(() => {
    disposableRef.current?.push(
      tableEditService.onTableDataChange((data) => {
        console.log('服务收到的data', data);
        setTableData([...data]);
      }),
    );
    disposableRef.current?.push(
      tableEditService.onDataLoadingChange((loading) => {
        setDataLoading(loading);
      }),
    );
    disposableRef.current?.push(
      tableEditService.onOptionChange((opt) => {
        setCurrentOpt(opt);
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  const getTableArgs = useMemo((): DataOptionBase => {
    const canSort: boolean = serverType === 'Mysql' || currentOpt === 'create';
    return {
      search: true,
      update: true,
      add: true,
      remove: true,
      save: true,
      revert: true,
      cancel: true,
      refresh: currentOpt === 'edit',
      upRow: canSort,
      downRow: canSort,
    };
  }, [currentOpt]);

  const handleRefresh = useCallback(async (): Promise<boolean> => {
    setDataLoading(true);
    return await tableEditService.refresh();
  }, []);

  const handleSave = async (updateResult: IUpdateDataResult) => {
    //setDataLoading(true);
    console.log('开始保存----》handleSave', currentOpt, updateResult);
    let optResult = false;
    if (currentOpt === 'edit') {
      const primaryData = getColumnsHasData(PrimaryKeyName, [FieldName]);
      optResult = await tableEditService.saveUpdateTable(updateResult, primaryData);
    } else if (currentOpt === 'create') {
      optResult = await tableEditService.saveCreateTable(updateResult);
    }
    return optResult;
  };
  console.log('isDataLoading---->', dataLoading);

  const handlePrimaryCommit = (
    commit: (cells?: IUpdateCell[]) => void,
    rowId: string,
    columnIndex: number,
    currentVal: any,
  ) => {
    const primaryList = getColumnHasData(PrimaryKeyName);
    console.log('handlePrimaryCommit--primaryList：', primaryList);
    // let updateData: { rowId?: string, columnIndex?: number, currentValue?: any, lastValue?: any }[] = [];
    let commitData: IUpdateCell[] = [];
    if (currentVal) {
      const currentNumberVal = Number.parseInt(currentVal);
      primaryList.forEach((value, key) => {
        let order = Number.parseInt(value);
        if (key !== rowId) {
          if (order > currentNumberVal) {
            commitData.push({
              rowId: key,
              columnIndex,
              columnKey: PrimaryKeyName,
              newValue: order - 1,
              lastValue: order,
            });
          }
        }
      });
      commitData.push({ rowId, columnIndex, columnKey: PrimaryKeyName, newValue: '', lastValue: currentNumberVal });
    } else {
      if (!primaryList || primaryList.size === 0) {
        commitData.push({ rowId, columnIndex, columnKey: PrimaryKeyName, newValue: 1, lastValue: '' });
      } else {
        let maxOrder = 1;
        primaryList.forEach((value) => {
          let order = Number.parseInt(value);
          if (order > maxOrder) {
            maxOrder = order;
          }
        });
        commitData.push({ rowId, columnIndex, columnKey: PrimaryKeyName, newValue: maxOrder + 1, lastValue: '' });
        //console.log('新设置的值为：', (maxOrder + 1))
      }
    }
    commit(commitData);
    console.log('新设置的值：', commitData);
    //console.log('primaryList:', primaryList)
  };

  const renderPrimary = (cellProps: CellDataProps) => {
    const { value, initialValue, rowId, rowIndex, columnIndex, column, isAdd, isEditor, multiCommit } = cellProps;
    return (
      <div
        className={styles['cell-primary-key']}
        onClick={() => handlePrimaryCommit(multiCommit!, rowId, columnIndex, value)}
      >
        {value ? (
          <>
            <div className={styles['cell-icon']}>
              <PrimaryKey />
            </div>
            <div className={styles['cell-value']}>{value}</div>
          </>
        ) : null}
      </div>
    );
  };

  const tableColumn = useMemo((): ITableColumn[] => {
    let columnSelect: ISelectOption[] = [{ label: '', value: '' }];
    let autoIncrements: ISelectOption[] = [];
    switch (serverType) {
      case 'Mysql':
      case 'Mariadb':
      case 'TiDB':
      case 'OceanBase':
        MysqlColumnType.forEach((item) => columnSelect.push({ label: item, value: item }));
        autoIncrements = ['', MysqlAutoIncrementType.AutoIncrement].map((item) => ({ label: item, value: item }));
        break;
      case 'Postgresql':
        let postgreAutoIncrementType = [
          '',
          PostgresAutoIncrementEnum.SERIAL,
          PostgresAutoIncrementEnum.BIGSERIAL,
          PostgresAutoIncrementEnum.SMALLSERIAL,
        ];
        PostgresColumnType.map((item) => columnSelect.push({ label: item, value: item }));
        autoIncrements = postgreAutoIncrementType.map((item) => ({ label: item, value: item }));
        break;
      case 'Oracle':
        OracleColumnType.map((item) => columnSelect.push({ label: item, value: item }));
        break;
      case 'SQLServer':
        MssqlColumnType.map((item) => columnSelect.push({ label: item, value: item }));
        //IDENTITY
        autoIncrements =
          //option ===
          //'edit' ? []:
          [
            { label: '', value: '' },
            { label: 'IDENTITY', value: 'IDENTITY' },
          ];
        break
      case 'DM':
        DMColumnType.map((item) => columnSelect.push({ label: item, value: item }));
        //IDENTITY
        autoIncrements =
          [
            { label: '', value: '' },
            { label: 'IDENTITY', value: 'IDENTITY' },
          ];
        break;
    }

    return [
      //Field
      {
        title: 'Field',
        columnKey: FieldName,
        width: 150,
        inputType: 'input',
        dataType: DataInputEnum.string,
        nullAble: 'NO',
      },
      //Type
      {
        title: 'Type',
        columnKey: TypeName,
        width: 130,
        inputType: 'select',
        selectGroup: columnSelect,
        showEdit: true,
        nullAble: 'NO',
      },
      //Length
      {
        title: 'Length',
        columnKey: LengthName,
        width: 80,
        inputType: 'input',
        dataType: DataInputEnum.number,
        nullAble: 'YES',
      },
      {
        title: 'Scale',
        columnKey: ScaleName,
        width: 80,
        inputType: 'input',
        dataType: DataInputEnum.number,
        nullAble: 'YES',
      },
      //Null
      { title: 'Not Null', columnKey: NotNullName, width: 80, showEdit: true, inputType: 'checkbox', nullAble: 'YES' },
      { title: 'Primary Key', columnKey: PrimaryKeyName, width: 80, render: renderPrimary }, //showEdit: true, type: 'checkbox', nullAble: 'YES'
      //Default
      {
        title: 'Default',
        columnKey: DefaultValueName,
        width: 150,
        inputType: 'selectInput',
        dataType: DataInputEnum.string,
        selectGroup: [
          { label: ColumnEditDefaultSelect.EmptyString, value: ColumnEditDefaultSelect.EmptyString },
          { label: ColumnEditDefaultSelect.NULL, value: ColumnEditDefaultSelect.NULL },
        ],
        nullAble: 'YES',
      },
      //Extra
      {
        title: 'AutoIncrement',
        columnKey: AutoIncrement,
        width: 130,
        inputType: 'selectInput',
        nullAble: 'YES',
        selectGroup: autoIncrements,
        disableEdit: option === 'edit' && (['Oracle'] as ServerType[]).includes(serverType),
      },
      //Comment
      {
        title: 'Comment',
        columnKey: CommentName,
        width: 150,
        inputType: 'input',
        dataType: DataInputEnum.string,
        nullAble: 'YES',
      },
    ];
  }, [option, serverType]);

  // const handleSelectTest = (value: string) => {
  //   setCurrentValue(value);
  // };
  return (
    <div>
      {/*留着解决select不能直接选择的问题*/}
      {/*<SelectInput*/}
      {/*  options={['AA', 'BB', 'CC', 'DD']}*/}
      {/*  value={(currentValue) as string}*/}
      {/*  onChange={handleSelectTest}*/}
      {/*  onSelected={handleSelectTest}*/}
      {/*  style={{ width: '50%' }}*/}
      {/*  allowOptionsOverflow={true}*/}
      {/*/>*/}
      {/*<TabsTitleItem title={'SQL预览'} fixWidth={100} />*/}
      <Tabs tabs={[<TabsTitleItem title={'表结构'} fixWidth={100} />]} value={tabIndex} onChange={handleTabIndex} />
      {isLoading ? (
        <ProgressBar loading />
      ) : (
        <TableEditor
          columns={tableColumn}
          data={tableData}
          tableHeight={height - 39}
          tableWidth={width - 5}
          primaryKey={'name'}
          table={tableInstance}
          isLoading={dataLoading}
          onRefresh={handleRefresh}
          immediateRemove={false}
          onSave={handleSave}
          option={true}
          firstRowIsEdit={true}
          optionArgs={getTableArgs}
        />
      )}
    </div>
  );
};
