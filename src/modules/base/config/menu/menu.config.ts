import { Command } from '@opensumi/ide-core-common';
import { AllNodeType, ServerType } from '../../types/server-node.types';
import { SQL_COMMANDS } from './sql.menu';
import { ZOOKEEPER_COMMANDS } from './zookeeper.menu';
import { KAFKA_COMMANDS } from './kafka.menu';
import { REDIS_COMMANDS } from './redis.menu';
import { ServerClassNamespace } from '../server.config';
import { ETCD_COMMANDS } from './etcd.menu';
import SqlModeServer = ServerClassNamespace.SqlModeServer;
import { ELASTICSEARCH_COMMANDS } from './es.menu';

export enum ServerListIds {
  explorerServer = 'explorer/server', // 服务列表
  ServerExplorerContext = 'serverExplorer/context',
  ServerExplorerServer = 'serverExplorer/server',
}

/**
 * 定义的菜单分类
 */
export enum ServerMenuIds {
  NoUse = 'noUse',
  // 最近打开列表菜单
  ServerExplorerSqlServer = 'serverExplorer/sqlServer',
  ServerExplorerRedisServer = 'serverExplorer/redisServer',
  ServerExplorerZkServer = 'serverExplorer/zkServer',
  ServerExplorerKafkaServer = 'serverExplorer/kafkaServer',
  ServerExplorerEtcdServer = 'serverExplorer/EtcdServer',
  ServerExplorerEsServer = 'serverExplorer/EsServer',

  ServerExplorerDb = 'serverExplorer/db',
  ServerExplorerPostgresDb = 'serverExplorer/postgresDb',
  ServerExplorerOrclDb = 'serverExplorer/orclDb',
  ServerExplorerSchema = 'serverExplorer/schema',
  ServerExplorerTables = 'serverExplorer/tables',
  ServerExplorerTable = 'serverExplorer/table',
  ServerExplorerSequences = 'serverExplorer/sequences',
  ServerExplorerSequence = 'serverExplorer/sequence',
  ServerExplorerTableViews = 'serverExplorer/tableViews',
  ServerExplorerTableView = 'serverExplorer/tableView',
  ServerExplorerFunctions = 'serverExplorer/functions',
  ServerExplorerFunction = 'serverExplorer/function',
  ServerExplorerColumn = 'serverExplorer/column',
  ServerExplorerColumns = 'serverExplorer/columns',
  ServerExplorerProcedure = 'serverExplorer/procedure',
  ServerExplorerProcedures = 'serverExplorer/procedures',
  ServerExplorerTrigger = 'serverExplorer/trigger',
  ServerExplorerTriggers = 'serverExplorer/triggers',

  ServerExplorerBasicDb = 'serverExplorer/basicDb',
  ServerExplorerBasicSchema = 'serverExplorer/basicSchema',
  ServerExplorerBasicTables = 'serverExplorer/basicTables',
  ServerExplorerBasicTable = 'serverExplorer/basicTable',
  ServerExplorerBasicSequences = 'serverExplorer/basicSequences',
  ServerExplorerBasicSequence = 'serverExplorer/basicSequence',
  ServerExplorerBasicTableViews = 'serverExplorer/basicTableViews',
  ServerExplorerBasicTableView = 'serverExplorer/basicTableView',
  ServerExplorerBasicFunctions = 'serverExplorer/basicFunctions',
  ServerExplorerBasicFunction = 'serverExplorer/basicFunction',
  ServerExplorerBasicProcedure = 'serverExplorer/basicProcedure',
  ServerExplorerBasicProcedures = 'serverExplorer/basicProcedures',

  ServerExplorerRedisDb = 'serverExplorer/redisDb',
  ServerExplorerRedisNode = 'serverExplorer/redisNode',
  ServerExplorerRedisStringKey = 'serverExplorer/redisStringKey',
  ServerExplorerRedisHashKey = 'serverExplorer/redisHashKey',
  ServerExplorerRedisListKey = 'serverExplorer/redisListKey',
  ServerExplorerRedisSetKey = 'serverExplorer/redisSetKey',
  ServerExplorerRedisZSetKey = 'serverExplorer/redisZSetKey',

  // ServerExplorer = 'serverExplorer/',
  ServerExplorerTopics = 'serverExplorer/topics',
  ServerExplorerTopic = 'serverExplorer/topic',
  ServerExplorerBrokers = 'serverExplorer/brokers',
  ServerExplorerGroups = 'serverExplorer/groups',

  ServerExplorerZKNode = 'serverExplorer/zkNode',

  ServerExplorerEtcdData = 'serverExplorer/etcdData',
  ServerExplorerEtcdDic = 'serverExplorer/etcdDic',
  ServerExplorerEtcdKey = 'serverExplorer/etcdKey',
  ServerExplorerEtcdAuth = 'serverExplorer/etcdAuth',
  ServerExplorerEtcdCluster = 'serverExplorer/etcdCluster',
  ServerExplorerEtcdUsers = 'serverExplorer/etcdUsers',
  ServerExplorerEtcdRoles = 'serverExplorer/etcdRoles',


}

export type INodeMenu = {
  [key in AllNodeType]?: ServerMenuIds;
};

export type IServerMenu = {
  [key in ServerType]?: INodeMenu;
};

/**
 * 节点类型和弹出菜单对应关系
 */
export const ServerNodeMenuIdRule: IServerMenu = {
  CommonSql: {
    server: ServerMenuIds.ServerExplorerSqlServer,
    db: ServerMenuIds.ServerExplorerDb,

    schema: ServerMenuIds.ServerExplorerSchema,
    tables: ServerMenuIds.ServerExplorerTables,
    table: ServerMenuIds.ServerExplorerTable,
    views: ServerMenuIds.ServerExplorerTableViews,
    view: ServerMenuIds.ServerExplorerTableView,
    sequences: ServerMenuIds.ServerExplorerSequences,
    sequence: ServerMenuIds.ServerExplorerSequence,
    functions: ServerMenuIds.ServerExplorerFunctions,
    function: ServerMenuIds.ServerExplorerFunction,
    column: ServerMenuIds.ServerExplorerColumn,
    columns: ServerMenuIds.ServerExplorerColumns,
    procedure: ServerMenuIds.ServerExplorerProcedure,
    procedures: ServerMenuIds.ServerExplorerProcedures,
    trigger: ServerMenuIds.ServerExplorerTrigger,
    triggers: ServerMenuIds.ServerExplorerTriggers,

    basicDb: ServerMenuIds.ServerExplorerBasicDb,
    basicSchema: ServerMenuIds.ServerExplorerBasicSchema,
    basicTables: ServerMenuIds.ServerExplorerBasicTables,
    basicTable: ServerMenuIds.ServerExplorerBasicTable,
    basicViews: ServerMenuIds.ServerExplorerBasicTableViews,
    basicView: ServerMenuIds.ServerExplorerBasicTableView,
    basicSequences: ServerMenuIds.ServerExplorerBasicSequences,
    basicSequence: ServerMenuIds.ServerExplorerBasicSequence,
    basicFunctions: ServerMenuIds.ServerExplorerBasicFunctions,
    basicFunction: ServerMenuIds.ServerExplorerBasicFunction,
    basicProcedure: ServerMenuIds.ServerExplorerBasicProcedure,
    basicProcedures: ServerMenuIds.ServerExplorerBasicProcedures,
  },
  Postgresql: { db: ServerMenuIds.ServerExplorerPostgresDb },
  Oracle: { orclDb: ServerMenuIds.ServerExplorerOrclDb },
  Redis: {
    server: ServerMenuIds.ServerExplorerRedisServer,
    redisDb: ServerMenuIds.ServerExplorerRedisDb,
    redisFolder: ServerMenuIds.ServerExplorerRedisNode,
    redisString: ServerMenuIds.ServerExplorerRedisStringKey,
    redisHash: ServerMenuIds.ServerExplorerRedisHashKey,
    redisList: ServerMenuIds.ServerExplorerRedisListKey,
    redisSet: ServerMenuIds.ServerExplorerRedisSetKey,
    redisZSet: ServerMenuIds.ServerExplorerRedisZSetKey,
  },
  Zookeeper: {
    server: ServerMenuIds.ServerExplorerZkServer,
    zkNode: ServerMenuIds.ServerExplorerZKNode,
  },
  Kafka: {
    server: ServerMenuIds.ServerExplorerKafkaServer,
    group: ServerMenuIds.NoUse,
    groups: ServerMenuIds.ServerExplorerGroups,
    kafkaBroker: ServerMenuIds.NoUse,
    kafkaBrokers: ServerMenuIds.ServerExplorerBrokers,
    topic: ServerMenuIds.ServerExplorerTopic,
    topics: ServerMenuIds.ServerExplorerTopics,
  },
  Etcd: {
    server: ServerMenuIds.ServerExplorerEtcdServer,
    data: ServerMenuIds.ServerExplorerEtcdData,
    dic: ServerMenuIds.ServerExplorerEtcdDic,
    key: ServerMenuIds.ServerExplorerEtcdKey,
    cluster: ServerMenuIds.ServerExplorerEtcdCluster,
    auth: ServerMenuIds.ServerExplorerEtcdAuth,
    users: ServerMenuIds.ServerExplorerEtcdUsers,
    roles: ServerMenuIds.ServerExplorerEtcdRoles,
  },
  Elasticsearch:{
    server:ServerMenuIds.ServerExplorerEsServer
  }
};

export const MenuIdCommandRule: { [key in ServerMenuIds]?: Command[][] } = {
  [ServerMenuIds.ServerExplorerSqlServer]: SQL_COMMANDS.sqlServer,
  [ServerMenuIds.ServerExplorerRedisServer]: REDIS_COMMANDS.redisServer,
  [ServerMenuIds.ServerExplorerZkServer]: ZOOKEEPER_COMMANDS.zkServer,
  [ServerMenuIds.ServerExplorerKafkaServer]: KAFKA_COMMANDS.kafkaServer,

  [ServerMenuIds.ServerExplorerDb]: SQL_COMMANDS.db,
  [ServerMenuIds.ServerExplorerPostgresDb]: SQL_COMMANDS.PostgresDb,
  [ServerMenuIds.ServerExplorerOrclDb]: SQL_COMMANDS.orclDb,
  [ServerMenuIds.ServerExplorerSchema]: SQL_COMMANDS.schema,
  [ServerMenuIds.ServerExplorerTables]: SQL_COMMANDS.tables,
  [ServerMenuIds.ServerExplorerTable]: SQL_COMMANDS.table,
  [ServerMenuIds.ServerExplorerTableViews]: SQL_COMMANDS.tableViews,
  [ServerMenuIds.ServerExplorerTableView]: SQL_COMMANDS.tableView,

  [ServerMenuIds.ServerExplorerFunctions]: SQL_COMMANDS.functions,
  [ServerMenuIds.ServerExplorerFunction]: SQL_COMMANDS._function,
  [ServerMenuIds.ServerExplorerColumns]: [],
  [ServerMenuIds.ServerExplorerColumn]: [],

  [ServerMenuIds.ServerExplorerProcedures]: SQL_COMMANDS.procedures,
  [ServerMenuIds.ServerExplorerProcedure]: SQL_COMMANDS.procedure,
  [ServerMenuIds.ServerExplorerTriggers]: SQL_COMMANDS.triggers,
  [ServerMenuIds.ServerExplorerTrigger]: SQL_COMMANDS.trigger,
  [ServerMenuIds.ServerExplorerSequences]: SQL_COMMANDS.sequences,
  [ServerMenuIds.ServerExplorerSequence]: SQL_COMMANDS.sequence,

  [ServerMenuIds.ServerExplorerBasicDb]: SQL_COMMANDS.basicDb,
  [ServerMenuIds.ServerExplorerBasicSchema]: SQL_COMMANDS.basicSchema,
  [ServerMenuIds.ServerExplorerBasicTables]: SQL_COMMANDS.basicTables,
  [ServerMenuIds.ServerExplorerBasicTable]: SQL_COMMANDS.basicTable,
  [ServerMenuIds.ServerExplorerBasicTableViews]: SQL_COMMANDS.basicTableViews,
  [ServerMenuIds.ServerExplorerBasicTableView]: SQL_COMMANDS.basicTableView,
  [ServerMenuIds.ServerExplorerBasicFunctions]: SQL_COMMANDS.basicFunctions,
  [ServerMenuIds.ServerExplorerBasicFunction]: SQL_COMMANDS.basicFunction,
  [ServerMenuIds.ServerExplorerBasicProcedures]: SQL_COMMANDS.basicProcedures,
  [ServerMenuIds.ServerExplorerBasicProcedure]: SQL_COMMANDS.basicProcedure,
  [ServerMenuIds.ServerExplorerBasicSequences]: [],
  [ServerMenuIds.ServerExplorerBasicSequence]: [],

  [ServerMenuIds.ServerExplorerRedisDb]: REDIS_COMMANDS.redisDb,
  [ServerMenuIds.ServerExplorerRedisNode]: REDIS_COMMANDS.redisNode,

  [ServerMenuIds.ServerExplorerRedisStringKey]: REDIS_COMMANDS.redisStr,
  [ServerMenuIds.ServerExplorerRedisListKey]: REDIS_COMMANDS.redisList,
  [ServerMenuIds.ServerExplorerRedisHashKey]: REDIS_COMMANDS.redisHash,
  [ServerMenuIds.ServerExplorerRedisSetKey]: REDIS_COMMANDS.redisSet,
  [ServerMenuIds.ServerExplorerRedisZSetKey]: REDIS_COMMANDS.redisZSet,

  [ServerMenuIds.ServerExplorerZKNode]: ZOOKEEPER_COMMANDS.zkNode,

  [ServerMenuIds.ServerExplorerTopics]: KAFKA_COMMANDS.topics,
  [ServerMenuIds.ServerExplorerTopic]: KAFKA_COMMANDS.topics,
  [ServerMenuIds.ServerExplorerBrokers]: KAFKA_COMMANDS.brokers,
  [ServerMenuIds.ServerExplorerGroups]: KAFKA_COMMANDS.groups,

  [ServerMenuIds.ServerExplorerEtcdServer]: ETCD_COMMANDS.etcdServer,
  [ServerMenuIds.ServerExplorerEtcdData]: ETCD_COMMANDS.Data,
  [ServerMenuIds.ServerExplorerEtcdDic]: ETCD_COMMANDS.Dic,
  [ServerMenuIds.ServerExplorerEtcdKey]: ETCD_COMMANDS.Key,
  [ServerMenuIds.ServerExplorerEtcdCluster]: ETCD_COMMANDS.Cluster,
  [ServerMenuIds.ServerExplorerEtcdAuth]: ETCD_COMMANDS.Auth,
  [ServerMenuIds.ServerExplorerEtcdUsers]: ETCD_COMMANDS.Users,
  [ServerMenuIds.ServerExplorerEtcdRoles]: ETCD_COMMANDS.Roles,

  [ServerMenuIds.ServerExplorerEsServer]: ELASTICSEARCH_COMMANDS.esServer
};

/**
 *
 * @param server
 * @param nodeType
 * @constructor
 * connect-tree.contribution处注册
 */
export const GetNodeMenu = (server: ServerType, nodeType: AllNodeType): ServerMenuIds => {
  //特殊处理的菜单
  const serverMenu = ServerNodeMenuIdRule[server];
  if (serverMenu) {
    const nodeMenu = serverMenu[nodeType];
    if (nodeMenu) {
      return nodeMenu;
    }
  }
  if (SqlModeServer.includes(server)) {
    const sqlMenu: INodeMenu = ServerNodeMenuIdRule['CommonSql'];
    const nodeMenu = sqlMenu[nodeType];
    if (nodeMenu) {
      return nodeMenu;
    }
  }
  //console.log(`server:${server}-${nodeType}not set menu`);
  return ServerMenuIds.NoUse;
};
