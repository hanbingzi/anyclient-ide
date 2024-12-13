import { ConnectQuery } from '../../../local-store-db/common';
import { IEsPageDataResult, IQueryResult, IRunSqlResult } from './query-result.types';
import { HttpMethod } from '../../../base/types/http.types';
import { IPage } from '../../../components/pagination';
import { EsColumnEnum } from '../fields/es-fields';
import { IWhereParam } from '../../../base/model/sql-param.model';

export const IEsServiceToken = Symbol('IEsServiceToken');

export const IEsClientServicePath = 'IEsClientServicePath';

export interface IEsCommand {
  type: HttpMethod|string;
  path: string;
  body?: any;
}

export interface IEsColumn {
  name: string;
  type: EsColumnEnum;
}

export interface IEsService {

  ping(connect: ConnectQuery): Promise<IQueryResult>;

  run(connectQuery: ConnectQuery, command: string[]): Promise<IRunSqlResult>;

  clusterHealth(connectQuery: ConnectQuery): Promise<IQueryResult>;

  showIndexList(connectQuery: ConnectQuery): Promise<IQueryResult>;

  getIndexDataByPage(connectQuery: ConnectQuery, index: string,wheres:IWhereParam[], page: IPage): Promise<IEsPageDataResult>;

  mapping(connectQuery: ConnectQuery, index: string): Promise<IQueryResult>;

  mappingToColumn(connectQuery: ConnectQuery, index: string): Promise<IQueryResult<IEsColumn[]>>;

  delete(connectQuery: ConnectQuery, index: string, id: string): Promise<IQueryResult>;

  add(connectQuery: ConnectQuery, index: string, data: Object): Promise<IQueryResult<any>> ;

  update(connectQuery: ConnectQuery, index: string, id:string,data: Object): Promise<IQueryResult<any>> ;
}

export interface IEsServiceClient {

  runCommand(connectQuery: ConnectQuery, command: IEsCommand): Promise<IQueryResult<any>>;

  /**
   *
   * @param connectQuery
   * @param command  : [path,body]
   */
  runBatch(connectQuery: ConnectQuery, command: IEsCommand[]): Promise<IQueryResult>;

}
