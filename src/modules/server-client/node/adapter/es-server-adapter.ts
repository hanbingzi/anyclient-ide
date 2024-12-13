import { DefaultServerAdapter, queryCallback } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import axios, { AxiosRequestConfig } from 'axios';
import { IEsCommand } from '../../common/types/es.types';

export class EsServerAdapter extends DefaultServerAdapter {

  private connected: boolean;
  private readonly config: AxiosRequestConfig;
  private readonly esUrl: string;

  constructor(config: AxiosRequestConfig, esUrl: string) {
    super();
    this.config = config;
    this.esUrl = esUrl;
  }


  public static async createInstance(connect: ConnectQuery) {
    const { server, cluster } = connect;
    const { url, authType, token, user, password, connectTimeout } = server;
    let config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: connectTimeout || 2000,
      responseType: 'json',

    };
    if (authType == 'account' && user && password) {
      config.auth = {
        username: user,
        password: password,
      };
    } else if (authType == 'token' && token) {
      config.headers = {
        Authorization: token,
      };
    }

    return new EsServerAdapter(config, url);
  }


  // async runBatch(command: IEsCommand[], callback?: queryCallback) {
  //   let config = this.config;
  //   //const lineIndex = command.indexOf('\n');
  //   const [method,path, body] = command;
  //
  //   if (path?.charAt(0) !== '/') {
  //     path = '/' + path;
  //   }
  //   config.url = this.esUrl + path;
  //   config.method = method;
  //   config.data = body;
  //   console.log('run config:',config);
  //   await axios(config).then((response) => {
  //     // console.log('  success:', response.data);
  //     callback(null, response.data);
  //   }).catch((reason) => {
  //     //console.error('Error inserting document:', reason.response ? reason.response.data : reason.message);
  //     callback(reason);
  //   });
  // }

  async run(command: IEsCommand, callback?: queryCallback) {
    let config = this.config;
    const { type, path, body } = command;
    config.url = this.esUrl + (path?.charAt(0) !== '/' ? '/' : '') + path;
    config.method = type;
    config.data = body;
    await axios(config).then((response) => {
      //console.log(' success:', response.data);
      callback(null, response.data);
    }).catch((reason) => {
     const errorData =  reason.response ? reason.response.data : reason.message
      callback(reason,errorData);
    });

  }


  async connect(callback: (err: any) => void) {
    this.connected = true;
    callback(null);
  }

  async close() {
    this.connected = false;
  }

  async isAlive(): Promise<boolean> {
    return true;
  }
}
