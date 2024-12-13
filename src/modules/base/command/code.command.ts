import { Command } from '@opensumi/ide-core-common';
export const CodeCommands = {
  sqlCompletion: 'sql.completion',
  esCompletion: 'es.completion',
  redisCompletion: 'redis.completion',
  mongodbCompletion: 'mongodb.completion',
};
export const RunCommands = {
  runSqlCommand: 'sql.runSql',
  runSqlAllCommand: 'sql.runAllSql',
  runSqlBatchCommand: 'sql.runBatchSql',
  runRedisCommand: 'redis.runCommand',
  runRedisBatchCommand: 'redis.runBatch',
  runEsCommand:'es.run',
  runEsBatchCommand:'es.runBatch',
};
export const ExtensionCommands = {
  //sql执行命令
  runAllSql: 'ex.sql.runAll',
  runSelectedSql: 'ex.sql.runSelected',
  //redis执行命令
  runRedisCommand: 'ex.redis.runCommand',
  runAllRedisCommand: 'ex.redis.runAll',
  runSelectedRedisCommand: 'ex.redis.runSelected',
  //es执行命令
  runEsHit:'ex.es.runHit',
  runEsCommand:'ex.es.runCommand',
  runAllEsCommand:'ex.es.runAll',
  runSelectedEsCommand:'ex.es.runSelected'
};

export const SqlCompletionCommand: Command = { id: CodeCommands.sqlCompletion };
export const RedisCompletionCommand: Command = { id: CodeCommands.redisCompletion };
export const EsCompletionCommand: Command = { id: CodeCommands.esCompletion };
export const MongodbCompletionCommand: Command = { id: CodeCommands.mongodbCompletion };

/**
 * 执行单条sql语句
 */
export const RunSqlCommand: Command = { id: RunCommands.runSqlCommand };
export const RunBatchSqlCommand: Command = { id: RunCommands.runSqlBatchCommand };

export const RunSelectedSqlCommand: Command = { id: ExtensionCommands.runSelectedSql, label: 'Run Selected Sql' };
export const RunAllSqlCommand: Command = { id: ExtensionCommands.runAllSql, label: 'Run All Sql' };

export const RunRedisCommand: Command = { id: RunCommands.runRedisCommand };
export const RunBatchRedisCommand: Command = { id: RunCommands.runRedisBatchCommand };


export const RunEsCommand: Command = { id: RunCommands.runEsCommand };
export const RunEsBatchCommand: Command = { id: RunCommands.runEsBatchCommand };

/**
 * 执行所有的sql语句
 */

