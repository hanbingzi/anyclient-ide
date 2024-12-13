import { Autowired, Injectable } from '@opensumi/di';
import { DataOptionBase, IClickCellData, ITableRow } from '../../../components/table-editor';
import {
  CompositeKeyParam,
  ISqlServerApiToken,
  ITableDataResult,
  UpdateCompositeKeyParam,
  UpdateValueParam,
} from '../../../server-client/common';
import { IPage } from '../../../components/pagination';
import { ConnectQuery, IServerService, IServerServiceToken } from '../../../local-store-db/common';
import { Emitter, IClipboardService } from '@opensumi/ide-core-browser';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';
import { IBaseState } from '../../common/data-browser.types';
import { SqlTableEditAbstract } from '../../../base/abstract/sql-table-edit.abstract';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { AllNodeType, ServerType } from '../../../base/types/server-node.types';
import { DataItemInfoService } from '../../../data-item-info/browser/data-item-info.service';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { QueryUtil } from '../../../base/utils/query-util';
import { ServerPreferences } from '../../../base/config/server-info.config';
import { BaseSqlDialect } from 'modules/server-client/common/dialet/base-sql-dialect';

// 默认每页多少条
export const DEFAULT_PAGE_SIZE = 1000;
// 数据库默认展示的列宽度
export const DEFAULT_COLUMN_WIDTH = 100;

@Injectable({ multiple: true })
export class TableViewService extends SqlTableEditAbstract  {
  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(DataItemInfoService)
  private readonly dataItemInfoService: DataItemInfoService;

  @Autowired(IClipboardService)
  private readonly clipboardService: IClipboardService;

  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  private readonly onPageChangeEmitter = new Emitter<IPage>();

  private _page: IPage = { total: 0, page: 1, pageSize: 50 };

  private _filters: IWhereParam[];
  private _enableFilter: boolean = false;

  protected _option: DataOptionBase = {
    search: true,
    add: true,
    remove: false,
    update: false,
    save: true,
    revert: true,
    cancel: true,
    refresh: true,
    filter: true,
  };

  private nodeType: AllNodeType;

  get onPageChange() {
    return this.onPageChangeEmitter.event;
  }

  public serverId: string;

  public init(tableState: IBaseState) {
    const { serverId, db, schema, nodeName: tableName, serverType, nodeType, option } = tableState;
    this.serverId = serverId!;
    this.db = db + '';
    this.schema = schema ? schema : '';
    this.tableName = tableName;
    this.nodeType = nodeType!;
    this.serverType = serverType;
    this._whenReady = this.resolveWorkspaceData();
  }

  get whenReady() {
    return this._whenReady;
  }

  // get tableData() {
  //   return this._tableData;
  // }

  // get tableColumn() {
  //   return this._tableColumn;
  // }

  get page() {
    return this._page;
  }

  get filters() {
    return this._filters;
  }

  get isEnableFilter() {
    return this._enableFilter;
  }

  get connect(): ConnectQuery {
    return { server: this.server, db: this.db, schema: this.schema };
  }

  async initServer() {
    const serverInfo = await this.serverService.findById(this.serverId, true);
    this.server = serverInfo;
  }

  async resolveWorkspaceData() {
    if (!this.server) {
      await this.initServer();
    }
    await this.reloadData();
  }

  public async reloadData() {
    try {
      //console.log('reloadData----selectResult->db:', this.db, "；this.schema:", this.schema)
      let selectResult: ITableDataResult = await this.sqlServerApiService.selectTableData(
        this.connect,
        this.tableName,
        this.page,
        this.isEnableFilter ? this.filters : [],
      );
      //console.log('reloadData----selectResult->', selectResult);
      if (selectResult.success) {
        this.runSql = selectResult.sql;
        this.costTime = selectResult.costTime;
        this.updateData(selectResult.data);
        await this.loadColumn(selectResult);
        this.refreshPage(selectResult.total!, selectResult.data.length);
        this.onDataLoadingErrorEmitter.fire({ success: true });
        return true;
      } else {
        const errorMessage = QueryUtil.getErrorMessage(selectResult);
        this.dialogService.error(errorMessage);
        this.onDataLoadingErrorEmitter.fire({ success: false, message: errorMessage });
        return false;
      }
    } finally {
      //console.log('wozhixinglema -->')
      this.onDataLoadingChangeEmitter.fire(false);
    }
  }

  public async loadColumn(selectResult: ITableDataResult) {
    const serverConfig = ServerPreferences[this.serverType];
    //get primary
    const primaryQueryResult = await this.sqlServerApiService.showPrimary(this.connect, this.tableName);
    let primaryKeyList: string[] = [];
    if (primaryQueryResult.success) {
      primaryQueryResult.data?.forEach((item) => {
        primaryKeyList.push(item.columnName);
      });
    }
    //showColumn sql 语句没有实现，采用jdbc自带的
    if (serverConfig.connectUseJdbc && !serverConfig.hasShowColumnSql) {
      this.updateColumn(selectResult.columns, primaryKeyList);
    } else {
      const columnResult = await this.sqlServerApiService.showColumns(this.connect, this.tableName);
      if (columnResult.success) {
        this.updateColumn(columnResult.data!, primaryKeyList);
      }
    }
  }

  loadPrimaryEnd() {
    let option: DataOptionBase = {
      search: true,
      add: true,
      remove: false,
      update: false,
      save: true,
      revert: true,
      cancel: true,
      refresh: true,
      filter: true,
    };
    if (this.primaryKeys && this.primaryKeys.length > 0) {
      //某些数据库不允许删除
      option.remove = true;
      //时序数据库不允许修改
      if(!(['TDEngine']as ServerType[]).includes(this.serverType)){
        option.update = true;
      }

    }
    //console.log('loadPrimaryEnd-->', option);
    this.updateOption(option);
  }

  async refreshPage(total: number, pageCount: number) {
    this._page = { ...this._page, total, pageCount };
    //console.log('refreshPage-->', this._page);
    this.onPageChangeEmitter.fire(this._page);
  }

  async loadDataByPage(page: number, pageSize: number) {
    this._page = { ...this._page, page, pageSize };
    //console.log('loadDataByPage-->', this._page);
    await this.reloadData();
  }

  public async filter(filterParams: IWhereParam[]) {
    this._filters = filterParams;
    return await this.reloadData();
  }

  public setFilterSetting(isEnable: boolean) {
    this._enableFilter = isEnable;
  }

  async removeRemote(deleteParams: CompositeKeyParam[][]): Promise<boolean> {
    let runResults = await this.sqlServerApiService.deleteTableDataByCompositeKeys(
      this.connect,
      this.tableName,
      deleteParams,
    );
    let errorResult = runResults.find((item) => !item.success);
    if (errorResult) {
      this.dialogService.error(errorResult.message, ['ok']);
      return false;
    }
    return true;
  }

  async saveRemote(updateParamSet: Set<UpdateCompositeKeyParam>): Promise<boolean> {
    const runResults = await this.sqlServerApiService.updateBatchDataByCompositeKey(
      this.connect,
      this.tableName,
      updateParamSet,
    );
    let errorResult = runResults.find((item) => !item.success);
    if (errorResult) {
      this.dialogService.error(errorResult.message, ['ok']);
      return false;
    }
    return true;
  }

  public showDataItemInfo(data: any, isRowData: boolean = false) {
    if (isRowData && data) {
      const rowData = data as IClickCellData[][];
      let showData = '';
      const dialog = this.sqlServerApiService.getDialect(this.server.serverType!);
      for (let row of rowData) {
        const updateData: Set<UpdateValueParam> = new Set();
        for (let item of row) {
          const { columnKey, column, lastValue } = item;
          updateData.add({ columnName: columnKey, newValue: lastValue, valueType: column.dataType! });
        }
        //生成insert语句
        showData =
          showData +
          dialog.buildUpdateData(
            {
              server: this.server,
              db: this.db,
              schema: this.schema,
            },
            this.tableName,
            { updateData },
          ) +
          ';\n';
      }
      //根据数据，生成插入语句
      //console.log('showDataItemInfo-->', data)
      data = showData;
    }
    this.dataItemInfoService.showData(data);
  }

  public getDialect(): BaseSqlDialect {
    return this.sqlServerApiService.getDialect(this.server.serverType!);
  }

  public async copyRowSql(rows: ITableRow[], type: 'insert' | 'update' | 'delete') {
    let batchSql: string[] = [];
    switch (type) {
      case 'delete':
        batchSql = super.buildDeleteSql(rows);
        break;
      case 'insert':
        batchSql = super.buildInsertSql(rows);
        break;
      case 'update':
        batchSql = super.buildUpdateSql(rows);
        break;
    }
    const sql = batchSql.join(';\n') + ';\n';
    await this.clipboardService.writeText(sql);
    this.messages.info('sql复制成功');
  }
}
