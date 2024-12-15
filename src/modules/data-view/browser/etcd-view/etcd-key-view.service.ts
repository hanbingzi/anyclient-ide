import { Autowired, Injectable } from '@opensumi/di';
import { IServerService, IServerServiceToken, ServerInfo } from '../../../local-store-db/common';
import { Emitter, URI } from '@opensumi/ide-utils';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { IConnectTreeServiceToken } from '../../../open-recent';
import { ConnectTreeService } from '../../../open-recent/browser/connect-tree.service';
import { EtcdService } from '../../../server-client/browser/services/etcd-service';
import { IEtcdDataInfo } from '../../../server-client/common/types/etcd.types';
import { IQueryResult } from '../../../server-client/common';
import { QueryUtil } from '../../../base/utils/query-util';
import { OpenOption } from '../../../base/param/open-view.param';
import { DocumentEditorServiceToken } from '../../../doc-editor/common';
import { DocumentEditorService } from '../../../doc-editor/browser/document-editor.service';
import { DocumentEditAbstract } from '../../../base/abstract/document-edit.abstract';

/**
 *
 * 努力学习---啦啦啦
 */
@Injectable({ multiple: true })
export class EtcdKeyViewService extends DocumentEditAbstract{
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(EtcdService)
  private etcdService: EtcdService;

  // @Autowired(IServerServiceToken)
  // private readonly serverService: IServerService;

  @Autowired(WorkbenchEditorService)
  private readonly workbenchEditorService: WorkbenchEditorService;

  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  @Autowired(DocumentEditorServiceToken)
  private documentEditorService: DocumentEditorService;

  //控制数据加载时的页面阴影显示
  private readonly onDataLoadingEmitter = new Emitter<boolean>();
  private readonly onKeyInfoChangEmitter = new Emitter<IEtcdDataInfo>();
  private readonly onOptionChangEmitter = new Emitter<OpenOption>();

  private openUri: URI;
  private nodePath: string;

  private keyName: string;
  private extraData: IEtcdDataInfo;

  public _whenReady: Promise<void>;

  get onDataLoadingChange() {
    return this.onDataLoadingEmitter.event;
  }

  get onKeyInfoChange() {
    return this.onKeyInfoChangEmitter.event;
  }


  get onOptionChange() {
    return this.onOptionChangEmitter.event;
  }

  public init(openUri: URI, nodePath: string, server: ServerInfo, option: OpenOption, keyName: string, viewId: string) {
    this.openUri = openUri;
    this.nodePath = nodePath;
    this.server = server;
    this.keyName = keyName;
    this.option = option;
    this.viewId = viewId;
    this._whenReady = this.resolveWorkspaceData();
  }



  public getKeyName() {
    return this.keyName;
  }

  get whenReady() {
    return this._whenReady;
  }

  public async resolveWorkspaceData() {
    if (this.option === 'open') {
      await this.loadData();
    }
  }

  public async loadData() {
    if (!this.server || !this.keyName) {
      return;
    }
    const queryResult = await this.etcdService.keyDataInfo({ server: this.server }, this.keyName);
    if (queryResult.success) {
      //console.log('keyDataInfo---->', queryResult.data);
      const keyInfo = queryResult.data;

      this.docUpdateData(keyInfo.value)
      this.updateExtra({ ...keyInfo, value: '' });
    } else {
      this.dialogService.error('无法查询到' + this.keyName, ['OK']);
    }
  }

  public updateExtra(dataInfo: IEtcdDataInfo) {
    this.extraData = dataInfo;
    this.onKeyInfoChangEmitter.fire(dataInfo);
  }

  public async add(keyName: string) {
    //this.loadData();
    //刷新value
    const keyData = await this.documentEditorService.getTempData(this.viewId);
    if (!keyData) {
      this.messages.error('key value 不能为空');
      return;
    }
    //console.log('doc获取的keyData------->', keyName, keyData);
    const result = await this.etcdService.addOrUpdateKeyValue({ server: this.server }, keyName, keyData);
    if (result.success) {
      this.successRefresh(result);
    }
  }


  public async save(keyName: string) {
    //刷新value
    const keyData = await this.documentEditorService.getTempData(this.viewId);
    if (!keyData) {
      this.messages.error('key value 不能为空');
      return;
    }
    //console.log('doc获取的keyData------->', keyName, keyData);
    const result = await this.etcdService.addOrUpdateKeyValue({ server: this.server }, keyName, keyData);
    if (result.success) {
      this.messages.info('修改成功');
      this.loadData();
    }
  }

  public async deleteKey() {
    const select = await this.dialogService.warning('是否确定删除', ['cancel', 'ok']);
    if (select !== 'ok') {
      return;
    }
    //稍微麻烦
    //删除key
    const result = await this.etcdService.deleteKey(
      {
        server: this.server,
      },
      this.keyName,
    );
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
      return;
    }
    //刷新菜单
    this.connectTreeService.refreshByPathForServerNode(this.nodePath);
    //关闭当前页面
    await this.workbenchEditorService.close(this.openUri, false);
    await this.messages.info('删除成功');
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
