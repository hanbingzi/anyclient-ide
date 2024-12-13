import { Injectable, Provider } from '@opensumi/di';
import { BrowserModule, ModuleDependencies } from '@opensumi/ide-core-browser';
import { WorkspaceModule } from '@opensumi/ide-workspace/lib/browser';
import {
  IConnectTreeAPIToken,
  IConnectTreeServiceToken,
  IOpenRecentStatServiceToken,
  IServerTreeApiServiceToken,
} from '../common';
import { ConnectTreeContribution } from './connect-tree.contribution';
import { ConnectTreeService } from './connect-tree.service';
import { ConnectTreeAPI } from './services/connect-tree-api.service';
import { ConnectTreeDecorationService } from './services/connect-tree-decoration.service';
import { ConnectTreeModelService } from './services/connect-tree-model.service';
import { OpenRecentStatService } from './services/open-recent-stat.service';
import { ServerTreeApiService } from './services/server-tree-api.service';
import { SqlTreeApiService } from './services/server/sql-tree-api.service';
import { KafkaTreeApiService } from './services/server/kafka-tree-api.service';
import { RedisTreeApiService } from './services/server/redis-tree-api.service';
import { ZookeeperTreeApiService } from './services/server/zookeeper-tree-api.service';
import { EtcdServerApiService } from './services/server/etcd-server-api.service';
import { EsServerApiService } from './services/server/es-server-api.service';

@ModuleDependencies([WorkspaceModule])
@Injectable()
export class ServerOpenRecentModule extends BrowserModule {
  providers: Provider[] = [
    {
      token: IConnectTreeAPIToken,
      useClass: ConnectTreeAPI,
    },
    {
      token: ConnectTreeDecorationService,
      useClass: ConnectTreeDecorationService,
    },
    {
      token: IConnectTreeServiceToken,
      useClass: ConnectTreeService,
    },
    {
      token: ConnectTreeModelService,
      useClass: ConnectTreeModelService,
    },
    {
      token: IOpenRecentStatServiceToken,
      useClass: OpenRecentStatService,
    },
    {
      token: IServerTreeApiServiceToken,
      useClass: ServerTreeApiService,
    },
    ConnectTreeContribution,
    SqlTreeApiService,
    EtcdServerApiService,
    KafkaTreeApiService,
    RedisTreeApiService,
    ZookeeperTreeApiService,
    EsServerApiService
  ];
}
