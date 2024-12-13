import { Autowired, Injectable } from '@opensumi/di';
import { IDbSelectServiceToken } from '../../toolbar-option/common';
import { DbSelectService } from '../../toolbar-option/browser/db-select.service';
import { IRedisServiceToken, IRunSqlResult, ISqlServerApiToken } from '../../server-client/common';
import { SqlServerApiService } from '../../server-client/browser/sql-server-api.service';
import { Emitter } from '@opensumi/ide-utils';
import { ConnectQuery, ServerInfo } from '../../local-store-db/common';
import { IStorage, STORAGE_NAMESPACE, StorageProvider } from '@opensumi/ide-core-common';
import { IMainLayoutService } from '@opensumi/ide-main-layout';
import { AppConstants } from '../../../common/constants';
import { SearchPreviewPosition } from '../../base/types/layout.types';
import { SlotLocation } from '@opensumi/ide-core-browser';
import { BOTTOM_QUERY_RESULT_CONTAINER } from './query-explorer.contribution';
import { RedisService } from '../../server-client/browser/services/redis-service';
import { FileSuffixType, ServerType } from '../../base/types/server-node.types';
import { IDialogService } from '@opensumi/ide-overlay';
import { IEsService, IEsServiceToken } from '../../server-client/common/types/es.types';

@Injectable()
export class QuerySqlExplorerService {
  @Autowired(IDbSelectServiceToken)
  private readonly dbSelectService: DbSelectService;

  @Autowired(ISqlServerApiToken)
  private sqlServerApiService: SqlServerApiService;

  // @Autowired(IJdbcServerApiToken)
  // private jdbcServerApiService: JdbcServerApiService;

  @Autowired(IRedisServiceToken)
  private redisService: RedisService;

  @Autowired(IEsServiceToken)
  private esService: IEsService;


  @Autowired(StorageProvider)
  private readonly storageProvider: StorageProvider;

  @Autowired(IMainLayoutService)
  private readonly layoutService: IMainLayoutService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  //private sqlRunResult: IRunSqlResult[] = [];
  //private queryResult: IRunSqlResult[] = [];

  private _serverInfo: ServerInfo;

  private _serverClass: FileSuffixType;

  private _serverType: ServerType;

  private _dbValue: string | number;
  private _schemaName: string;

  public get serverInfo() {
    return this._serverInfo;
  }

  public get serverClass() {
    return this._serverClass;
  }

  public get serverType() {
    return this._serverType;
  }

  public get dbValue() {
    return this._dbValue;
  }

  public get schemaName() {
    return this._schemaName;
  }

  public get connect(): ConnectQuery {
    return { server: this._serverInfo, db: this._dbValue, schema: this._schemaName };
  }

  private readonly onSqlRunResultChangeEmitter = new Emitter<IRunSqlResult[]>();
  private readonly onQueryResultChangeEmitter = new Emitter<IRunSqlResult[]>();
  private readonly onSelectedIndexChangeEmitter = new Emitter<number>();
  private readonly onServerClassChangeEmitter = new Emitter<FileSuffixType>();
  private readonly onServerTypeChangeEmitter = new Emitter<ServerType>();
  private readonly onLoadingChangeEmitter = new Emitter<boolean>();

  get onSqlRunResultChange() {
    return this.onSqlRunResultChangeEmitter.event;
  }

  get onQueryResultChange() {
    return this.onQueryResultChangeEmitter.event;
  }

  get onSelectedIndexChange() {
    return this.onSelectedIndexChangeEmitter.event;
  }

  get onServerClassChange() {
    return this.onServerClassChangeEmitter.event;
  }

  get onServerTypeChange() {
    return this.onServerTypeChangeEmitter.event;
  }

  get onLoadingChange() {
    return this.onLoadingChangeEmitter.event;
  }

  private updateRunResult(runResponseList: IRunSqlResult[]) {
    let queryResult: IRunSqlResult[] = [];
    for (let item of runResponseList) {
      if (this.serverClass === 'es' || item.isQuery) {
        queryResult.push(item);
      }
    }
    //this.sqlRunResult = runResponseList;
    //this.queryResult = queryResult;
    this.onQueryResultChangeEmitter.fire(queryResult);
    if (this.serverClass === 'es') {
      this.onSelectedIndexChangeEmitter.fire(1);
    } else {
      const successQueryResult = queryResult.filter((item) => item.success);
      if (successQueryResult.length > 0) {
        this.onSelectedIndexChangeEmitter.fire(1);
      } else {
        this.onSelectedIndexChangeEmitter.fire(0);
      }
    }

    this.onSqlRunResultChangeEmitter.fire(runResponseList);
  }

  private updateServerClass(serverClass: FileSuffixType) {
    this._serverClass = serverClass;
    this.onServerClassChangeEmitter.fire(serverClass);
  }

  private updateServerType(serverType: ServerType) {
    this._serverType = serverType;
    this.onServerTypeChangeEmitter.fire(serverType);
  }

  /**
   * isQuery
   *     1.单表，多表，
   *     2.表名
   *     3.此表有没有主键
   * insert/delete/update
   *     1.展示影响的行
   * error
   *     1.展示错误信息
   */
  public initServer(): boolean {
    const selectedServerNode = this.dbSelectService.selectedServerNode;
    const selectedDbNode = this.dbSelectService.selectedDbNode;
    const schemaNode = this.dbSelectService.selectedSchemaNode;
    this._serverClass = 'sql';
    this._serverType = selectedServerNode.serverType;
    if (!selectedServerNode) {
      this.dialogService.error('必须选择一个服务才可以执行', ['OK']);
      return false;
    }

    //清空之前的结果
    this._serverInfo = selectedServerNode?.serverInfo;
    this._dbValue = selectedDbNode ? selectedDbNode.value : '';
    this._schemaName = schemaNode ? schemaNode.name : '';
    console.log('query-sql-explorer:initServer----->', this.serverInfo, this.dbValue, this.schemaName);
    return true;
  }

  public async runSql(sql: string, multiSql: boolean) {
    const initResult = this.initServer();
    if (!initResult) {
      return;
    }
    this.showPreview();
    this.updateServerClass('sql');
    this.updateServerType(this.serverType);
    this.onLoadingChangeEmitter.fire(true);
    let runResponseList: IRunSqlResult[] = [];
    if (multiSql) {
      runResponseList = await this.sqlServerApiService.runBatch(this.connect, sql);
    } else {
      const runResponse = await this.sqlServerApiService.runSql(this.connect, sql);
      runResponseList.push(runResponse);
    }

    console.log('runSql response------->', runResponseList);

    this.updateRunResult(runResponseList);
    this.onLoadingChangeEmitter.fire(false);
  }

  public async runRedisCommand(command: string, multiCommand: boolean) {
    const initResult = this.initServer();
    if (!initResult) {
      return;
    }
    this.showPreview();
    this.onLoadingChangeEmitter.fire(true);
    this.updateServerClass('redis');
    let runResponseList: IRunSqlResult[] = [];
    if (multiCommand) {
      runResponseList = await this.redisService.runBatchCommand(this.connect, command);
    } else {
      const runResponse = await this.redisService.runCommand(this.connect, command);
      runResponseList.push(runResponse);
    }
    console.log('runCommand response------->', runResponseList);

    this.updateRunResult(runResponseList);
    this.onLoadingChangeEmitter.fire(false);
  }


  public async runEsCommand(command: string[], multiCommand: string, isBatchCommand: boolean) {
    const initResult = this.initServer();
    if (!initResult) {
      return;
    }
    this.showPreview();
    this.onLoadingChangeEmitter.fire(true);
    this.updateServerClass('es');
    let runResponseList: IRunSqlResult[] = [];
    if (isBatchCommand) {
      // runResponseList = await this.redisService.runBatchCommand(this.connect, multiCommand);
    } else {
      const runResponse = await this.esService.run(this.connect, command);
      runResponseList.push(runResponse);
    }

    this.updateRunResult(runResponseList);
    this.onLoadingChangeEmitter.fire(false);
  }

  public async showPreview() {
    const storage: IStorage = await this.storageProvider(STORAGE_NAMESPACE.EXPLORER);
    const position = await storage.get(AppConstants.SEARCH_PREVIEW_KEY);
    //默认right显示
    if (!position || position === SearchPreviewPosition.BOTTOM) {
      //切换right的显示
      const bottomContainer = this.layoutService.getTabbarHandler(BOTTOM_QUERY_RESULT_CONTAINER);
      !bottomContainer?.isVisible && bottomContainer?.activate();
    } else {
      const isVisible = this.layoutService.isVisible(SlotLocation.right);
      !isVisible && this.layoutService.toggleSlot(SlotLocation.right, true);
    }
  }
}
