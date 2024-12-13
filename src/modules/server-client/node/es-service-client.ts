import { AbstractBaseClient } from './base-client';
import { Injectable } from '@opensumi/di';
import { ConnectQuery } from '../../local-store-db/common';
import { IQueryResult, IRunSqlResult } from '../common';
import { IEsCommand, IEsServiceClient } from '../common/types/es.types';
import { EsServerAdapter } from './adapter/es-server-adapter';

@Injectable()
export class EsServiceClient extends AbstractBaseClient implements IEsServiceClient {


  public getErrorResult(error: any): IQueryResult {
    console.log('error----->', error);
    const message = error.response ? error.response.data : error.message;
    return { success: false, message: JSON.stringify(message), code: error.errno }; //sql: error.sql,
  }

  public async runCommand(connectQuery: ConnectQuery, command: IEsCommand): Promise<IQueryResult> {
    const connect = await this.getConnection(connectQuery) as EsServerAdapter;
    console.log('command--->', JSON.stringify(command));
    return new Promise((resolve, reject) => {
      const executeTime = new Date().getTime();
      connect.run(command, (err, data) => {
          const costTime = new Date().getTime() - executeTime;
          console.log('search result--->', JSON.stringify(data));
          if (err) {
            const errResult = this.getErrorResult(err);
            resolve({ ...errResult, costTime, data });
          }
          resolve({ success: true, data, costTime });
        },
      );
    });

  }

  public async runBatch(connectQuery: ConnectQuery, command: IEsCommand[]): Promise<IRunSqlResult> {
    // const connect = await this.getConnection(connectQuery) as EsServerAdapter;
    // const esCommand:IEsCommand = {type:command[0],path:command[1],body:(command.length>2?command[2]:null)}
    // return new Promise((resolve, reject) => {
    //   const executeTime = new Date().getTime();
    //   connect.run(esCommand, (err, results) => {
    //       const costTime = new Date().getTime() - executeTime;
    //       const runResult: IRunSqlResult = { success: false, costTime, sql: command.join('\n') };
    //       if (err) {
    //         const errorResult = this.getErrorResult(err);
    //         resolve({ ...runResult, ...errorResult, data: errorResult.message });
    //       } else {
    //         resolve({ ...runResult, success: true, data: results });
    //       }
    //     },
    //   );
    // });
    return null;
  }

  // public async runBatch(connectQuery: ConnectQuery, batchCommand: string):Promise<IRunSqlResult> {
  //   const connect = await this.getConnection(connectQuery) as EsServerAdapter;
  //   return new Promise((resolve, reject) => {
  //     connect.run(command, (err, results) => {
  //         if (err) {
  //           resolve(this.getErrorResult(err));
  //         }
  //         resolve({ success: true, data: results });
  //       },
  //     );
  //   });
  // }


}
