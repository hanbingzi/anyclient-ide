import { Autowired, Injectable } from '@opensumi/di';
import { IQueryResult, IRedisService, IRedisServiceToken, IRedisUpdateParam } from '../../../server-client/common';
import { IServerService, IServerServiceToken, ServerInfo } from '../../../local-store-db/common';
import { URI } from '@opensumi/ide-utils';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { ITableRow } from '../../../components/table-editor';
import { RedisInputType, RedisType } from '../../../base/types/common-fields.types';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { AllNodeType } from '../../../base/types/server-node.types';
import { QueryUtil } from '../../../base/utils/query-util';
import { IConnectTreeServiceToken } from '../../../open-recent';
import { ConnectTreeService } from '../../../open-recent/browser/connect-tree.service';
import { IBaseState } from '../../common/data-browser.types';
import { DocumentEditorServiceToken } from '../../../doc-editor/common';
import { DocumentEditorService } from '../../../doc-editor/browser/document-editor.service';
import { isNotNull } from '../../../base/utils/object-util';

/**
 * 孟爽
 * 颜燕
 * 努力学习---啦啦啦
 */
@Injectable({ multiple: true })
export class RedisKeyAddService {
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

  @Autowired(DocumentEditorServiceToken)
  private documentEditorService: DocumentEditorService;

  //控制数据加载时的页面阴影显示
  private openUri: URI;
  private nodePath: string;
  //private server: S;
  private server: ServerInfo;
  private db: number;

  private nodeType: AllNodeType;
  //private keyName: string;
  // private keyType: string;

  private viewId: string;
  public _whenReady: Promise<void>;

  public init(props: IBaseState, viewId: string) {
    const { openUri, nodePath, server, db, nodeType, nodeName } = props;
    this.openUri = openUri;
    this.nodePath = nodePath;
    this.server = server;
    this.db = Number(db);
    this.nodeType = nodeType;
    //this.keyName = nodeName;
    this.viewId = viewId;
  }

  public async addKeyString(keyName: string, ttl?: number) {
    const keyData = await this.documentEditorService.getTempData(this.viewId);
    if (!keyData) {
      this.messages.error('key value 不能为空');
      return;
    }
    //console.log('doc获取的keyData------->', keyName, keyData, ttl);
    const result = await this.redisService.keySet({ server: this.server, db: this.db }, keyName, keyData, ttl);
    this.successRefresh(result);
  }

  public async addKeyTable(keyName: string, keyType: RedisInputType, keyData: Map<string, ITableRow>, ttl?: number) {
    const addParam: IRedisUpdateParam[] = [];
    if (keyData && keyData.size > 0) {
     // console.log('---------------1');
      if (keyType === RedisType.set ||  keyType === RedisType.list) {
        keyData.forEach((item) => {
          const value = item['value'];
          isNotNull(value) && addParam.push({ newValue: value });
        });
      } else if (keyType === RedisType.hash) {
        keyData.forEach((item) => {
          const newKey = item['key'];
          const newValue = item['value'];
          //表中可能修改了key，也有可能修改了value，但因为 所以，都需要设置
          if (isNotNull(newKey) && isNotNull(newValue)) {
            addParam.push({ newKey, newValue });
          }
        });
      } else if (keyType === RedisType.zset) {
        keyData.forEach((item) => {
          const newScore = item['score'];
          const newValue = item['value'];
          //表中可能修改了key，也有可能修改了value，但因为 所以，都需要设置
          if (isNotNull(newScore) && isNotNull(newValue)) {
            addParam.push({ newScore, newValue });
          }
        });

      }
      if (addParam.length > 0) {
        //console.log('addParam-------->', addParam);
        const result = await this.redisService.setKeyData(
          {
            server: this.server,
            db: this.db,
          },
          keyName,
          keyType,
          addParam,
          ttl,
        );
        this.successRefresh(result);
        return;
      }
    }
    this.messages.error('key value 不能为空');
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
