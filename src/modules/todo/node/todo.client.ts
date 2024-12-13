import { Injectable } from '@opensumi/di';
//import * as mysql from "mysql2";
//import mysql from "mysql2";
import { ITodoServiceClient } from '../common';
//import os from "os";

@Injectable()
export class TodoClient implements ITodoServiceClient {
  public async test() {
    // console.log(os.homedir())
    console.log('============================test====================================');
  }
  public async query(): Promise<void> {
    console.log('进入了---------------------');
    //   let connection = mysql.createConnection({
    //     host: 'localhost',
    //     user: 'root',
    //     port: 3306,
    //     password: '',
    //     //  database: 'test'
    //   });
    //   let result = await new Promise<void>((resolve, reject) => {
    //     connection.connect(err => {
    //       if (err) {
    //         reject(err)
    //       }
    //       resolve()
    //     })
    //   }).then(() => {
    //     connection.query('show databases', (error, result, fileds) => {
    //       if (error) {
    //         throw error
    //       }
    //       console.log('------------------>mysql:result:', result);
    //       return result;
    //     })
    //   }).catch((reason) => {
    //     console.log('reason:', reason)
    //     return reason;
    //   }).finally(() => {
    //     connection.end()
    //   })
    //   return result;
  }
}
