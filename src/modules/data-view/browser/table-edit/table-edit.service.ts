import { Autowired, Injectable } from '@opensumi/di';
import { ITableRow, IUpdateDataResult } from '../../../components/table-editor';
import { ConnectQuery, ServerInfo } from '../../../local-store-db/common/model.define';
import {
  CreateColumnParam,
  CreateTableParam, IRunSqlResult,
  ISqlServerApiToken,
  SortColumnParam,
  UpdateColumnParam,
} from '../../../server-client/common';
import { IServerService, IServerServiceToken } from '../../../local-store-db/common';
import { Emitter } from '@opensumi/ide-core-browser';
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
import { isEmpty } from '../../../base/utils/object-util';
import { OpenOption } from '../../../base/param/open-view.param';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';
import { IDialogService } from '@opensumi/ide-overlay';
import { QueryUtil } from '../../../base/utils/query-util';

@Injectable({ multiple: true })
export class TableEditService {
  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  //private readonly onOptionChangeEmitter = new Emitter<DataOptionBase>();
  private readonly onTableDataChangeEmitter = new Emitter<ITableRow[]>();
  private readonly onDataLoadingEmitter = new Emitter<boolean>();
  private readonly onOptionChangeEmitter = new Emitter<OpenOption>();

  public option: OpenOption;

  private _tableData: ITableRow[] = [];
  //private _tableColumn: ITableColumn[] = [];

  public _whenReady: Promise<void>;

  public serverId: string;

  public serverInfo: ServerInfo;

  public db: string | number;
  public schema: string;

  public tableName: string;

  get onTableDataChange() {
    return this.onTableDataChangeEmitter.event;
  }

  get onDataLoadingChange() {
    return this.onDataLoadingEmitter.event;
  }

  get onOptionChange() {
    return this.onOptionChangeEmitter.event;
  }

  get whenReady() {
    return this._whenReady;
  }

  get tableData() {
    return this._tableData;
  }

  get connect(): ConnectQuery {
    return { server: this.serverInfo, db: this.db, schema: this.schema };
  }

  public init(option: OpenOption, server: ServerInfo, db: string | number, schema: string, tableName: string) {
    // this.serverInfo = serverInfo;
    this.option = option;
    //this.serverId = serverId!;
    this.serverInfo = server;
    this.db = db;
    this.schema = schema;
    this.tableName = tableName;
    //  this.initColumn();
    this._whenReady = this.resolveData();
    //初始化列
  }

  // async initServer() {
  //   const serverInfo = await this.serverService.findById(this.serverId);
  //   this.serverInfo = serverInfo;
  // }

  async resolveData() {
    // if (!this.serverInfo) {
    //   await this.initServer();
    // }
    if (this.option === 'edit') {
      await this.loadData();
    } else {
      setTimeout(() => {
        this.onDataLoadingEmitter.fire(false);
      });
    }
  }

  public async loadData(): Promise<boolean> {
    //  try {
    this.onDataLoadingEmitter.fire(true);
    //获取表的primaryKey顺序
    let primaryResult = await this.sqlServerApiService.showPrimary(this.connect, this.tableName);
    let primaryList = primaryResult.data;
    let primaryMap: Map<string, number> = new Map();
    if (primaryList && primaryList.length > 0) {
      let defaultOrdinal = 1;
      primaryList.map((value) => {
        const { columnName, ordinal } = value;
        primaryMap.set(columnName, ordinal ? ordinal : defaultOrdinal);
        defaultOrdinal++;
      });
    }
    //console.log('primaryList---->', primaryList);
    let columnResult = await this.sqlServerApiService.showColumns(this.connect, this.tableName);
    if (columnResult.success) {
      const { serverType } = this.serverInfo;
      let columns = columnResult.data;
      //console.log('columns---->', columns);
      this._tableData = columns!.map((item) => {
        const { name, nullable } = item;
        let primaryOrdinal: number | undefined;
        if (primaryMap.has(name)) {
          primaryOrdinal = primaryMap.get(name);
        }
        let autoIncrement = item.autoIncrement;
        //sqlserver 自增查询结果为0或1，但展示的时候，需要转为为空和IDENTITY
        if (serverType === 'SQLServer' || serverType==='DM') {
          if (item.autoIncrement === '1'||item.autoIncrement ===1)
            autoIncrement = 'IDENTITY'
          else autoIncrement = '';
        }
        return {
          name: item.name,
          columnType: item.columnType,
          columnLength: item.columnLength,
          columnScale: item.columnScale,
          defaultValue: item.defaultValue,
          comment: item.comment,
          autoIncrement: autoIncrement,
          notNull: nullable === 'NO' || nullable === 0,
          primaryKey: primaryOrdinal,
        };
      });
      this.onTableDataChangeEmitter.fire(this.tableData);
    } else {
      this.dialogService.error(columnResult.message, ['OK']);
    }
    this.onDataLoadingEmitter.fire(false);
    return true;
    // } finally {
    //   return true;
    // }
  }

  public async refresh(): Promise<boolean> {
    return await this.loadData();
  }

  /**
   * 创建表
   * @param updateResult
   */
  public async saveCreateTable(updateResult: IUpdateDataResult): Promise<boolean> {
    this.onDataLoadingEmitter.fire(true);
    const { data: tableData } = updateResult;
    if (!tableData || tableData.length === 0) return false;
    let createColumns: CreateColumnParam[] = [];
    let sortPrimaryKeys: { columnName: string; order: number }[] = [];
    for (let itemRow of tableData) {
      //先处理primary，如果只修改了primary，要删除
      const columnName = itemRow[FieldName];
      if (!isEmpty(itemRow[PrimaryKeyName])) {
        sortPrimaryKeys.push({ columnName: columnName, order: Number.parseInt(itemRow[PrimaryKeyName]) });
      }
      createColumns.push({
        columnName,
        columnType: itemRow[TypeName],
        columnLength: itemRow[LengthName],
        columnScale: itemRow[ScaleName],
        notNull: itemRow[NotNullName],
        comment: itemRow[CommentName],
        defaultValue: itemRow[DefaultValueName],
        autoIncrement: itemRow[AutoIncrement],
      });
    }
    sortPrimaryKeys.sort((a, b) => a.order - b.order);
    let primaryKeys: string[] = sortPrimaryKeys.map((value) => value.columnName);
    let createTableParam: CreateTableParam = { table: this.tableName, columns: createColumns, primaryKeys };
    const runResults = await this.sqlServerApiService.createTableStructure(this.connect, createTableParam);
    const errResult = runResults.filter((item) => !item.success);
    if (errResult && errResult.length > 0) {
      this.dialogService.error(QueryUtil.getErrorMessage(errResult[0]), ['OK']);
      this.onDataLoadingEmitter.fire(false);
      return false;
    } else {
      this.onOptionChangeEmitter.fire('edit');
      this.option = 'edit';
      await this.refresh();
      this.onDataLoadingEmitter.fire(false);
      return true;
    }
  }

  /**
   * 修改表
   * @param updateResult
   */
  public async saveUpdateTable(
    updateResult: IUpdateDataResult,
    finalPrimaryList?: Map<string, Map<string, any>>,
  ): Promise<boolean> {
    try {
      const { updateData, addData, removeData, sortData } = updateResult;
      // console.log(
      //   '传过来的数据',
      //   'update:',
      //   updateData,
      //   '\n addData:',
      //   addData,
      //   '\n removeData:',
      //   removeData,
      //   '\n sortData:',
      //   sortData,
      //   '\n finalPrimaryList:',
      //   finalPrimaryList,
      // );
      //1.remove
      let removeParams: Set<string> = new Set<string>();
      if (removeData && removeData.length > 0) {
        for (let item of removeData) {
          removeParams.add(item[FieldName]);
        }
      }
      // let isPrimaryUpdate = false;
      // let isAutoIncrementUpdate = false;
      //2.2针对auto_increment处理
      //2.update 特殊处理primary key和auto_increment,如果有这两项的值，没有其他项的值，不需要提交列的修改，因为生成的sql中不包含primary和自增长的语句
      let updateParams: UpdateColumnParam[] = [];
      let autoIncrementParam: UpdateColumnParam | undefined;
      if (updateData && updateData.size > 0) {
        for (let item of updateData) {
          const { originalData, updateRow } = item;
          //先处理primary，如果只修改了primary，要删除
          //const newColumnName = !isEmpty(updateRow.get(FieldName)) ? updateRow.get(FieldName) : originalData[FieldName]
          if (updateRow.has(PrimaryKeyName)) {
            // isPrimaryUpdate = true;
            //primaryParams.push({columnName: newColumnName, order: Number.parseInt(updateRow.get(PrimaryKeyName))})
            updateRow.delete(PrimaryKeyName);
          }
          //处理auto_increment
          // if (updateRow.has(ExtraName)) {
          //   updateRow.delete(ExtraName);
          // }
          if (updateRow.size === 0) continue;
          const updateParamItem: UpdateColumnParam = {
            columnName: originalData[FieldName],
            newColumnName: updateRow.get(FieldName),
            columnType: originalData[TypeName],
            newColumnType: updateRow.get(TypeName),
            columnLength: originalData[LengthName],
            newColumnLength: updateRow.get(LengthName),
            columnScale: originalData[ScaleName],
            newColumnScale: updateRow.get(ScaleName),
            notNull: originalData[NotNullName],
            newNotNull: updateRow.get(NotNullName),
            defaultValue: originalData[DefaultValueName],
            newDefaultValue: updateRow.get(DefaultValueName),
            comment: originalData[CommentName],
            newComment: updateRow.get(CommentName),
            isPrimary:
              updateRow.get(PrimaryKeyName) !== undefined
                ? updateRow.get(PrimaryKeyName)
                : originalData[PrimaryKeyName],
            autoIncrement: originalData[AutoIncrement],
            newAutoIncrement: updateRow.get(AutoIncrement),
          };
          updateParams.push(updateParamItem);
          if (updateRow.has(AutoIncrement)) {
            autoIncrementParam = updateParamItem;
          }
        }
      }
      //3.add
      let addParams: CreateColumnParam[] = [];
      if (addData && addData.size > 0) {
        for (let addRow of addData) {
          const addParamItem :CreateColumnParam=
          {
            columnName: addRow.get(FieldName),
            columnType: addRow.get(TypeName),
            columnLength: addRow.get(LengthName),
            columnScale: addRow.get(ScaleName),
            notNull: addRow.get(NotNullName),
            comment: addRow.get(CommentName),
            defaultValue: addRow.get(DefaultValueName),
            //能够添加主键列的数据库需要此数据
            autoIncrement:addRow.get(AutoIncrement)
            //primaryKey: item.get(PrimaryKeyName),
            //extra: addRow.get(ExtraName)
          }
          addParams.push(addParamItem);
          //
          if (addParamItem.autoIncrement) {
            autoIncrementParam = {...addParamItem,newAutoIncrement:addParamItem.autoIncrement,autoIncrement:''};
          }
        }

      }
      //4.sort
      let sortParams: SortColumnParam[] = [];
      if (sortData && sortData.length > 0) {
        for (let item of sortData) {
          const { beforeKey, sortData } = item;
          sortParams.push({
            beforeKey: beforeKey as string,
            columnName: sortData[FieldName],
            columnType: sortData[TypeName],
            columnLength: sortData[LengthName],
          });
        }
      }
      //5针对promary处理
      let sortPrimaryKeyParam: string[] = [];
      //最终的key都要传入，，，，isPrimaryUpdate 无用
      //key目前的修改方法是，
      //从数据库查出当前的primary然后排序 existPrimarys
      //existPrimaryKeys与 sortPrimaryKeyParam（下面方法生成的）对比是否一致，一致，不修改，不一致，修改
      if (finalPrimaryList && finalPrimaryList.size > 0) {
        let sortPrimaryKeys: { columnName: string; order: number }[] = [];
        for (let row of finalPrimaryList) {
          const [key, rowData] = row;
          sortPrimaryKeys.push({
            columnName: rowData.get(FieldName),
            order: Number.parseInt(rowData.get(PrimaryKeyName)),
          });
        }
        sortPrimaryKeys.sort((a, b) => a.order - b.order);
        sortPrimaryKeyParam = sortPrimaryKeys.map((value) => value.columnName);
      }
      // console.log(
      //   '生成的数据',
      //   'remove:',
      //   removeParams,
      //   '\n update:',
      //   updateParams,
      //   '\n add',
      //   addParams,
      //   '\n sortData',
      //   sortParams,
      //   '\n sortPrimary',
      //   sortPrimaryKeyParam,
      //   '\n autoIncrementParam',
      //   autoIncrementParam
      // );
      const runResult = await this.sqlServerApiService.updateTableStructure(
        this.connect,
        this.tableName,
        removeParams,
        updateParams,
        addParams,
        sortParams,
        sortPrimaryKeyParam,
        autoIncrementParam,
      );
      let errorResult :IRunSqlResult[] = [];
      let successResult :IRunSqlResult[] = [];
      runResult.forEach((item) => {
        if(item.success){
          successResult.push(item)
        }else{
          errorResult.push(item)
        }
      });
      if (errorResult && errorResult.length > 0) {
        //console.log('errorResult', errorResult);
        this.dialogService.error(QueryUtil.getErrorMessage(errorResult[0]), ['OK']);
      }
      if(successResult.length>0){
        this.refresh();
        return true;
      }else{
        return false;
      }

    } catch (err) {
      console.error(err);
    }
    return false;
  }
}
