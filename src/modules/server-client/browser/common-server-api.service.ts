import { Autowired, Injectable } from '@opensumi/di';
import { IDialogService } from '@opensumi/ide-overlay';
import {
  IKafkaService,
  IKafkaServiceToken,
  IQueryResult,
  IRedisService,
  IRedisServiceToken,
  ISqlServerApiToken,
  IZookeeperService,
  IZookeeperServiceToken,
  QueryResultError,
} from '../common';
import { QueryUtil } from '../../base/utils/query-util';
import { SqlServerApiService } from './sql-server-api.service';
import { ConnectQuery } from '../../local-store-db/common';
import { ServerClassNamespace } from '../../base/config/server.config';
import { EtcdService } from './services/etcd-service';
import { IEsService, IEsServiceToken } from '../common/types/es.types';
import SqlModeServer = ServerClassNamespace.SqlModeServer;

@Injectable()
export class CommonServerApiService {
  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IRedisServiceToken)
  private redisService: IRedisService;

  @Autowired(IZookeeperServiceToken)
  private zookeeperService: IZookeeperService;

  @Autowired(IKafkaServiceToken)
  private kafkaService: IKafkaService;

  @Autowired(EtcdService)
  private etcdService: EtcdService;

  @Autowired(IEsServiceToken)
  private esService: IEsService;

  @Autowired(ISqlServerApiToken)
  private sqlServerApiService: SqlServerApiService;


  async testConnect(connect: ConnectQuery): Promise<IQueryResult> {
    let result: IQueryResult = QueryResultError.UNREALIZED_ERROR;
    const serverType = connect.server.serverType;
    if (SqlModeServer.includes(serverType)) {
      result = await this.sqlServerApiService.ping(connect);
    } else {
      switch (serverType) {
        case 'Redis':
          result = await this.redisService.ping(connect);
          break;
        case 'Cassandra':
          break;
        case 'Elasticsearch':
          result = await this.esService.ping(connect);
          break;
        case 'Zookeeper':
          result = await this.zookeeperService.ping(connect);
          break;
        case 'Etcd':
          result = await this.etcdService.ping(connect);
          break;
        case 'Eureka':
          break;
        case 'Consul':
          break;
        case 'Hive':
          break;
        case 'Kafka':
          result = await this.kafkaService.ping(connect);
          break;

        case 'Mongodb':
          break;
        case 'Nacos':
          break;
      }
    }
    if (!result.success) {
      this.dialogService.error(QueryUtil.getErrorMessage(result), ['ok']);
    }
    return result;
  }
}
