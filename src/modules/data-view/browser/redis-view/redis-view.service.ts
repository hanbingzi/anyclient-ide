import { Autowired, Injectable } from '@opensumi/di';
import { IRedisService, IRedisServiceToken, IRedisUpdateParam } from '../../../server-client/common';
import { IServerService, IServerServiceToken } from '../../../local-store-db/common';
import { ServerInfo } from '../../../local-store-db/common/model.define';
import { Emitter, URI } from '@opensumi/ide-utils';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { ITableRow, IUpdateDataResult } from '../../../components/table-editor';
import { RedisType } from '../../../base/types/common-fields.types';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { AllNodeType } from '../../../base/types/server-node.types';
import { QueryUtil } from '../../../base/utils/query-util';
import { IConnectTreeServiceToken } from '../../../open-recent';
import { ConnectTreeService } from '../../../open-recent/browser/connect-tree.service';
import { DocumentEditAbstract } from '../../../base/abstract/document-edit.abstract';

/**
 *
 * 努力学习---啦啦啦
 */
@Injectable({ multiple: true })
export class RedisViewService extends DocumentEditAbstract {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IRedisServiceToken)
  private redisService: IRedisService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(WorkbenchEditorService)
  private readonly workbenchEditorService: WorkbenchEditorService;

  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  //控制数据加载时的页面阴影显示
  private readonly onDataLoadingEmitter = new Emitter<boolean>();
  private readonly onKeyNameChangeEmitter = new Emitter<string>();
  private readonly onTtlChangeEmitter = new Emitter<number>();
  private readonly onKeyValueChangEmitter = new Emitter<any>();
  private openUri: URI;
  private nodePath: string;
  //private server: S;

  private nodeType: AllNodeType;
  private keyName: string;
  private keyTtl: number;
  private keyType: string;

  //private keyValue: any;
  public _whenReady: Promise<void>;

  get onDataLoadingChange() {
    return this.onDataLoadingEmitter.event;
  }

  get onKeyNameChange() {
    return this.onKeyNameChangeEmitter.event;
  }

  get onTtlChange() {
    return this.onTtlChangeEmitter.event;
  }

  get onKeyValueChange() {
    return this.onKeyValueChangEmitter.event;
  }

  public init(openUri: URI, nodePath: string, server: ServerInfo, db: number, keyName: string, nodeType: AllNodeType) {
    this.openUri = openUri;
    this.nodePath = nodePath;
    this.server = server;
    this.db = db;
    this.nodeType = nodeType;
    this.keyName = keyName;
    this._whenReady = this.resolveWorkspaceData();
  }

  public getDb() {
    return this.db;
  }

  public getServer() {
    return this.server;
  }

  public getKeyName() {
    return this.keyName;
  }

  public getKeyTtl() {
    return this.keyTtl;
  }

  public getKeyType() {
    return this.keyType;
  }

  // public getKeyValue() {
  //   return this.keyValue;
  // }

  get whenReady() {
    return this._whenReady;
  }

  // async initServer() {
  //   if (this.serverId) {
  //     this.server = await this.serverService.findById(this.serverId);
  //   }
  // }

  public async resolveWorkspaceData() {
    // if (!this.server) {
    //   await this.initServer();
    // }
    await this.loadData();
  }

  public updateData(keyType: RedisType, data: any) {
    //console.log('==========>keyData', data);
    if (keyType === RedisType.string) {
      //
      this.docUpdateData(data);
    } else {
      let convertData = data;
      if (keyType === RedisType.set || keyType === RedisType.list) {
        convertData = (data as string[]).map((item) => ({ value: item }));
      }
      this.data = convertData;
      this.onKeyValueChangEmitter.fire(convertData);
    }
  }

  public async refreshData(): Promise<boolean> {
    const keyData = await this.redisService.keyData({ server: this.server, db: this.db }, this.keyName, this.keyType);
    //console.log('refreshData:', keyData);
    if (keyData.success) {
      // this.onKeyValueChangEmitter.fire(this.keyValue);
      this.updateData(this.keyType as RedisType, keyData.data);
      return true;
    }
    return false;
  }

  public async loadData() {
    if (!this.server || !this.keyName) {
      return;
    }
    const keyInfo = await this.redisService.keyInfo({ server: this.server, db: this.db }, this.keyName);
    if (keyInfo.success) {
      const { keyType, keyTtl } = keyInfo.data!;
      //console.log('==========>keyInfo', keyInfo.data);
      this.updateKeyInfo(keyType, keyTtl);
      const keyData = await this.redisService.keyData({ server: this.server, db: this.db }, this.keyName, keyType!);
      if (keyData.success) {
        this.updateData(keyType as RedisType, keyData.data);
      }
    } else {
      this.dialogService.error('无法查询到' + this.keyName, ['OK']);
    }
  }

  public updateKeyInfo(keyType?: string, keyTtl?: number) {
    if (keyType) {
      this.keyType = keyType;
    }
    if (keyTtl) {
      this.keyTtl = keyTtl;
    }
  }

  public updateKeyTtl(ttl: number) {
    if (this.keyTtl !== ttl) {
      this.keyTtl = ttl;
      this.onTtlChangeEmitter.fire(ttl);
    }
  }

  public async keyRename(newName: string) {
    if (newName === this.keyName) {
      return;
    }
    const execResult = await this.redisService.keyRename({ server: this.server, db: this.db }, this.keyName, newName);
    if (execResult.success) {
      this.keyName = newName;
      this.onKeyNameChangeEmitter.fire(newName);
      this.messages.info('修改成功');
      return true;
    } else {
      //console.log(execResult.error);
      this.messages.error('修改失败');
      return false;
    }
  }

  public async keyExpire(keyTtl: number): Promise<boolean> {
    //判断number数值，在执行
    if (keyTtl <= 0) {
      const confirm = await this.dialogService.warning('过期时间小于等于0，key将会被删除', ['cancel', 'ok']);
      if (confirm !== 'ok') {
        return false;
      }
    }
    const execResult = await this.redisService.keyExpire({ server: this.server, db: this.db }, this.keyName, keyTtl);
    if (execResult.success) {
      this.updateKeyTtl(keyTtl);
      this.messages.info('修改成功');
      return true;
    } else {
      //console.log(execResult.error);
      this.messages.error('修改失败');
      return false;
    }
  }

  public async refreshInfo() {
    const keyTtlResult = await this.redisService.keyTtl({ server: this.server, db: this.db }, this.keyName);
    //const keyData = await this.redisService.keyData(this.serverInfo, this.db, this.keyName);
    //处理
    if (keyTtlResult.success) {
      this.updateKeyTtl(keyTtlResult.data!);
      this.onTtlChangeEmitter.fire(keyTtlResult.data!);
    }
    //刷新value
  }

  public async removeData(removeData: ITableRow[]): Promise<boolean> {
    const removeField: string[] = [];
    if (this.keyType === RedisType.set || this.keyType === RedisType.zset || this.keyType === RedisType.list) {
      removeData.map((item) => {
        removeField.push(item['value']);
      });
    } else if (this.keyType === RedisType.hash) {
      removeData.map((item) => {
        removeField.push(item['key']);
      });
    }
    const execResult = await this.redisService.deleteKeyData(
      {
        server: this.server,
        db: this.db,
      },
      this.keyName,
      removeField,
    );
    if (execResult.success) {
      this.messages.info('删除成功');
      return true;
    }

    return false;
  }

  public async deleteKey() {
    const select = await this.dialogService.warning('是否确定删除', ['cancel', 'ok']);
    if (select !== 'ok') {
      return;
    }
    //稍微麻烦
    //删除key
    const result = await this.redisService.deleteByType(
      {
        server: this.server,
        db: this.db,
      },
      this.nodeType,
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

  public async save(updateDataParam: IUpdateDataResult): Promise<boolean> {
    const { updateData, addData } = updateDataParam;
    const updateParam: IRedisUpdateParam[] = [];
    const addParam: IRedisUpdateParam[] = [];
    if (updateData && updateData.size > 0) {
      if (this.keyType === RedisType.set || this.keyType === RedisType.list) {
        updateData.forEach((item) => {
          updateParam.push({ oldKey: item.originalData['value'], newValue: item.updateRow.get('value') });
        });
      } else if (this.keyType === RedisType.hash) {
        updateData.forEach((item) => {
          const { key, value } = item.originalData;
          const updateKey = item.updateRow.get('key');
          const updateValue = item.updateRow.get('value');
          //表中可能修改了key，也有可能修改了value，但因为 所以，都需要设置
          const newKey = updateKey ? updateKey : key;
          const newValue = updateValue ? updateValue : value;
          updateParam.push({ oldKey: item.originalData['value'], newKey, newValue });
        });
      } else if (this.keyType === RedisType.zset) {
        updateData.forEach((item) => {
          const { score, value } = item.originalData;
          const updateScore = item.updateRow.get('score');
          const updateValue = item.updateRow.get('value');
          const newScore = updateScore ? updateScore : score;
          const newValue = updateValue ? updateValue : value;
          updateParam.push({ newScore: newScore || 1, newValue });
        });
      }
      await this.redisService.updateKeyData({ server: this.server, db: this.db }, this.keyName, updateParam);
    }
    if (addData && addData.size > 0) {
      if (this.keyType === RedisType.set || this.keyType === RedisType.list) {
        addData.forEach((item) => {
          addParam.push({ newValue: item.get('value') });
        });
      } else if (this.keyType === RedisType.hash) {
        addData.forEach((item) => {
          const newKey = item.get('key');
          const newValue = item.get('value');
          //表中可能修改了key，也有可能修改了value，但因为 所以，都需要设置
          addParam.push({ newKey, newValue });
        });
      } else if (this.keyType === RedisType.zset) {
        addData.forEach((item) => {
          const newScore = item.get('score');
          const newValue = item.get('value');
          //表中可能修改了key，也有可能修改了value，但因为 所以，都需要设置
          addParam.push({ newScore: newScore || 1, newValue });
        });
      }
     // console.log('addParam-------->', addParam);
      await this.redisService.addKeyData({ server: this.server, db: this.db }, this.keyName, addParam);
    }
    this.messages.info('保存成功');
    this.refreshData();
    return true;
  }
}
