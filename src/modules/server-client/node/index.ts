import { Injectable, Provider } from '@opensumi/di';
import { NodeModule } from '@opensumi/ide-core-node';
import {
  IDMClientService,
  IDMClientServicePath,
  IJdbcServiceClientPath,
  IJdbcServiceClientToken,
  IKafkaClientService,
  IKafkaClientServicePath,
  IMssqlClientService,
  IMssqlClientServicePath,
  IMysqlClientService,
  IMysqlClientServicePath,
  IOracleClientService,
  IOracleClientServicePath,
  IPostgresClientService,
  IPostgresClientServicePath,
  IRedisClientService,
  IRedisClientServicePath,
  IZookeeperClientService,
  IZookeeperClientServicePath,
} from '../common';
import { MysqlServiceClient } from './mysql-service-client';
import { RedisServiceClient } from './redis-service-client';
import { PostgresServiceClient } from './postgres-service-client';
import { ZookeeperServiceClient } from './zookeeper-service-client';
import { KafkaServiceClient } from './kafka-service-client';
import { OracleServiceClient } from './oracle-service-client';
import { MssqlServiceClient } from './mssql-service-client';
import { DMServiceClient } from './dm-service-client';
import { JdbcServiceClient } from './jdbc-service-client';
import { JavaHttpRequest } from './java-http-request';
import { IEtcdClientServicePath, IEtcdServiceToken } from '../common/types/etcd.types';
import { EtcdServiceClient } from './etcd-service-client';
import { IEsClientServicePath, IEsServiceToken } from '../common/types/es.types';
import { EsServiceClient } from './es-service-client';

@Injectable()
export class ServerClientNodeModule extends NodeModule {
  providers: Provider[] = [
    {
      token: IJdbcServiceClientToken,
      useClass: JdbcServiceClient,
    },
    {
      token: JavaHttpRequest,
      useClass: JavaHttpRequest,
    },
    {
      token: IMysqlClientService,
      useClass: MysqlServiceClient,
    },
    {
      token: IRedisClientService,
      useClass: RedisServiceClient,
    },
    {
      token: IPostgresClientService,
      useClass: PostgresServiceClient,
    },
    {
      token: IOracleClientService,
      useClass: OracleServiceClient,
    },
    {
      token: IMssqlClientService,
      useClass: MssqlServiceClient,
    },
    {
      token: IDMClientService,
      useClass: DMServiceClient,
    },
    {
      token: IZookeeperClientService,
      useClass: ZookeeperServiceClient,
    },
    {
      token: IKafkaClientService,
      useClass: KafkaServiceClient,
    },
    {
      token: IEtcdServiceToken,
      useClass: EtcdServiceClient,
    },
    {
      token: IEsServiceToken,
      useClass: EsServiceClient,
    },
    // {
    //   token: IKafkaClientRPC,
    //   useClass: KafkaRpcClient,
    // },
  ];

  backServices = [
    {
      servicePath: IJdbcServiceClientPath,
      token: IJdbcServiceClientToken,
    },
    {
      servicePath: IMysqlClientServicePath,
      token: IMysqlClientService,
    },
    {
      servicePath: IRedisClientServicePath,
      token: IRedisClientService,
    },
    {
      servicePath: IPostgresClientServicePath,
      token: IPostgresClientService,
    },
    {
      servicePath: IOracleClientServicePath,
      token: IOracleClientService,
    },
    {
      servicePath: IPostgresClientServicePath,
      token: IPostgresClientService,
    },
    {
      servicePath: IMssqlClientServicePath,
      token: IMssqlClientService,
    },
    {
      servicePath: IDMClientServicePath,
      token: IDMClientService,
    },
    {
      servicePath: IZookeeperClientServicePath,
      token: IZookeeperClientService,
    },
    {
      servicePath: IKafkaClientServicePath,
      token: IKafkaClientService,
    },
    {
      servicePath: IEtcdClientServicePath,
      token: IEtcdServiceToken,
    },
    {
      servicePath: IEsClientServicePath,
      token: IEsServiceToken,
    },
    // {
    //   servicePath: IKafkaClientRPCPath,
    //   token: IKafkaClientRPC,
    // },
  ];
}
