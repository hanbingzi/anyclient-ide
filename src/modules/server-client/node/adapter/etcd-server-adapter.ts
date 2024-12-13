import { DefaultServerAdapter } from './server-adapter';
import { ConnectQuery } from '../../../local-store-db/common';
import { decryptData } from '../../../base/utils/crypto-util';
import { Etcd3, IOptions } from 'etcd3';
import { isEmpty } from '../../../base/utils/object-util';

export class EtcdServerAdapter extends DefaultServerAdapter {
  private connected: boolean;
  private client: Etcd3;

  private constructor(client: Etcd3) {
    super();
    this.client = client;
  }

  public static async createInstance(connect: ConnectQuery): Promise<EtcdServerAdapter> {
    const { server, db, schema, ssh, originPassword } = connect;
    const { host, port, user, password, connectTimeout } = server;
    const decodePassword = password ? (originPassword ? password : decryptData(password)) : '';
   let option:IOptions;
    if(isEmpty(user)){
      option = { hosts: `http://${host}:${port}` };
    }else{
      option = { hosts: `http://${host}:${port}`, auth: { username: user, password:decodePassword } };
    }
    const client = new Etcd3(option);
    const etcdConnection = new EtcdServerAdapter(client);
    return etcdConnection;
  }

  run(callback: (client: Etcd3) => void) {
    callback(this.client);
  }

  getClient() {
    return this.client;
  }

  ping(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const status = await this.client.maintenance.status();
        console.log('Successfully connected to etcd. Status:', status);
        resolve(true);
      } catch (error) {
        console.error('Failed to ping etcd:', error);
        resolve(false);
      } finally {
        this.close();
      }
    });
  }

  async connect(callback: (err: any) => void) {
    callback(null);
  }

  async close() {
    if (this.client !== null) {
      this.client.close();
    }
    this.connected = false;
  }

  async isAlive(): Promise<boolean> {
    return this.connected;
  }
}
