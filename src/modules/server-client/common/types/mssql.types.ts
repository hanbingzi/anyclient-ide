import { IBaseSqlService, ISqlServiceClient } from '../index';

export const IMssqlServiceToken = Symbol('IMssqlServiceToken');

export interface IMssqlService extends IBaseSqlService {
}

export const IMssqlClientServicePath = 'IMssqlClientServicePath';

export const IMssqlClientService = Symbol('IMssqlClientService');

export interface IMssqlServiceClient extends ISqlServiceClient {
}




