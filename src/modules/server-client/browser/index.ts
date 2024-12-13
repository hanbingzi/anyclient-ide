import { Injectable, Provider } from '@opensumi/di';
import { BrowserModule } from '@opensumi/ide-core-browser';
import {
  ICommonServerApiToken,
  IDMClientServicePath,
  IDMServiceToken,
  IJdbcServiceClientPath,
  IKafkaClientServicePath,
  IKafkaServiceToken,
  IMssqlClientServicePath,
  IMssqlServiceToken,
  IMysqlClientServicePath,
  IMysqlServiceToken,
  IOracleClientServicePath,
  IOracleServiceToken,
  IPostgresClientServicePath,
  IPostgresServiceToken,
  IRedisClientServicePath,
  IRedisServiceToken,
  IRegisterServerApiToken,
  ISqlServerApiToken,
  IZookeeperClientServicePath,
  IZookeeperServiceToken,
} from '../common';
import { RedisService } from './services/redis-service';
import { MysqlService } from './services/mysql-service';
import { RegisterServerApiService } from './register-server-api.service';
import { SqlServerApiService } from './sql-server-api.service';
import { PostgresService } from './services/postgres-service';
import { CommonServerApiService } from './common-server-api.service';
import { ZookeeperService } from './services/zookeeper-service';
import { KafkaService } from './services/kafka-service';
import { OracleService } from './services/oracle-service';
import { MssqlService } from './services/mssql-service';
import { DMService } from './services/dm-service';
import { EtcdService } from './services/etcd-service';
import { IEtcdClientServicePath } from '../common/types/etcd.types';
import { IEsClientServicePath, IEsServiceToken } from '../common/types/es.types';
import { EsService } from './services/es-service';

@Injectable()
export class ServerClientModule extends BrowserModule {
  providers: Provider[] = [
    {
      token: ICommonServerApiToken,
      useClass: CommonServerApiService,
    },
    {
      token: IRegisterServerApiToken,
      useClass: RegisterServerApiService,
    },
    {
      token: ISqlServerApiToken,
      useClass: SqlServerApiService,
    },
    {
      token: IMysqlServiceToken,
      useClass: MysqlService,
    },
    {
      token: IPostgresServiceToken,
      useClass: PostgresService,
    },
    {
      token: IOracleServiceToken,
      useClass: OracleService,
    },
    {
      token: IMssqlServiceToken,
      useClass: MssqlService,
    },
    {
      token: IDMServiceToken,
      useClass: DMService,
    },
    {
      token: IRedisServiceToken,
      useClass: RedisService,
    },
    {
      token: IZookeeperServiceToken,
      useClass: ZookeeperService,
    },
    {
      token: IKafkaServiceToken,
      useClass: KafkaService,
    },
    {
      token: IEsServiceToken,
      useClass: EsService,
    },
    EtcdService,
    // {
    //   token: IKafkaServiceRPCToken,
    //   useClass: KafkaRPCService,
    // },
  ];
  backServices = [
    {
      servicePath: IJdbcServiceClientPath,
    },
    {
      servicePath: IMysqlClientServicePath,
    },
    {
      servicePath: IRedisClientServicePath,
    },
    {
      servicePath: IPostgresClientServicePath,
    },
    {
      servicePath: IMssqlClientServicePath,
    },
    {
      servicePath: IOracleClientServicePath,
    },
    {
      servicePath: IDMClientServicePath,
    },
    {
      servicePath: IZookeeperClientServicePath,
    },
    {
      servicePath: IEtcdClientServicePath,
    },
    {
      servicePath: IKafkaClientServicePath,
      clientToken: IKafkaServiceToken,
    },
    {
      servicePath: IEsClientServicePath,
    },
    // {
    //   servicePath: IKafkaClientRPCPath,
    //   clientToken: IKafkaServiceRPCToken // 关联前端服务
    // },
  ];
}
