import React from 'react';
import { Autowired, Injectable } from '@opensumi/di';
import { action, observable } from 'mobx';
import { IServerEditService, pageStateType, TestConnectResult } from '../common';
import { ServerType } from '../../base/types/server-node.types';
import { Command, uuid } from '@opensumi/ide-core-common';
import { ServerCommandIds } from '../../base/command/menu.command';
import { IMessageService } from '@opensumi/ide-overlay';
import { IServerClass, ServerTypeClassInfo } from '../../base/config/server.config';
import { AppConfig } from '@opensumi/ide-core-browser';
import {
  IServerClusterDao,
  IServerClusterDaoPath,
  IServerService,
  IServerServiceToken,
  ServerCluster,
  ServerInfo,
} from '../../local-store-db/common';
import { IServerTreeNode, ServerTreeNodeUtils } from '../../base/model/server-tree-node.model';
import { ServerTreeService } from '../../server-list/browser/server-tree.service';
import { DateUtil } from '../../base/utils/date-util';
import { CommonServerApiService } from '../../server-client/browser/common-server-api.service';
import { ICommonServerApiToken, ISqlServerApiToken } from '../../server-client/common';
import { isEmpty } from '../../base/utils/object-util';
import { decryptData, encryptData } from '../../base/utils/crypto-util';
import { isValidFolderName } from '../../base/utils/validate-util';
import { SqlServerApiService } from '../../server-client/browser/sql-server-api.service';
import { IJdbcStartServicePath } from '../../admin/common';
import { JdbcStartService } from '../../admin/node/jdbc-start.service';
import { ServerPreferences } from '../../base/config/server-info.config';

@Injectable()
export class ServerEditService implements IServerEditService {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IServerClusterDaoPath)
  protected readonly serverClusterDao: IServerClusterDao;

  @Autowired(ServerTreeService)
  protected readonly serverTreeService: ServerTreeService;

  @Autowired(AppConfig)
  protected readonly appConfig: AppConfig;

  @Autowired(ICommonServerApiToken)
  protected readonly commonServerApiService: CommonServerApiService;

  @Autowired(ISqlServerApiToken)
  protected readonly sqlServerApiService: SqlServerApiService;

  @Autowired(IJdbcStartServicePath)
  private readonly jdbcStartService: JdbcStartService;

  @observable
  protected visible = false;

  @observable
  protected _selectedClass?: IServerClass;

  @observable
  protected _selectedServer?: ServerType;

  @observable
  protected _serverInfo?: ServerInfo;

  @observable
  protected _cluster?: ServerCluster[];

  @observable
  protected _option?: Command;

  @observable
  protected _testConnectResult: TestConnectResult = { stat: 'init' };
  //protected _connectStat:'success' | 'error' | 'init';

  @observable
  protected _testIsLoading: boolean;
  @observable
  protected _jdkError: boolean;

  /**
   * select 页面处于选择服务
   * input 页面属于选择完服务，输入ip，用户名，密码中
   * edit 页面属于编辑
   * @protected
   */
  @observable
  protected _pageState?: pageStateType;

  protected _editId?: string;

  protected _treeId?: number;

  isVisible(): boolean {
    return this.visible;
  }

  get selectedServer(): ServerType | undefined {
    return this._selectedServer;
  }

  get selectedClass(): IServerClass | undefined {
    return this._selectedClass;
  }

  title(): React.ReactNode | string {
    // if(this.selectedServer){
    //     return this._option?.label +' '+ServerIcon[this.selectedServer].icon+' '+this.selectedServer;
    // }else{
    return this._option?.label;
    //  }
  }

  get pageState(): pageStateType | undefined {
    return this._pageState;
  }

  get serverInfo(): ServerInfo | undefined {
    return this._serverInfo;
  }

  get cluster(): ServerCluster[] | undefined {
    return this._cluster;
  }

  get testConnectResult(): TestConnectResult {
    return this._testConnectResult;
  }

  get testIsLoading(): boolean {
    return this._testIsLoading;
  }

  get jdkIsError(): boolean {
    return this._jdkError;
  }

  @action
  open(option: Command, treeId?: number, entityId?: string): void {
    console.log('触发服务---》');
    this.visible = true;
    this._option = option;
    if (option === ServerCommandIds.newServer) {
      this._pageState = 'select';
    } else if (option === ServerCommandIds.editServer) {
      this._pageState = 'edit';
      this._treeId = treeId;
      this._editId = entityId;
      //
      this.initEditData();
    }
  }

  async initEditData() {
    //从数据库中查询数据，
    if (this._editId) {
      let serverInfo = await this.serverService.findById(this._editId);
      if (serverInfo.connectionType === 'Cluster') {
        let cluster = await this.serverClusterDao.findByServerId(serverInfo.serverId!);
        if (cluster) {
          this._cluster = cluster;
        }
      }
      //解码密码
      if (serverInfo.password) {
        serverInfo.password = decryptData(serverInfo.password);
      }
      console.log('initEditData:', serverInfo);
      //将数据进行修改
      this._selectedServer = serverInfo.serverType;

      // this._selectedClass =ServerTypeClassInfoData serverInfo.serverClass
      this._serverInfo = serverInfo;
    }
  }

  @action
  hide(): void {
    this.visible = false;
  }

  @action
  reset(): void {
    this._selectedClass = ServerTypeClassInfo[0];
    this._selectedServer = undefined;
    this._option = undefined;
    this._pageState = undefined;
    this._serverInfo = undefined;
    this._cluster = undefined;
    this._testConnectResult = { stat: 'init' };
    this._jdkError = false;
  }

  @action
  inputReset(): void {
    console.log('input reset');
  }

  @action
  setSelectedClass(selectedClass: IServerClass): void {
    this._selectedClass = selectedClass;
  }

  @action
  setSelectedServer(server: ServerType): void {
    this._selectedServer = server;
  }

  @action
  next(): void {
    if (!this._selectedServer) {
      this.messages.warning('请选中一个要连接的服务');
      return;
    }
    if (this._pageState === 'select') {
      this._pageState = 'input';
    }
  }

  @action
  last(): void {
    this._pageState = 'select';
    this.inputReset();
  }

  @action
  resetTestConnect() {
    if (this._testConnectResult.stat !== 'init') {
      this._testConnectResult = { stat: 'init' };
    }
  }

  @action
  async testConnect(server: ServerInfo, clusters?: ServerCluster[] | null) {
    const serverSetting = ServerPreferences[this._selectedServer];
    //检测jdk是否安装
    if (serverSetting.connectUseJdbc) {
      const isInstallJDK = await this.jdbcStartService.checkJDK();
      if (!isInstallJDK) {
        this._jdkError = true;
      }
    }
    this.resetTestConnect();
    this._testIsLoading = true;
    server.serverType = this._selectedServer!;
    console.log('test connect-->', server);
    const result = await this.commonServerApiService.testConnect({
      server,
      db: server.database,
      originPassword: true,
      cluster: clusters,
    });
    this._testIsLoading = false;
    //console.log('dao--->', result);
    if (result) {
      if (result.success) {
        this._testConnectResult = { stat: 'success' };
      } else {
        this._testConnectResult = { stat: 'error', result };
      }
    } else {
      this._testConnectResult = {
        stat: 'error',
        result: { success: false, code: -1, message: '该服务功能还未实现，暂时无法使用' },
      };
    }
  }

  async saveConnect(serverInfo: ServerInfo, clusters?: ServerCluster[] | null): Promise<boolean> {
    serverInfo.serverId = uuid();
    if (!serverInfo.rememberMe) {
      serverInfo.password = '';
    } else {
      serverInfo.password = serverInfo.password ? encryptData(serverInfo.password) : '';
    }

    //查询实际的分类
    // serverInfo.serverClass = Object.keys(ServerTypeClass).find((key: ServerClass) =>
    //   ServerTypeClass[key].includes(this.selectedServer),
    // ) as ServerClass;
    serverInfo.serverType = this.selectedServer!;
    const d = DateUtil.getDateString();
    serverInfo.lastOpenTime = d;
    serverInfo.createDate = d;
    serverInfo.updateDate = d;
    //serverInfo.sortNo = d.getTime();
    let validate = await this.validateAdd(serverInfo);
    console.log('saveConnect', serverInfo);
    if (!validate) {
      return false;
    }
    if (serverInfo.connectionType === 'Cluster' && clusters) {
      clusters.forEach((item) => (item.serverId = serverInfo.serverId!));
      await this.serverClusterDao.multiSave(clusters);
    }

    await this.serverService.save(serverInfo);
    this.messages.info(`添加${this.selectedServer}服务成功，服务名称:${serverInfo.serverName}`);
    this.visible = false;
    this.reset();

    //通知菜单树记性刷新
    const data: IServerTreeNode = ServerTreeNodeUtils.convertServer(serverInfo);
    await this.serverTreeService.addAndRefresh(serverInfo.serverType, data);
    return true;
  }

  async validateAdd(serverInfo: ServerInfo): Promise<boolean> {
    //验证名称是否有重复和类型是否有重复
    const validateNameParam: Partial<ServerInfo> = {
      serverName: serverInfo.serverName,
      serverType: serverInfo.serverType,
    };
    if (!isValidFolderName(serverInfo.serverName!)) {
      this.messages.error(`添加失败,${serverInfo.serverName}名称不合法`);
      return false;
    }
    const validateCount1 = await this.serverService.countByWhereParam(validateNameParam);
    if (validateCount1 >= 1) {
      this.messages.error(`添加失败,${serverInfo.serverType}下存在相同名称`);
      return false;
    }
    //验证类型，地址，用户是否有重复的。
    // const validateAddressParam: Partial<ServerInfo> = {
    //   serverType: serverInfo.serverType,
    //   host: serverInfo.host,
    //   user: serverInfo.user,
    // };
    //
    // const validateCount2 = await this.serverDao.countByWhereParam(validateAddressParam);
    // if (validateCount2 >= 1) {
    //   this.messages.error(`添加失败，${serverInfo.serverType}下存在相同地址和用户的链接`)
    //   return false;
    // }
    return true;
  }

  async editConnect(
    _editValues: ServerInfo,
    clusters?: ServerCluster[] | null,
    deleteClusterIds?: string[] | null,
  ): Promise<boolean> {
    console.log('before server', _editValues);
    if (!isValidFolderName(_editValues.serverName!)) {
      this.messages.error(`修改失败,${_editValues.serverName}名称不合法`);
      return false;
    }
    if (!_editValues.rememberMe) {
      _editValues.password = '';
    } else {
      _editValues.password = _editValues.password ? encryptData(_editValues.password) : '';
    }
    console.log('after server', _editValues);
    await this.serverService.updateById(this._editId!, _editValues);
    //删除jdbc服务中的server
    this.sqlServerApiService.clearJdbcServer(this._editId);
    if (_editValues.connectionType !== 'Cluster' && this.serverInfo?.connectionType === 'Cluster') {
      //根据serverId删除
      await this.serverClusterDao.deleteByServerId(this._editId!);
    } else if (_editValues.connectionType === 'Cluster') {
      //被删除的，根据clusterId删除
      if (deleteClusterIds && deleteClusterIds.length > 0) {
        await this.serverClusterDao.deleteByIds(deleteClusterIds);
      }
      //被修改或者被新增的
      if (clusters && clusters.length > 0) {
        clusters.forEach((item) => {
          if (isEmpty(item.serverId)) {
            item.serverId = this._editId!;
          }
        });
        await this.serverClusterDao.multiSave(clusters);
      }
    }
    this.reset();
    this.visible = false;

    //将修改后的数据从数据库中从新查询出来
    let newInfo = await this.serverService.findById(this._editId!);

    this.serverTreeService.updateNode(this._treeId!, newInfo);

    return true;
  }
}
