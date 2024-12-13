import { Autowired, Injectable } from '@opensumi/di';
import { IQueryResult, IZkStat, IZookeeperService, IZookeeperServiceToken } from '../../../server-client/common';
import { IServerService, IServerServiceToken, ServerInfo } from '../../../local-store-db/common';
import { Emitter, URI } from '@opensumi/ide-utils';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { QueryUtil } from '../../../base/utils/query-util';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { IConnectTreeServiceToken } from '../../../open-recent';
import { ConnectTreeService } from '../../../open-recent/browser/connect-tree.service';
import { DocumentEditorServiceToken } from '../../../doc-editor/common';
import { DocumentEditorService } from '../../../doc-editor/browser/document-editor.service';
import { OpenOption } from '../../../base/param/open-view.param';
import { DocumentEditAbstract } from '../../../base/abstract/document-edit.abstract';

/**
 * 孟爽
 * 颜燕
 * 努力学习---啦啦啦
 */
@Injectable({ multiple: true })
export class ZookeeperViewService extends DocumentEditAbstract {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IZookeeperServiceToken)
  private zookeeperService: IZookeeperService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(WorkbenchEditorService)
  private readonly workbenchEditorService: WorkbenchEditorService;

  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  @Autowired(DocumentEditorServiceToken)
  private documentEditorService: DocumentEditorService;

  //控制数据加载时的页面阴影显示
  //private readonly onKeyDataChangEmitter = new Emitter<any>();
  private readonly onStatChangEmitter = new Emitter<IZkStat>();
  private openUri: URI;
  private nodePath: string;
  //private serverId: string;
  //private server: ServerInfo;
  private keyName: string;
  //private fullPath: string;
  private nodeName: string;
  private keyValue: any;

  private stat: IZkStat;
  public _whenReady: Promise<void>;

  // get onDataLoadingChange() {
  //   return this.onDataLoadingEmitter.event;
  // }

  // get onKeyDataChange() {
  //   return this.onKeyDataChangEmitter.event;
  // }

  get onStatChange() {
    return this.onStatChangEmitter.event;
  }

  public init(
    openUri: URI,
    nodePath: string,
    server: ServerInfo,
    option: OpenOption,
    nodeName: string,
    fullPath: string,
    viewId: string,
  ) {
    //console.log(`openUri${openUri};nodePath:${nodePath};fullPath:${fullPath}`);
    this.openUri = openUri;
    this.nodePath = nodePath;
    //this.serverId = serverId;
    this.keyName = fullPath;
    this.nodeName = nodeName;
    //this.fullPath = fullPath;
    this.server = server;
    this.option = option;
    this.viewId = viewId;
    this._whenReady = this.resolveWorkspaceData();
  }

  // public getServer() {
  //   return this.server;
  // }

  // public getKeyName() {
  //   return this.keyName;
  // }

  // public getKeyData() {
  //   return this.keyValue;
  // }

  public getStat() {
    return this.stat;
  }

  get whenReady() {
    return this._whenReady;
  }

  public async resolveWorkspaceData() {
    if (this.option === 'open') await this.loadData();
  }

  public async loadData() {
    if (!this.server || !this.keyName) {
      return;
    }
    //console.log('loadData data:', this.keyName);
    const result = await this.zookeeperService.getData({ server: this.server }, this.keyName);
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
      return;
    }
    //console.log('zookeeper load Data', result.data);
    const { data, stat } = result.data!;
    this.stat = stat;
    this.onStatChangEmitter.fire(stat);
    this.docUpdateData(data);
  }

  public async add(keyName: string) {
    const keyData = await this.documentEditorService.getTempData(this.viewId);
    //console.log('saveAdd', this.server, '--keyName:', keyName, '--keyData:', keyData);
    let result: IQueryResult;
    if (keyData) {
      result = await this.zookeeperService.createWithData({ server: this.server }, keyName, keyData);
    } else {
      result = await this.zookeeperService.create({ server: this.server }, keyName);
    }
    if (result?.success) {
      this.successRefresh(result);
    } else {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
  }

  public async update() {
    const keyData = await this.documentEditorService.getTempData(this.viewId);
    //console.log('saveAdd', this.server, '--keyName:', this.keyName, '--keyData:', keyData);
    let result: IQueryResult;
    if (keyData) {
      result = await this.zookeeperService.setData({ server: this.server }, this.keyName, keyData);
    }
    if (result?.success) {
      this.loadData();
      this.messages.info('保存成功');
    } else {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
  }

  public async refreshDataAndInfo() {
    this.loadData();
  }

  public async deleteKey() {
    const select = await this.dialogService.warning('是否确定删除', ['cancel', 'ok']);
    if (select !== 'ok') {
      return;
    }
    //稍微麻烦
    //删除key
    const result = await this.zookeeperService.delete({ server: this.server }, this.keyName);
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['OK']);
      return;
    }
    //刷新菜单
    await this.connectTreeService.refreshByPathForServerNode(this.nodePath);
    //关闭当前页面
    await this.workbenchEditorService.close(this.openUri, true); //force 关闭前不提醒

    this.messages.info('删除成功');
  }

  public async successRefresh(result: IQueryResult) {
    if (result.success) {
      this.messages.info('保存成功');
      await this.connectTreeService.refreshByPathForServerNode(this.nodePath);
      await this.workbenchEditorService.close(this.openUri, false);
    } else {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['OK']);
    }
  }
}
