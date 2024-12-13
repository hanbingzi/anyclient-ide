import { Autowired, Injectable } from '@opensumi/di';
import {
  CompositeKeyParam,
  IColumnMeta,
  IRunSqlResult,
  ISqlServerApiToken,
  UpdateCompositeKeyParam,
} from '../../../server-client/common';
import { ServerInfo } from '../../../local-store-db/common';
import { DataOptionBase, ITableRow } from '../../../components/table-editor';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { SqlUtils } from '../../../base/utils/sql-utils';
import { SqlTableEditAbstract } from '../../../base/abstract/sql-table-edit.abstract';
import { ServerHasSchema } from '../../../base/config/server.config';
import { IServerPreference, ServerPreferences } from '../../../base/config/server-info.config';
import { IClipboardService } from '@opensumi/ide-core-browser';
import { BaseSqlDialect } from 'modules/server-client/common/dialet/base-sql-dialect';

@Injectable({ multiple: true })
export class SqlTableResultService extends SqlTableEditAbstract  {

  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IClipboardService)
  private readonly clipboardService: IClipboardService;

  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  private singleTable: boolean;
  private fields: any[];
  private columns: IColumnMeta[];
  private showColumns: IColumnMeta[];
  private config: IServerPreference;

  public multiTableName: string[];

  public init(runResult: IRunSqlResult, serverInfo: ServerInfo, dbValue?: string, schema?: string) {
    this.server = serverInfo;
    this.db = dbValue ? dbValue : '';
    this.schema = schema ? schema : '';
    this.serverType = serverInfo.serverType!;
    const { sql, costTime, data, fields, columns } = runResult;
    this.runSql = sql;
    this.costTime = costTime;
    this.config = ServerPreferences[this.serverType];
    if (this.config.connectUseJdbc) {
      this.fields = columns;
    } else {
      this.fields = fields!;
    }
    this.columns = columns!;
    this._whenReady = this.resolveData(data);
  }

  // public initRunResult(runResult: IRunSqlResult) {
  //   const {sql, costTime, data, fields} = runResult;
  //   this.runSql = sql;
  //   this.costTime = costTime;
  //
  //   this._whenReady = this.resolveData(data);
  // }

  // public initColumn(tableColumn: ITableColumn[]) {
  //   this.tableColumn = tableColumn;
  //   for (let item of tableColumn) {
  //     this.columnMap.set(item.columnKey, item);
  //   }
  ////console.log('initColumn--->', tableColumn)
  // }

  async resolveData(data) {
    //加载table ，primary key，判断查询出来的数据，是否可以增删改查
    await this.loadTables();
    this.updateData(data);
    // this.onDataLoadingChangeEmitter.fire(false)
  }

  //
  // async updateData(data) {
  //   this.tableData = data;
  //   this.onTableDataChangeEmitter.fire(this.tableData);
  // }

  public async loadTables() {
    this.onDataLoadingChangeEmitter.fire(true);
    const tableNames = SqlUtils.getSelectTableName(this.runSql);
    //console.log('tableNames:--->',tableNames)
    if (tableNames && tableNames.length === 1) {
      //console.log('loadTables:--->1')
      this.tableName = tableNames[0];
      //tableName 有可能是db.table(select * from test.sys_user;),所以以sql语句中的db为准
      const tableNameSplit = this.tableName.split('.');
      if (tableNameSplit.length === 2) {
        if (ServerHasSchema.includes(this.serverType)) {
          this.schema = tableNameSplit[0]; //
        } else {
          this.db = tableNameSplit[0]; //
        }
        //console.log('loadTables:--->2')
        this.tableName = tableNameSplit[1];
      }
      this.singleTable = true;
    } else {
      this.multiTableName = tableNames;
    }
    await this.loadColumn();
    this.onDataLoadingChangeEmitter.fire(false);
  }

  /**
   * 必须是单表，
   */
  public async loadColumn() {
    const serverConfig = ServerPreferences[this.serverType];
    ////jdbc的查询，对column已经分析了,但经常分析的缺少部分信息
    const connect = {
      server: this.server,
      db: this.db,
      schema: this.schema,
    };
    let primaryKeyList: string[] = [];
    if (this.singleTable) {
      const primaryQueryResult = await this.sqlServerApiService.showPrimary(connect, this.tableName);
      if (primaryQueryResult.success) {
        primaryQueryResult.data?.forEach((item) => {
          primaryKeyList.push(item.columnName);
        });
      }
    }
    let showColumnMeta: IColumnMeta[] = [];
    let queryColumnMeta: IColumnMeta[] = [];
    console.log('is-singleTable:', this.singleTable);
    let isColumnInit = false;
    if (serverConfig.connectUseJdbc) {
      console.log('use jdbc column', this.columns);
      showColumnMeta = this.columns;
      isColumnInit = true;
    }
    if (!isColumnInit) {
      //非jdbc的查询，需要单独分析column，对于重复字段,有重命名的字段，分析的有bug，
      //单表，有重命名的字段，也会分析的有问题
      if (this.singleTable) {
        //--------------后查的没有办法处理别名，jdbc查的能处理字段别名，（select id,nid ）--------------------------------
        const columnResult = await this.sqlServerApiService.showColumns(connect, this.tableName);
        if (columnResult.success) {
          queryColumnMeta = columnResult.data!;
        }
      } else {
        const columnResult = await this.sqlServerApiService.showMultiTableColumns(connect, this.multiTableName);
        if (columnResult.success) {
          queryColumnMeta = columnResult.data!;
        }
      }
      const columnMetaMap: Map<string, IColumnMeta> = new Map();
      queryColumnMeta.map((item) => {
        if (!columnMetaMap.has(item.name)) {
          //删除的原因是因为有些字段是重复的
          //比如同时查询class表和student表，class表的字段是id,student表的字段是id,id是重复的
          columnMetaMap.set(item.name, item);
        }
      });

      if (this.fields && queryColumnMeta) {
        for (let i = 0; i < this.fields.length; i++) {
          let field = this.fields[i];
          const column = columnMetaMap.get(field.name);
          if (column) {
            showColumnMeta.push(column);
          } else {
            showColumnMeta.push(this.columns[i]);
          }
        }
      }
    }
    this.showColumns = showColumnMeta;
    console.log('queryColumnMeta:', queryColumnMeta);
    console.log('showColumnMeta:', showColumnMeta);
    this.updateColumn(showColumnMeta, primaryKeyList);
  }

  loadPrimaryEnd() {
    console.log('loadPrimaryEnd', this.tableColumn);
    let option: DataOptionBase = {
      search: true,
      remove: false,
      update: false,
      refresh: true,
      filter: false,
    };
    if (this.singleTable) {
      //此处判断不对，应该判断查询出来的是否等于库中存在的
      if (this.primaryKeys && this.primaryKeys.length > 0) {
        //判断查询的结果是否包含所有主键，比如有两个主键uid,rid,如果只查询出来了一个，则不能使用删除
        const checkPrimary: Map<string, boolean> = new Map();
        this.primaryKeys.forEach((item) => checkPrimary.set(item, false));
        this.showColumns.forEach((column) => {
          if (checkPrimary.has(column.name)) {
            checkPrimary.set(column.name, true);
          }
        });
        let allColumnShow = true;
        checkPrimary.forEach((value) => {
          if (value === false) {
            allColumnShow = false;
          }
        });
        option = {
          ...option,
          add: true,
          remove: allColumnShow,
          update: allColumnShow,
          save: true,
          revert: true,
          cancel: true,
        };
      } else {
        option = { ...option, add: true, save: true, revert: true, cancel: true };
      }
    }
    this.updateOption(option);
  }

  public async loadPrimaryKey() {
    // this.loadPrimaryKey();
    // this.updateOption({
    //   save: true,
    //   add: true,
    //   revert: true,
    //   cancel: true,
    //   refresh: true,
    // })
    //table 只有一个时候，才可以做正删改查
    const primaryMeta = await this.sqlServerApiService.showPrimary(
      {
        server: this.server,
        db: this.db,
        schema: this.schema,
      },
      this.tableName,
    );
    console.log('primaryMeta:---->', primaryMeta);
    if (primaryMeta.success && primaryMeta.data) {
      const primaryKeys: string[] = [];
      primaryMeta.data.map((item) => {
        primaryKeys.push(item.columnName);
      });
      //具有table ，primary,满足正删改查条件
      this.primaryKeys = primaryKeys;
      this.updateOption({ remove: true, update: true });
    }
  }

  public async refresh() {
    return await this.reloadData();
  }

  public async reloadData(): Promise<boolean> {
    try {
      //this.onDataLoadingChangeEmitter.fire(true);
      const runResult = await this.sqlServerApiService.runSql(
        {
          server: this.server,
          db: this.db,
          schema: this.schema,
        },
        this.runSql,
      );
      if (runResult.success) {
        this.costTime = runResult.costTime;
        this.updateData(runResult.data);
        return true;
      } else {
        this.dialogService.error(runResult.message, ['OK']);
        return false;
      }
    } finally {
      //this.onDataLoadingChangeEmitter.fire(false);
    }
  }

  async removeRemote(deleteParams: CompositeKeyParam[][]): Promise<boolean> {
    console.log('remove param:', deleteParams);
    let runResults = await this.sqlServerApiService.deleteTableDataByCompositeKeys(
      {
        server: this.server,
        db: this.db,
        schema: this.schema,
      },
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
    const execResult = await this.sqlServerApiService.updateBatchDataByCompositeKey(
      {
        server: this.server,
        db: this.db,
        schema: this.schema,
      },
      this.tableName,
      updateParamSet,
    );
    let errorResult = execResult.find((item) => !item.success);
    if (errorResult) {
      this.dialogService.error(errorResult.message, ['ok']);
      return false;
    }
    return true;
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
