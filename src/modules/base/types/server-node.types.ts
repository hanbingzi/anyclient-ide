export type SqlServerType =
  | 'CommonSql'
  | 'Mariadb'
  | 'Mysql'
  | 'Sqlite'
  | 'SQLServer'
  | 'Oracle'
  | 'Postgresql'
  | 'DM'
  | 'Cassandra'
  | 'Snowflake'
  | 'DB2'
  | 'RDJC'
  | 'H2'
  | 'Hive'
  | 'FileMaker'
  | 'Teradata'
  | 'SAP_HANA'
  | 'Firebird'
  | 'Spark_SQL'
  | 'Redshift'
  | 'Informix'
  | 'ClickHouse'
  | 'Impala'
  | 'Flink'
  | 'Presto'
  | 'Vertica'
  | 'Greenplum'
  | 'Derby'
  | 'Trino'
  | 'DuckDB';
export type NewSqlServerType = 'OceanBase' | 'TiDB';

export type TimeSeries = 'Influxdb' | 'TDEngine' | 'Prometheus';

export type OtherType = 'HBase' | 'Neo4j' | 'Couchbase';
export type ServerType = //按照常用顺序排序

  | SqlServerType
  | NewSqlServerType
  | 'Redis'
  | 'Kafka'
  | 'Elasticsearch'
  | 'Mongodb'
  | TimeSeries
  | 'Consul'
  | 'Etcd'
  | 'Eureka'
  | 'Nacos'
  | 'Neo4j'
  | 'Mosquitto'
  | 'Rocketmq'
  | 'Rabbitmq'
  | 'Zookeeper'
  | 'Emqx'
  | OtherType;

export type ServerClass =
  | 'Relational'
  | 'KeyValue'
  | 'RelationalNewSql'
  | 'Register'
  | 'MQ'
  | 'TimeSeries'
  | 'SearchEngine'
  | 'Document'
  | 'WideColumn'
  | 'Other';

export const ClusterType: string[] = ['Cluster'];
export type CommonConnectionType = 'Standalone' | 'Cluster';
//export type KafkaConnectionType = 'Standalone'|'Cluster'
export type AllConnectionType = CommonConnectionType | 'Sentinel' | '';

export type AuthType = 'noAuth' | 'account' | 'token';

// 服务的脚本文件后缀
export type FileSuffixType = 'sql' | 'json' | 'es' | 'redis';
// 跟FileSuffixType保持一致,用于判断是否是FileSuffixType的文件类型的一类
export const FileSuffixArray = ['sql', 'json', 'es', 'redis'];

export type SqlNodeType =
  | 'db'
  | 'orclDb'
  | 'schema'
  | 'tables'
  | 'table'
  | 'sequences'
  | 'sequence'
  | 'views'
  | 'view'
  | 'functions'
  | 'function'
  | 'procedures'
  | 'procedure'
  | 'triggers'
  | 'trigger'
  | 'columns'
  | 'column';

export type BasicSqlNodeType =
  | 'basicDb'
  | 'basicSchema'
  | 'basicTables'
  | 'basicTable'
  | 'basicSequences'
  | 'basicSequence'
  | 'basicViews'
  | 'basicView'
  | 'basicFunctions'
  | 'basicFunction'
  | 'basicProcedures'
  | 'basicProcedure';
// | 'basicTriggers'
// | 'basicTrigger'
// | 'basicColumns'
// | 'basicColumn';

export type RedisNodeType =
  | 'redisDb'
  | 'redisFolder'
  // | 'redisKey'
  | 'redisHash'
  | 'redisList'
  | 'redisString'
  | 'redisZSet'
  | 'redisSet';

//export type ESNodeType = 'esIndex' | 'esColumn';
export type ZookeeperNodeType = 'zkNode';

export type KafkaNodeType = 'kafkaBrokers' | 'kafkaBroker';

export type CommonCluster = 'cluster' | 'members' | 'member';
// lease 租约
export type EtcdNodeType = 'leases' | 'lease';

export type CommonTopic = 'topics' | 'topic' | 'groups' | 'group';

export type CommonAuth = 'auth' | 'users' | 'user' | 'roles' | 'role' | 'permissions' | 'permission';

export type CommonKey = 'data' | 'dic' | 'key' | 'node' | '';

export type CommonDoc = 'indexs' | 'index'

export type ExtraNode = 'status'

export type AllNodeType =
  | 'server'
  | SqlNodeType
  | BasicSqlNodeType
  | RedisNodeType
  | ZookeeperNodeType
  | KafkaNodeType
  | EtcdNodeType
  | CommonCluster
  | CommonTopic
  | CommonAuth
  | CommonKey
  | CommonDoc
  | ExtraNode;


//export type AllNodeType = ServerType | SqlNodeType | CacheNodeType

//export type AllSubNodeType = 'server'| SqlNodeType | CacheNodeType

export type SubNodeType =
  | SqlNodeType
  | BasicSqlNodeType
  | RedisNodeType
  | KafkaNodeType
  | ZookeeperNodeType
  | EtcdNodeType
  | CommonCluster
  | CommonTopic
  | CommonAuth
  | CommonKey
  | CommonDoc
  | ExtraNode;
