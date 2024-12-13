import { Autowired, Injectable } from '@opensumi/di';
import { Emitter, URI } from '@opensumi/ide-utils';
import { ConnectQuery, ServerInfo } from '../../../local-store-db/common';
import { AllNodeType } from '../../../base/types/server-node.types';
import { StrKeyObject } from '../../../base/model/common.model';
import { IRunSqlResult, ISqlServerApiToken } from '../../../server-client/common';
import { SqlServerApiService } from '../../../server-client/browser/sql-server-api.service';
import { IDialogService } from '@opensumi/ide-overlay';
import { QueryUtil } from '../../../base/utils/query-util';

@Injectable({ multiple: true })
export class ObjectDataService {
  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  //控制数据加载时的页面阴影显示
  private readonly onLoadingChangeEmitter = new Emitter<boolean>();
  private readonly onInfoDataChangEmitter = new Emitter<StrKeyObject>();
  private readonly onCreateSqlChangEmitter = new Emitter<string>();

  private openUri: URI;
  private nodePath: string;
  private server: ServerInfo;
  private db: number | string;
  private schema?: string;
  private nodeType: AllNodeType;
  private nodeName: string;
  private connect: ConnectQuery;

  public _whenReady: Promise<void>;

  get onLoadingChange() {
    return this.onLoadingChangeEmitter.event;
  }

  get onInfoDataChang() {
    return this.onInfoDataChangEmitter.event;
  }

  get onCreateSqlChang() {
    return this.onCreateSqlChangEmitter.event;
  }

  public init(
    openUri: URI,
    nodePath: string,
    server: ServerInfo,
    db: string,
    schema: string | undefined,
    nodeType: AllNodeType,
    nodeName: string,
  ) {
    this.openUri = openUri;
    this.nodePath = nodePath;
    this.server = server;
    this.db = db;
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.schema = schema;
    this.connect = { server, db, schema };
    this._whenReady = this.resolveWorkspaceData();
  }

  get whenReady() {
    return this._whenReady;
  }

  public async resolveWorkspaceData() {
    await this.resolveInfo();
    await this.resolveCreateSql();
  }

  public async resolveInfo() {
    let queryResult: IRunSqlResult<StrKeyObject> | null = null;
    if (this.nodeType === 'function') {
      queryResult = await this.loadFunctionInfo();
    } else if (this.nodeType === 'sequence') {
      queryResult = await this.loadSequenceInfo();
    } else if (this.nodeType === 'procedure') {
      queryResult = await this.loadProcedureInfo();
    } else if (this.nodeType === 'trigger') {
      queryResult = await this.loadTriggerInfo();
    }
    if (queryResult) {
      if (queryResult.success && queryResult.data) {
        const data = queryResult.data[0];
        if (data) this.onInfoDataChangEmitter.fire(data);
      } else {
        this.dialogService.error(QueryUtil.getErrorMessage(queryResult), ['OK']);
      }
    } else {
      this.dialogService.error('系统错误，此功能未开发', ['OK']);
    }
    this.onLoadingChangeEmitter.fire(true);
  }

  public async resolveCreateSql() {
    let queryResult: IRunSqlResult<string> | null = null;
    if (this.nodeType === 'function') {
      queryResult = await this.loadFunctionSource();
    } else if (this.nodeType === 'sequence') {
      queryResult = await this.loadSequenceSource();
    } else if (this.nodeType === 'procedure') {
      queryResult = await this.loadProcedureSource();
    } else if (this.nodeType === 'trigger') {
      queryResult = await this.loadTriggerSource();
    }
    if (queryResult) {
      if (queryResult.success && queryResult.data) {
        this.onCreateSqlChangEmitter.fire(queryResult.data);
      } else {
        this.dialogService.error(QueryUtil.getErrorMessage(queryResult), ['OK']);
      }
      this.onLoadingChangeEmitter.fire(true);
    }
  }

  public async loadSequenceInfo(): Promise<IRunSqlResult<StrKeyObject[]>> {
    return await this.sqlServerApiService.showSequence(this.connect, this.nodeName);
  }
  public async loadSequenceSource(): Promise<IRunSqlResult<string>> {
    return await this.sqlServerApiService.showSequenceSource(this.connect, this.nodeName);
  }

  public async loadFunctionInfo() {
    return await this.sqlServerApiService.showFunction(this.connect, this.nodeName);
  }
  public async loadFunctionSource() {
    return await this.sqlServerApiService.showFunctionSource(this.connect, this.nodeName);
  }
  public async loadProcedureInfo() {
    return await this.sqlServerApiService.showProcedure(this.connect, this.nodeName);
  }

  public async loadProcedureSource() {
    return await this.sqlServerApiService.showProcedureSource(this.connect, this.nodeName);
  }

  public async loadTriggerInfo() {
    return await this.sqlServerApiService.showTrigger(this.connect, this.nodeName);
  }

  public async loadTriggerSource() {
    return await this.sqlServerApiService.showTriggerSource(this.connect, this.nodeName);
  }
}
