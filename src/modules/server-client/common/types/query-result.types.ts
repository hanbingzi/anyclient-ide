import { IColumnMeta } from './sql-meta.types';

export interface IQueryResult<T = any> {
  success: boolean;
  //错误编码
  code?: number | string;
  //1.成功时，需要展示的信息
  //2.不成功的时候，错误的信息
  message?: string;
  //耗费的时间
  costTime?: number;
  //暂时未解析的错误信息
  error?: any;
  data?: T;
}

export interface IRunSqlResult<T = any, S = any> extends IQueryResult<T> {
  //执行的sql
  sql?: string;
  affectedRows?: number;
  isUpdate?: boolean;
  isQuery?: boolean;
  //sql查询的表格结构
  fields?: S[];
  //此处的列是从fields转换过来的，
  columns?: IColumnMeta[];
}

export interface ITableDataResult<T = any> extends IRunSqlResult<T> {
  total?: number;
  primaryKey?: string;
  // columnList?: IColumnMeta[];
  primaryKeyList?: string[];
  database?: string;
  table?: string | null;
  pageSize?: number;
}

/**
 * Elastic Search Response
 */

export interface IEsPageDataResult extends IQueryResult {
  total?: number;
  pageSize?: number;
  data?: any;
}
export interface IEsRunResult extends IRunSqlResult<string>{
  command?:string;
}

export namespace QueryResultError {
  // 未知错误
  export const UNKNOWN_ERROR: IQueryResult = {
    success: false,
    code: -1,
    message: '未知错误',
  };

  // 未实现错误
  export const UNREALIZED_ERROR: IQueryResult = {
    success: false,
    code: -1,
    message: '该服务功能还未实现，暂时无法使用',
  };

  // 未实现错误
  export const SQL_ERROR: IQueryResult = {
    success: false,
    code: -1,
    message: 'sql语句不能为空',
  };
}
