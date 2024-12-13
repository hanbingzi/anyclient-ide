import { DefaultServerAdapter } from './server-adapter';
import { Kafka } from 'kafkajs';
import { uuid } from '@opensumi/ide-utils';
import { ConnectQuery } from '../../../local-store-db/common';
import { AppConstants } from '../../../../common/constants';

export class KafkaServerAdapter extends DefaultServerAdapter {
  private connected: boolean;
  private client: Kafka;

  constructor(client: Kafka) {
    super();
    this.client = client;
  }

  public static async createInstance(connect: ConnectQuery) {
    const { server, cluster } = connect;
    const { host, port, clientId, groupId, connectionType,connectTimeout } = server;
    const useClientId = clientId ? clientId : `${AppConstants.AppName}-${uuid(10)}`;
    const brokers: string[] = [];
    //console.log(`host:${host};port:${port}`);
    //前端验证，保证cluster是，cluster必须有数据，
    if (connectionType === 'Cluster') {
      if (!cluster) {
        throw new Error('Kafka cluster is not config--->.');
      }
      for (let item of cluster) {
        brokers.push(`${item.host}:${item.port}`);
      }
    } else {
      brokers.push(`${host}:${port}`);
    }
    const kafka = new Kafka({
      clientId: useClientId,
      brokers,
      connectionTimeout:connectTimeout||5000
    });
    const kafkaConnection = new KafkaServerAdapter(kafka);
    return kafkaConnection;
  }

  getClient() {
    return this.client;
  }

  async connect(callback: (err: any) => void) {
    this.connected = true;
    callback(null);
  }

  async close() {
    this.connected = false;
  }

  async isAlive(): Promise<boolean> {
    return this.connected;
  }
}
