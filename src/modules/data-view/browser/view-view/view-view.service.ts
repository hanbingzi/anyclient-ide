import { Autowired, Injectable } from '@opensumi/di';
import {
  CompositeKeyParam,
  ISqlServerApiToken,
  ITableDataResult,
  UpdateCompositeKeyParam,
} from '../../../server-client/common';
import { IPage } from '../../../components/pagination';
import { ConnectQuery } from '../../../local-store-db/common';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';

import { AllNodeType } from '../../../base/types/server-node.types';
import { IBaseState } from '../../common/data-browser.types';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { BaseSqlDialect } from '../../../server-client/common/dialet/base-sql-dialect';
import { Emitter } from '@opensumi/ide-utils';
import { SqlTableEditAbstract } from '../../../base/abstract/sql-table-edit.abstract';

@Injectable({ multiple: true })
export class ViewViewService extends SqlTableEditAbstract  {
  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  // @Autowired(IServerServiceToken)
  // private readonly serverService: IServerService;
  //
  //
  // @Autowired(IDialogService)
  // private readonly dialogService: IDialogService;

  // private readonly onTableColumnChangeEmitter = new Emitter<ITableColumn[]>();
  private readonly onPageChangeEmitter = new Emitter<IPage>();

  private _page: IPage = { total: 0, page: 1, pageSize: 50 };

  private _filters: IWhereParam[];
  private _enableFilter: boolean = false;

  private nodeType: AllNodeType;

  // get onTableColumnChange() {
  //   return this.onTableColumnChangeEmitter.event;
  // }

  get onPageChange() {
    return this.onPageChangeEmitter.event;
  }

  public serverId: string;

  public init(tableState: IBaseState) {
    const { serverId, server, db, schema, nodeName, nodeType, option } = tableState;
    this.serverId = serverId!;
    this.server = server!;
    this.db = db + '';
    this.schema = schema ? schema : '';
    this.tableName = nodeName;
    this.nodeType = nodeType!;
    this._whenReady = this.resolveWorkspaceData();
  }

  get whenReady() {
    return this._whenReady;
  }

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

  async resolveWorkspaceData() {
    await this.reloadData();
  }

  public async reloadData() {
    try {
      let selectResult: ITableDataResult = await this.sqlServerApiService.selectViewData(
        this.connect,
        this.tableName,
        this.page,
        this.isEnableFilter ? this.filters : [],
      );
      if (selectResult.success) {
        //console.log('view column--->',selectResult.columns)
        this.runSql = selectResult.sql;
        this.costTime = selectResult.costTime;
        this.updateData(selectResult.data);
        this.updateColumn(selectResult.columns!,[]);
        this.refreshPage(selectResult.total!, selectResult.data.length);
        this.updateOption({
          search: true,
          refresh: true,
          filter: true,
        });
        return true;
      } else {
        return false;
      }
    } finally {
      this.onDataLoadingChangeEmitter.fire(false);
    }
  }

  public async filter(filterParams: IWhereParam[]) {
    this._filters = filterParams;
    return await this.reloadData();
  }

  public setFilterSetting(isEnable: boolean) {
    this._enableFilter = isEnable;
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

  async removeRemote(deleteParams: CompositeKeyParam[][]): Promise<boolean> {
    return false;
  }

  async saveRemote(updateParamSet: Set<UpdateCompositeKeyParam>): Promise<boolean> {
    return false;
  }

  loadPrimaryEnd() {}

  getDialect(): BaseSqlDialect {
    return undefined;
  }
}
