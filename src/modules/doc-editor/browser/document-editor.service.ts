import { Autowired, Injectable } from '@opensumi/di';
import { IMessageService } from '@opensumi/ide-overlay';
import { IRedisService, IRedisServiceToken, IZookeeperServiceToken } from '../../server-client/common';
import { ConnectQuery } from '../../local-store-db/common';
import { IClipboardService } from '@opensumi/ide-core-browser';
import { ZookeeperService } from '../../server-client/browser/services/zookeeper-service';
import { Emitter } from '@opensumi/ide-utils';
import { DataViewModelType, DisplayModelType, ModelMethod } from '../common';
import { DataUtil } from '../../base/utils/data-util';
import { RedisType } from '../../base/types/common-fields.types';
import jsonBig from 'json-bigint';
import { isEmpty } from '../../base/utils/object-util';
import { EtcdService } from '../../server-client/browser/services/etcd-service';

export interface TempStore {
  connect?: ConnectQuery;
  keyName?: string;
  keyData: string | Buffer | undefined;
  parsedData: string;
  modelMethod?: ModelMethod;
}

@Injectable()
export class DocumentEditorService {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IRedisServiceToken)
  protected readonly redisService: IRedisService;

  @Autowired(IZookeeperServiceToken)
  protected readonly zookeeperService: ZookeeperService;

  @Autowired(EtcdService)
  protected readonly etcdService: EtcdService;

  @Autowired(IClipboardService)
  private readonly clipboardService: IClipboardService;

  private readonly onJsonDataChangeEmitter = new Emitter<string>();
  private readonly activeSaveEmitter = new Emitter<string>();

  public static Store: Map<string, TempStore> = new Map();
  /**
   * fakeSave 因为opensumi编辑器不进行假保持，会认为有胀数据，不让刷新，所以要进行一下假保存
   */
  //public static FakeSaveSet: Set<string> = new Set();

  /**
   * 当编辑器自动保存时，会触动后台，此处记录是否是用户自动触动后台进行了保存
   */
  public static RealSaveSet: Set<string> = new Set();
  /**
   * 只有RefreshMap有值，才会真刷新
   * 用来确定刷新时，获取的数据类型
   */
  public static RefreshMap: Map<string, DisplayModelType> = new Map();

  public get onJsonDataChange() {
    return this.onJsonDataChangeEmitter.event;
  }

  public get onActiveSave() {
    return this.activeSaveEmitter.event;
  }

  public addTempData(viewId: string, store: TempStore) {
    DocumentEditorService.Store.set(viewId, store);
  }

  public delTempData(viewId: string) {
    DocumentEditorService.Store.delete(viewId);
  }

  public async getTempData(viewId: string): Promise<string | undefined> {
    //触发保存
    this.activeSaveEmitter.fire(viewId);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const store = DocumentEditorService.Store.get(viewId);
        resolve(store?.parsedData);
      }, 30);
    });
  }

  public shouldUpdateJsonData(viewId: string) {
    setTimeout(() => {
      this.onJsonDataChangeEmitter.fire(viewId);
    }, 100);
  }

  // public readyFakeSave(jsonId: string) {
  //   DocumentEditorService.FakeSaveSet.add(jsonId);
  // }

  public readyRealSave(jsonId: string) {
    DocumentEditorService.RealSaveSet.add(jsonId);
  }

  public readyRefresh(jsonId: string, selectModel: DisplayModelType) {
    DocumentEditorService.RefreshMap.set(jsonId, selectModel);
  }

  /**
   * 当选择类型是，会自动将数据填充到Store里面。
   * @param id
   */
  public async getKeyData(id: string): Promise<string> {
    if (!DocumentEditorService.Store.has(id)) {
     // console.log(`json id 尚未存入-----》(${id})`);
      return '';
    }
    const tempStore = DocumentEditorService.Store.get(id)!;
    const refreshMap = DocumentEditorService.RefreshMap;
    //console.log('getKeyData refreshMap:', refreshMap);
    if (refreshMap.has(id)) {
      const selectModel = refreshMap.get(id);
      let isRefreshSuccess = false;
      //console.log('selectModel:', selectModel, ';forceRefresh', '-》tempStore：', tempStore);
      const modelMethod = tempStore.modelMethod;
      if (modelMethod === 'Redis') {
        const connect = tempStore.connect!;
        const keyName = tempStore.keyName!;
        const queryResult = await this.redisService.keyData(connect, keyName, RedisType.string);
        if (queryResult.success) {
          isRefreshSuccess = true;
          const queryData = queryResult.data as Buffer;
          //console.log('redis - queryData:', queryData);
          tempStore.keyData = queryData;
        }
      } else if (modelMethod === 'Zookeeper') {
        const connect = tempStore.connect!;
        const keyName = tempStore.keyName!;
        const queryResult = await this.zookeeperService.getData(connect, keyName);
        if (queryResult.success) {
          isRefreshSuccess = true;
          tempStore.keyData = queryResult.data?.data;
        }
      } else if (modelMethod === 'Etcd') {
        const connect = tempStore.connect!;
        const keyName = tempStore.keyName!;
        const queryResult = await this.etcdService.keyValue(connect, keyName);
        if (queryResult.success) {
          isRefreshSuccess = true;
          tempStore.keyData = queryResult.data;
        }
      }
      refreshMap.delete(id);
      //解析数据
      if (isRefreshSuccess) {
        //console.log('刷新成功------》');
        const [parsedData] = this.parseViewData(tempStore.keyData, selectModel);
        tempStore.parsedData = parsedData;
        this.messages.info(`刷新成功`);
      }
    }
    return tempStore.parsedData;
  }

  // public getKeyDataId(serverId: string, db: number | string = 0, keyName: string) {
  //   return `${serverId}-${db}-${keyName}`;
  // }

  /**
   * 假保存：给刷新用的，因为不进行假保存，opensumi不允许刷新
   * 真保存：用户手动触发的保存，会将数据保存到数据库
   * @param jsonId
   * @param parsedData
   * @param immediateSave
   */
  public async saveKeyDataProvider(
    jsonId: string,
    parsedData: string,
    immediateSave: boolean = false,
    selectModel: DisplayModelType = 'Text',
  ) {
    console.log('saveKeyDataProvider saveKeyData------>', parsedData, `${immediateSave ? '手动保存' : '自动保存'}`);
    //const keyDataId = this.getKeyDataId(serverId, db, keyName);
    //这是一个假保存
    // if (DocumentEditorService.FakeSaveSet.has(jsonId)) {
    //   console.log('saveKeyDataProvider 假保存--》')
    //   DocumentEditorService.FakeSaveSet.delete(jsonId)
    //   return;
    // }
    //console.log('saveKeyData------>1')
    if (DocumentEditorService.RealSaveSet.has(jsonId) || immediateSave) {
      const tempStore = DocumentEditorService.Store.get(jsonId)!;
      const modelMethod = tempStore.modelMethod;
      if (modelMethod === 'Redis') {
        //每个key值的保存方法不同
        const connect = tempStore.connect!;
        const keyName = tempStore.keyName!;
        //将数据格式转换成buffer，才能再次存储
        console.log('后台保存-》document-editor redis save:', parsedData);
        const bufferData = this.stringToBuffer(parsedData, selectModel);
        const execResult = await this.redisService.keySetForBuffer(connect, keyName, bufferData);
        if (execResult.success) {
          tempStore.keyData = bufferData;
          tempStore.parsedData = parsedData;
          this.messages.info(`${keyName}保存成功`);
        }
      }
      DocumentEditorService.RealSaveSet.delete(jsonId);
    } else {
      //即不是真保存，也不是假保存，（用户没有点击保存，所以不需要保存到后台，只需要缓存保存的数据）
      console.log('我被自动保存-----------------》');
      const tempStore = DocumentEditorService.Store.get(jsonId)!;
      if (tempStore) tempStore.parsedData = parsedData;
    }
  }

  public async saveKeyDataByUser(jsonId: string, selectModel: DisplayModelType) {
    //为什么要延迟保存，因为调用saveKeyDataByUser的前提条件是开启了autoSave，得等待自动保存数据完毕，调用此方法才能获得数据
    //opensumi提供的provider不好用，所以造成的逻辑比较绕
    setTimeout(() => {
      const tempStore = DocumentEditorService.Store.get(jsonId)!;
      let parsedData = tempStore.parsedData;
      console.log('我被用户手动保存，-----------------》', parsedData);
      this.saveKeyDataProvider(jsonId, parsedData, true, selectModel);
    }, 300);
  }

  public async copyData(viewId: string) {
    const tempStore = DocumentEditorService.Store.get(viewId)!;
    await this.clipboardService.writeText(decodeURIComponent(tempStore.parsedData));
    this.messages.info(`复制成功`);
  }

  public setInitData(
    viewId: string,
    keyData: string | Buffer,
    connect?: ConnectQuery,
    keyName?: string,
    modelMethod?: ModelMethod,
  ): DataViewModelType {
    const store = DocumentEditorService.Store;
    const [parsedData, viewModel] = this.parseViewData(keyData);
    if (!store.has(viewId)) {
      //console.log('DocumentEditorService->setInitData:parsedData:', parsedData, ';viewModel:', viewModel);
      store.set(viewId, { connect, keyName, keyData, parsedData, modelMethod });
      return viewModel;
    }
    return viewModel;
  }

  /**
   *
   * @param keyData
   * @param selectModel
   */
  public parseViewData(
    keyData: Buffer | string | null | undefined,
    selectModel?: DisplayModelType,
    dateType?: 'string' | 'buffer',
  ): [string, DataViewModelType, boolean] {
    if (isEmpty(keyData)) {
      return ['', 'Text', false];
    }
    const parseError = 'parse error';
    let parseSuccess = true;
    let viewModel: DataViewModelType = 'Text';
    let viewData: string = '';
    if (typeof keyData === 'string' || dateType === 'string') {
      console.log('parseViewData-->value is string', selectModel);
      viewData = keyData ? (keyData as string) : '';
      if (selectModel) {
        viewModel = selectModel as DataViewModelType;
        // switch (selectModel) {
        //   case 'Text':
        //     viewData = keyData;
        //     break;
        //   case 'Json':
        //     viewData = keyData
        //     viewModel = 'Json';
        //     break;
        // case'Hex':
        //   console.log('parse-->Hex')
        //   viewData = DataDealUtil.bufToHex(keyData);
        //   break;
        // case 'Binary':
        //
        //   break;
        //}
      } else {
        if (DataUtil.isJSON(keyData)) {
          //用户未选择展示方式,自动判断展示方式
          viewModel = 'Json';
        }
      }
    } else {
      console.log('parseViewData-->value is Buffer');
      if (selectModel) {
        try {
          switch (selectModel) {
            case 'Text':
              console.log('parse-->text');
              viewData = DataUtil.bufToString(keyData);
              viewModel = 'Text';
              break;
            case 'Json':
              console.log('parse-->Json');
              viewData = DataUtil.bufToString(keyData);
              if (!DataUtil.isJSON(viewData)) {
                viewData = JSON.stringify({ error: parseError });
              }
              viewModel = 'Json';
              break;
            case 'Hex':
              console.log('parse-->Hex');
              viewData = DataUtil.bufToHex(keyData);
              break;
            case 'Binary':
              console.log('parse-->Binary');
              viewData = DataUtil.bufToBinary(keyData);
              break;
            case 'Msgpack':
              console.log('parse-->Msgpack');
              viewData = DataUtil.bufferToMsgpack(keyData!);
              if (DataUtil.isJSON(viewData)) {
                viewModel = 'Json';
              }
              break;
            case 'Java Serialized':
              console.log('parse-->JavaSerialized');
              viewData = JSON.stringify(DataUtil.bufferToJava(keyData!));
              viewModel = 'Json';
              break;
            // case 'Protobuf':
            //   viewData = JSON.stringify(DataDealUtil.bufferToProtobuf(keyData));
            //   viewModel = 'Json';
            //   break;
          }
        } catch (e) {
          parseSuccess = false;
          viewData = parseError;
        }
      } else {
        viewData = DataUtil.bufToString(keyData);
        if (DataUtil.isJSON(viewData)) {
          viewModel = 'Json';
        }
      }
    }
    if (viewModel === 'Json') {
      try {
        viewData = jsonBig.stringify(jsonBig.parse(viewData), null, 4);
      } catch (e) {
        console.log('-》');
      }
    }
    return [viewData, viewModel, parseSuccess];
  }

  public stringToBuffer(data: string, selectModel: DisplayModelType): Buffer {
    console.log('string to buffer:', selectModel, data);
    switch (selectModel) {
      case 'Text':
      case 'Hex':
        return DataUtil.xToBuffer(data);
      case 'Json':
        //防止数据被查看了，修改了格式内容
        if (DataUtil.isJSON(data)) {
          data = JSON.stringify(JSON.parse(data));
        }
        return DataUtil.xToBuffer(data);
      case 'Binary':
        return DataUtil.binaryStringToBuffer(data);
      case 'Msgpack':
        return DataUtil.msgpackToBuffer(data);
      default:
        this.messages.error(`数据保存出错`);
        throw new Error('DocumentEditorService stringToBuffer data change error');
    }
  }
}
