import { DataOptionBase, ITableColumn, ITableRow, IUpdateDataResult } from '../../components/table-editor';
import { ServerInfo } from '../../local-store-db/common';
import { CompositeKeyParam, IColumnMeta, UpdateCompositeKeyParam, UpdateValueParam } from '../../server-client/common';
import { DataInputEnum } from '../types/edit-input.types';
import { Emitter } from '@opensumi/ide-utils';
import { ServerType } from '../types/server-node.types';
import { SqlDealUtils } from '../../server-client/common/utils/sql-deal-utils';
import { IErrorLoad } from '../model/error-load.model';
import { BaseSqlDialect } from '../../server-client/common/dialet/base-sql-dialect';
import { ServerClassNamespace } from '../config/server.config';
import TimeSeries = ServerClassNamespace.TimeSeries;

export abstract class SqlTableEditAbstract {
  protected readonly onOptionChangeEmitter = new Emitter<DataOptionBase>();
  protected readonly onDataLoadingChangeEmitter = new Emitter<boolean>();
  protected readonly onDataLoadingErrorEmitter = new Emitter<IErrorLoad>();
  protected readonly onTableDataChangeEmitter = new Emitter<ITableRow[]>();
  private readonly onTableColumnChangeEmitter = new Emitter<ITableColumn[]>();

  protected _option: DataOptionBase = {
    search: true,
    add: false,
    remove: false,
    update: false,
    save: false,
    revert: false,
    cancel: false,
    refresh: true,
    filter: false,
  };
  protected tableData: ITableRow[];

  protected tableColumn: ITableColumn[] = [];

  public columnMap: Map<string, ITableColumn> = new Map();
  protected primaryKeys: string[];

  // 当前运行的sql
  protected runSql;
  // 消耗的时间
  protected costTime;

  public _whenReady: Promise<void>;

  public server: ServerInfo;

  public serverType: ServerType;

  public db: string;

  public schema: string;

  public tableName: string;
  //  select id nid,name nname,age nage from students;别名的映射
  // 查询的数据结果为{nid:1,nname:zhangsan},所以很多时候需要转换
  public LabelToNameRule: Map<string, string> = new Map();
  public NameToLabelRule: Map<string, string> = new Map();

  get whenReady() {
    return this._whenReady;
  }

  get onOptionChange() {
    return this.onOptionChangeEmitter.event;
  }

  get onDataLoadingChange() {
    return this.onDataLoadingChangeEmitter.event;
  }

  get onDataLoadingError() {
    return this.onDataLoadingErrorEmitter.event;
  }

  get onTableDataChange() {
    return this.onTableDataChangeEmitter.event;
  }

  get onTableColumnChange() {
    return this.onTableColumnChangeEmitter.event;
  }

  abstract loadPrimaryEnd();

  updatePrimary(primaryKeyList: string[]) {
    this.primaryKeys = primaryKeyList;
    this.loadPrimaryEnd();
  }

  isLongWidth(index: number, columnLength: number) {
    if (columnLength < 3 || (TimeSeries.includes(this.serverType) && index === 0)) {
      return true;
    }
    return false;
  }

  async updateColumn(columnList: IColumnMeta[], primaryList: string[]) {
    //const columnResult = await this.sqlServerApiService.showColumns(this.connect, this.tableName);
    //let primaryKeyList: string[] = [];
    // console.log('table-view-service----show column>', columnResult)
    //if (columnResult.success) {
    this.columnMap.clear();
    const tableColumn = [];

    const columnLabelNameRule: Map<string, string> = new Map();
    const columnNameLabelRule: Map<string, string> = new Map();
    //let columnList: IColumnMeta[] = columnResult.data!;
    columnList.map((columnMeta, index) => {
      const columnLabel = columnMeta.label ? columnMeta.label : columnMeta.name;
      const columnName = columnMeta.name;
      // if (SqlDealUtils.judgeColumnIsPrimary(columnMeta)) {
      //   primaryKeyList.push(columnMeta.name);
      //   isPrimary = true;
      // }
      columnLabelNameRule.set(columnLabel, columnName);
      columnNameLabelRule.set(columnName, columnLabel);
      let isPrimary = primaryList.includes(columnName);
      const tooltip = `${columnName} ${
        columnMeta.columnDefinition ? ': ' + columnMeta.columnDefinition : columnMeta.columnType
      }${columnMeta.comment ? '\n\n' + columnMeta.comment : ''}`; //&#10;换行

      const dataType = columnMeta.dataType
        ? columnMeta.dataType
        : SqlDealUtils.convertFieldsToInputType(this.server.serverType!, columnMeta.columnType);
      const extraColumn = this.judgeInputType(dataType);
      const column: ITableColumn = {
        title: columnLabel,
        tooltip,
        columnKey: columnLabel,
        dataType,
        isPrimary,
        width: this.isLongWidth(index, columnList.length) ? 200 : 0, //如果只有两列，就把展示弄的长一点
        ...extraColumn,
      };
      this.columnMap.set(columnName, column);
      tableColumn.push(column);
    });
    console.log('originalColumn:', columnList);
    console.log('convertedColumn:', tableColumn);
    //fire 之前，必须有await代码，否则消息不会进行通知，不知道为什么
    this.tableColumn = await tableColumn;
    this.LabelToNameRule = columnLabelNameRule;
    this.NameToLabelRule = columnNameLabelRule;

    this.updatePrimary(primaryList);
    this.onTableColumnChangeEmitter.fire(tableColumn);
    // }
  }

  public judgeInputType(dataType: DataInputEnum): Partial<ITableColumn> {
    switch (dataType) {
      case DataInputEnum.boolean:
        return {
          inputType: 'select',
          selectGroup: ['true', 'false', 'NULL'].map((item) => ({ label: item, value: item })),
        };
      case DataInputEnum.file:
        return { inputType: 'file', disableEdit: true };
      case DataInputEnum.bit:
        return { inputType: 'select', selectGroup: ['0', '1', 'NULL'].map((item) => ({ label: item, value: item })) };
      default:
        return { inputType: 'input' };
    }
  }

  async updateData(data) {
    console.log('sql table -model---------->', data);
    this.tableData = data;
    this.onTableDataChangeEmitter.fire(this.tableData);
  }

  async updateOption(option: DataOptionBase) {
    this._option = { ...this._option, ...option };
    this.onOptionChangeEmitter.fire(this._option);
  }

  public async remove(removeData: ITableRow[]): Promise<boolean> {
    //console.log('------>remove:1', removeData, ';this.primaryKey:', this.primaryKeys)
    if (!removeData || removeData.length === 0) {
      return false;
    }
    if (!this.primaryKeys || this.primaryKeys.length === 0) {
      return false;
    }
    this.onDataLoadingChangeEmitter.fire(true);
    let deleteParams: CompositeKeyParam[][] = [];
    for (let removeItem of removeData) {
      let deleteOne: CompositeKeyParam[] = [];
      for (let key of this.primaryKeys) {
        deleteOne.push({
          primaryKey: key,
          primaryValue: removeItem[this.NameToLabelRule.get(key)],
          valueType: this.columnMap.get(key)!.dataType!,
        });
      }
      deleteParams.push(deleteOne);
    }
    const runResult = await this.removeRemote(deleteParams);
    this.onDataLoadingChangeEmitter.fire(false);
    return runResult;
  }

  public abstract removeRemote(deleteParams: CompositeKeyParam[][]): Promise<boolean>;

  public async refresh() {
    return await this.reloadData();
  }

  public abstract reloadData(): Promise<boolean>;

  public async save(updateResult: IUpdateDataResult): Promise<boolean> {
    this.onDataLoadingChangeEmitter.fire(true);
    //console.log('传过来的数据', updateData, addData)
    const { updateData, addData } = updateResult;
    const updateParamSet: Set<UpdateCompositeKeyParam> = new Set();
    //修改的数据封装
    if (updateData && updateData.size > 0) {
      for (const updateRowDeriveData of updateData) {
        let updateValueParams: Set<UpdateValueParam> = new Set();
        let updateRow = updateRowDeriveData.updateRow;
        let originalData = updateRowDeriveData.originalData;
        for (let updateKey of updateRow.keys()) {
          const columnName = this.LabelToNameRule.get(updateKey);
          // const valueType = this.getColumnSimpleType(updateColumn.key);
          const updateValueParam: UpdateValueParam = {
            columnName: columnName,
            newValue: updateRow.get(updateKey),
            valueType: this.getColumnSimpleType(columnName),
          };
          updateValueParams.add(updateValueParam);
        }
        let compositeKeys: CompositeKeyParam[] = [];
        this.primaryKeys.map((key) => {
          compositeKeys.push({
            primaryKey: key,
            primaryValue: originalData[this.NameToLabelRule.get(key)],
            valueType: this.getColumnSimpleType(key),
          });
        });
        const updateParam: UpdateCompositeKeyParam = {
          keys: compositeKeys,
          updateData: updateValueParams,
        };
        updateParamSet.add(updateParam);
      }
    }
    if (addData && addData.size > 0) {
      for (const addRowMap of addData) {
        let insertData: Set<UpdateValueParam> = new Set();
        for (let addColumnKey of addRowMap.keys()) {
          const columnName = this.LabelToNameRule.get(addColumnKey);
          const updateColumn: UpdateValueParam = {
            columnName: columnName,
            newValue: addRowMap.get(addColumnKey),
            valueType: this.getColumnSimpleType(columnName),
          };
          insertData.add(updateColumn);
        }
        const insertRow: UpdateCompositeKeyParam = { updateData: insertData };
        updateParamSet.add(insertRow);
      }
    }
    let saveResult = false;
    if (updateParamSet.size > 0) {
      saveResult = await this.saveRemote(updateParamSet);
      if (saveResult) {
        console.log('saveResult success save---->');
        await this.refresh();
      }
    }
    this.onDataLoadingChangeEmitter.fire(false);
    return saveResult;
  }

  public abstract saveRemote(updateParamSet: Set<UpdateCompositeKeyParam>): Promise<boolean>;

  public getColumnSimpleType(columnName: string): DataInputEnum {
    let columnType = this.columnMap.get(columnName)!.dataType!;
    //console.log('getColumnSimpleType---->', columnName, columnType)
    return columnType;
  }

  public getColumnSimpleTypeByLabel(columnLabel: string): DataInputEnum {
    const columnName = this.LabelToNameRule.get(columnLabel);
    let columnType = this.columnMap.get(columnName)!.dataType!;
    //console.log('getColumnSimpleType---->', columnName, columnType)
    return columnType;
  }

  public abstract getDialect(): BaseSqlDialect;

  public buildInsertSql(rows: ITableRow[]): string[] {
    const sqlDialog = this.getDialect();
    const insertBatchSql: string[] = [];
    for (let row of rows) {
      const updateData: Set<UpdateValueParam> = new Set();
      Object.keys(row).map((key, index) => {
        const value = row[key];
        const columnName = this.LabelToNameRule.get(key);
        const column = this.columnMap.get(columnName);
        updateData.add({ columnName, newValue: value, valueType: column.dataType! });
      });
      insertBatchSql.push(
        sqlDialog.buildUpdateData(
          {
            server: this.server,
            db: this.db,
            schema: this.schema,
          },
          this.tableName,
          { updateData },
          true,
        ),
      );
    }
    return insertBatchSql; //.join(';\n');
  }

  public buildUpdateSql(rows: ITableRow[]): string[] {
    const sqlDialog = this.getDialect();
    const updateBatchSql: string[] = [];
    for (let row of rows) {
      const keyParams: CompositeKeyParam[] = [];
      const updateData: Set<UpdateValueParam> = new Set();
      Object.keys(row).map((key, index) => {
        const value = row[key];
        const columnName = this.LabelToNameRule.get(key);
        const column = this.columnMap.get(columnName);
        if (column.isPrimary) {
          keyParams.push({ primaryKey: columnName, primaryValue: value, valueType: column.dataType });
        } else {
          updateData.add({ columnName, newValue: value, valueType: column.dataType! });
        }
      });
      updateBatchSql.push(
        sqlDialog.buildUpdateDataByCompositeKey(
          {
            server: this.server,
            db: this.db,
            schema: this.schema,
          },
          this.tableName,
          { updateData, keys: keyParams },
        ),
      );
    }
    return updateBatchSql; //.join(';\n');
  }

  public buildDeleteSql(rows: ITableRow[]): string[] {
    const sqlDialog = this.getDialect();
    const deleteBatchSql: string[] = [];
    for (let row of rows) {
      const keyParams: CompositeKeyParam[] = [];
      for (let column of this.tableColumn) {
        if (column.isPrimary) {
          const value = row[column.columnKey];
          const columnName = this.LabelToNameRule.get(column.columnKey);
          keyParams.push({ primaryKey: columnName, primaryValue: value, valueType: column.dataType });
        }
      }
      deleteBatchSql.push(
        sqlDialog.deleteByCompositeKey(
          {
            server: this.server,
            db: this.db,
            schema: this.schema,
          },
          this.tableName,
          keyParams,
        ),
      );
    }
    return deleteBatchSql;
  }
}
