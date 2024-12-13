
import { ServerInfo } from '../../../local-store-db/common';
import { IRunSqlResult } from './query-result.types';
import { RedisResultEnum } from '../fields/redis-fields';
import { RedisType } from '../../../base/types/common-fields.types';
import { SubNodeType } from '../../../base/types/server-node.types';

export interface ISqlQueryParam {
  isQuery: boolean;
  sql: string;
  values?: any[];
  //autoCommit?:boolean;
}



export interface ISqlQueryResult {
  data?: { [key: string]: any }[];
  isQuery?: boolean;
  affectedRows?: number;
  fields?: any[];
  total?: number;
}

//export type SqlQueryResult = ISqlExecResult | ISqlQueryResult[];

export interface IFieldInfo {
  catalog?: string;
  db?: string;
  schema?: string;
  table?: string;
  orgTable?: string;
  name?: string;
  orgName?: string;
  charsetNr?: number;
  length?: number;
  flags?: number;
  decimals?: number;
  default?: string;
  zeroFill?: boolean;
  protocol41?: boolean;
  type?: any;
}

export interface SimpleName {
  name: string;
}

export interface IConnectInfo {
  server: ServerInfo;
  db: string;
  schema?: string;
}

export interface IDbDetail {
  schema?: string;
  charset?: string;
}

export interface ITableInfo {
  tableName: string;
  //注释
  comment?: string;
  //主键约束
  constraint?: string;
  //编码
  charset?: string;
}

export  type DefaultSetType='SetNull' | 'SetEmpty' | 'SetValue' | ''

export interface IKeyResult<T = any> extends IRunSqlResult<T> {
  keyName?: string[];
  command: string;
  valueType?: RedisResultEnum;
}

export type KeyValueType = string | string[] | { key: string; value: string }[] |{[key: string]:any}[]| Buffer;


export interface IKeyInfo {
  name: string;
  type?: SubNodeType;
}

export interface IKeyPathInfo extends IKeyInfo{
  count?: number;
  isKey: boolean;
  fullPath?: string;
}

export interface IKeyInfoResult {
  keyType?: string;
  keyTtl?: number;
}

export interface SearchKeyParam {
  //db: number;
  count: number;
  match: string;
}
