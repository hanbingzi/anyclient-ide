import { ConnectQuery, ServerInfo } from '../../local-store-db/common';
import { ServerType } from '../../base/types/server-node.types';

export const TextEditorDocumentContentProviderToken = Symbol('TextEditorDocumentContentProviderToken');

export const JSONEditorDocumentContentProviderToken = Symbol('JSONEditorDocumentContentProviderToken');

export const DocumentEditorServiceToken = Symbol('DocumentEditorServiceToken');

export const DisplayModelBuffer: string[] = ['Text', 'Json', 'Hex', 'Binary', 'Msgpack', 'Java Serialized', 'Protobuf'];
export const DisplayModelString: string[] = ['Text', 'Json'];
export type DisplayModelType = 'Text' | 'Json' | 'Hex' | 'Binary' | 'Msgpack' | 'Java Serialized'; // | 'Protobuf';
export type DataViewModelType = 'Json' | 'Text';

export type ModelMethod = ServerType |'empty';

export interface IDataEditor {
  width: number;
  height: number;

  // serverInfo?: ServerInfo;
  // serverId?: string;
  // db?: string | number;
  // keyName?: string;
  //keyType?: string;
  //需要展示的数据

  //displayModel:DisplayModel;
  //标记数据是否加载完毕
  initFinish:boolean;
  //
  isAdd?:boolean;
  //开启保存按钮
  enableSave?: boolean;
  //开启刷新按钮
  enableRefresh?: boolean;
  //开启复制按钮
  enableCopy?: boolean;
  // onSave?: (content: string) => void;
  // onRefresh?: () => void;
  viewId: string;
  keyName?: string;
  //如果是编辑，会在第一次传入值的时候初始化，如果是新增，
  keyData?: string | Buffer;
  connect?: ConnectQuery;
  modelMethod?: ModelMethod;
  dataType: 'string' | 'buffer';
  bordered?: boolean;
}

export interface IDataEditorViewer extends IDataEditor {
  canSave: boolean;
  selectModel: DisplayModelType;

  onSelectModel?: (model: DisplayModelType) => void;
  onSave?: (content: string) => void;
  onRefresh?: () => void;
  onCopy?: (content: string) => void;
}
