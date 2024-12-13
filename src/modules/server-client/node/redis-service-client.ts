import { Injectable } from '@opensumi/di';
import {
  IKeyInfoResult,
  IKeyResult,
  IQueryResult,
  IRedisKeyInfo,
  IRedisServiceClient,
  IRedisUpdateParam,
  KeyValueType,
  RedisDbNode,
  SearchKeyParam,
} from '../common';
import { ConnectQuery } from '../../local-store-db/common';
import { RedisServerAdapter } from './adapter/redis-server-adapter';
import Redis, { Cluster } from 'ioredis';
import { RedisInputType, RedisType } from '../../base/types/common-fields.types';
import { AbstractBaseClient } from './base-client';
import { DataUtil } from '../../base/utils/data-util';
import { RedisUtils } from '../common/utils/redis-utils';
import { RedisOptionEnum, RedisResultEnum } from '../common/fields/redis-fields';
import { isNotNull } from '../../base/utils/object-util';

@Injectable()
export class RedisServiceClient extends AbstractBaseClient<Redis | Cluster> implements IRedisServiceClient {
  public async ping(connect: ConnectQuery): Promise<IQueryResult> {
    try {
      const connection = (await this.getConnection(connect)) as RedisServerAdapter;
      const result = await connection.ping();
      return { success: result };
    } catch (error) {
      console.log(error);
      return this.getErrorResult(error);
    } finally {
      this.closeConnection(connect);
    }
  }

  /**
   *
   * @param connect
   */
  // public getConnection(connect:ConnectQuery): Promise<ServerAdapter> {
  //
  //   return this.connectionManager.getConnection(connect);
  // }
  //
  // public async getClient(connect:ConnectQuery): Promise<Redis> {
  //   const connection = await this.getConnection(connect) as RedisConnection;
  //   const redis = connection.getClient();
  //   return redis;
  // }

  public getErrorResult(error: any): IQueryResult {
    return { success: false, message: error.message, code: error.errno }; //sql: error.sql,
  }

  async runBatchCommand(connect: ConnectQuery, commandList: string[]): Promise<IKeyResult[]> {
    // 查询命令
    // 无结果命令
    let resultList: IKeyResult[] = [];
    try {
      const redis = await this.getClient(connect);
      for (let command of commandList) {
        const result = await this.runCommandBase(command, redis);
        resultList.push(result);
      }
    } catch (e) {
      resultList.push({ success: false, isQuery: false, command: '', message: '未知错误' });
    }
    return resultList;
  }

  async runCommand(connect: ConnectQuery, command: string): Promise<IKeyResult> {
    try {
      const redis = await this.getClient(connect);
      return await this.runCommandBase(command, redis);
    } catch (e) {
      return { success: false, isQuery: false, command: command, message: e.message };
    }
  }

  call() {}

  callBuf() {}

  async runCommandBase(fullCommand: string, redis: Redis | Cluster): Promise<IKeyResult> {
    //查询命令是否是带keyName的，如果是，分析操作和keyName
    let result: IKeyResult = { success: false, isQuery: false, command: fullCommand, message: 'error' };
    const commandState = RedisUtils.parserCommand(fullCommand);
    if (!commandState) {
      result.message = '不支持的命令';
      return result;
    }
    const { command, args, option, resultType } = commandState;
    result.keyName = args;
    return new Promise<IKeyResult>(async (resolve, reject) => {
      try {
        const executeTime = new Date().getTime();
        let callBack = (err, data: any) => {
          //console.log('会进入我吗---3》');
          const costTime = new Date().getTime() - executeTime;
          result.costTime = costTime;
          if (err) {
            const errData = this.getErrorResult(err);
            result = { ...result, ...errData };
            resolve(result);
          }
          result.success = true;
          if (option === RedisOptionEnum.query) {
            result = { ...result, message: 'OK', data, isQuery: true, valueType: resultType };
            if (resultType === RedisResultEnum.string) {
              if (isNotNull(data)) {
                result.data = DataUtil.bufToHex(data);
              } else {
                result.success = false;
                result.data = '';
                result.message = 'Not find key';
              }
            }
          } else {
            console.log('redis opt data:', data);
            result = { ...result, message: 'Result:' + data, data: data };
          }
          resolve(result);
        };
        //分解命令
        //console.log('会进入我吗---2》');
        if (resultType === RedisResultEnum.string) {
          redis.callBuffer(command, args ? args : [], callBack);
        } else {
          redis.call(command, args ? args : [], callBack);
        }
      } catch (e) {
        console.log('查询出错', e);
        resolve(result);
      }
    });
  }

  //  * 展示所有的库
  //  * @param serverInfo
  //  */
  async showDatabases(connect: ConnectQuery): Promise<IQueryResult<RedisDbNode[]>> {
    const { connectionType } = connect.server;
    try {
      const redis = await this.getClient(connect);
      let dbs = [0];
      if (connectionType !== 'Cluster') {
        dbs = await redis.config('GET', 'databases').then((reply) => {
          //console.log('reply', reply)
          let dbs = [...Array(parseInt((reply as any)[1])).keys()];
          return dbs;
        });
      }
      let counts = await redis.info('Keyspace').then((info) => {
        let keyspace = info.split('# Keyspace')[1].trim().split('\n');
        //console.log('keyspace:',keyspace)
        //let keyCount = [];
        let counts = new Map<number, number>();
        for (const line of keyspace) {
          let keyCount = line.match(/db(\d+)\:keys=(\d+)/);
          //console.log('keyCount:', keyCount)
          if (keyCount) {
            counts.set(parseInt(keyCount[1]), parseInt(keyCount[2]));
          }
        }
        return counts;
      });
      let result: RedisDbNode[] = dbs.map((value) => {
        if (counts.has(value)) {
          return new RedisDbNode(value, counts.get(value)!);
        }
        return new RedisDbNode(value, 0);
      });
      return { success: true, data: result };
    } catch (e) {
      console.log('redis------->error', e);
      return { success: false, error: JSON.stringify(e) };
    }
  }

  async scanKeys(connect: ConnectQuery, searchKeyParam: SearchKeyParam): Promise<IRedisKeyInfo[]> {
    const redis = (await this.getClient(connect)) as Redis;
    return await this.nodeScanKeys(redis, searchKeyParam);
  }

  async clusterScanKeys(connect: ConnectQuery, searchKeyParam: SearchKeyParam): Promise<IRedisKeyInfo[]> {
    const redis = (await this.getClient(connect)) as Cluster;
    const nodes = redis.nodes('master');
    const scanKeyList: IRedisKeyInfo[] = [];
    await Promise.all(
      nodes.map(async (node, index) => {
        const keyResult = await this.nodeScanKeys(node, searchKeyParam);
        if (keyResult && keyResult.length > 0) {
          scanKeyList.push(...keyResult);
        }
      }),
    );
    return scanKeyList;
  }

  async nodeScanKeys(redis: Redis, searchKeyParam: SearchKeyParam): Promise<IRedisKeyInfo[]> {
    let scanOption = {
      match: searchKeyParam.match,
      count: searchKeyParam.count,
    };
    let stream = redis.scanStream(scanOption);
    //let stream = redis1.scanStream(scanOption);
    const result: IRedisKeyInfo[] = [];
    return new Promise<IRedisKeyInfo[]>((resolve, reject) => {
      stream.on('data', async (resultKeys) => {
        for (let key of resultKeys) {
          const type = await redis.type(key);
          result.push({ name: key, type: type as RedisType });
        }
        resolve(result);
      });
    });
    // stream.on("end", () => {
    //   console.log("all keys have been visited");
    // });
  }

  // async scanKeys(connect: ConnectQuery, searchKeyParam: SearchKeyParam): Promise<IRedisKeyInfo[]> {
  //   const {connectionType} = connect.server
  //   let scanOption = {
  //     match: searchKeyParam.match,
  //     count: searchKeyParam.count,
  //   };
  //   const redis = await this.getClient(connect) as Redis;
  //   let stream=redis.scanStream(scanOption)
  //   //let stream = redis1.scanStream(scanOption);
  //   const result: IRedisKeyInfo[] = [];
  //   return new Promise<IRedisKeyInfo[]>((resolve, reject) => {
  //     stream.on('data', async (resultKeys) => {
  //       for (let key of resultKeys) {
  //         const type = await redis.type(key);
  //         result.push({ name: key, type: type as RedisType });
  //       }
  //       resolve(result);
  //     });
  //   });
  //   // stream.on("end", () => {
  //   //   console.log("all keys have been visited");
  //   // });
  // }

  async delete(connect: ConnectQuery, key: string): Promise<IQueryResult> {
    //const connection = await this.getConnection(connect) as RedisConnection;
    const redis = await this.getClient(connect);
    redis.del(key);
    return { success: true };
  }

  async deleteByFolder(connect: ConnectQuery, folder: string): Promise<IQueryResult> {
    //const connection = await this.getConnection(connect) as RedisConnection;
    const redis = await this.getClient(connect);
    try {
      return new Promise<IQueryResult>((resolve, reject) => {
        redis.keys(`${folder}*`, (err, keys) => {
          if (err) {
            reject(err);
          } else {
            redis.del(keys as string[]);
            resolve({ success: true });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keyInfo(connect: ConnectQuery, keyName: string): Promise<IQueryResult<IKeyInfoResult>> {
    try {
      const redis = await this.getClient(connect);
      const keyType = await redis.type(keyName);
      if (keyType === 'none') {
        return { success: false };
      }
      const keyTtl = await redis.ttl(keyName);
      return { success: true, data: { keyTtl, keyType } };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keyTtl(connect: ConnectQuery, keyName: string): Promise<IQueryResult<number>> {
    try {
      const redis = await this.getClient(connect);
      const keyTtl = await redis.ttl(keyName);
      return { success: true, data: keyTtl };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keyType(connect: ConnectQuery, keyName: string): Promise<IQueryResult<string>> {
    try {
      const redis = await this.getClient(connect);
      const keyType = await redis.type(keyName);
      return { success: true, data: keyType };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keyData(connect: ConnectQuery, keyName: string): Promise<IQueryResult<KeyValueType>> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      const keyType = await redis.type(keyName);
      let queryData: any;
      switch (keyType) {
        case RedisType.string:
          const buffer = await redis.getBuffer(keyName);
          queryData = DataUtil.bufToHex(buffer);
          //console.log('nodeJs------------------>:',queryData)
          //console.log('msgpack-->',DataDealUtil.bufferToMsgpack(queryData))
          break;
        case RedisType.hash:
          const hall = await redis.hgetall(keyName);
          queryData = Object.keys(hall).map((key) => {
            return { key, value: hall[key] };
          });
          break;
        case RedisType.list:
          queryData = await redis.lrange(keyName, 0, -1);
          break;
        case RedisType.set:
          queryData = await redis.smembers(keyName);
          break;
        case RedisType.zset:
          const zsets = await redis.zrange(keyName, 0, -1, 'WITHSCORES');
          queryData = [];
          if (zsets) {
            for (let i = 0; i < zsets.length; i += 2) {
              queryData.push({
                value: zsets[i],
                score: parseFloat(zsets[i + 1]),
              });
            }
          }
          break;
      }
      return { success: true, data: queryData };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  /**
   * 设置key过期时间
   * @param connect
   * @param keyName
   */
  async keyExpire(connect: ConnectQuery, keyName: string, expire: number): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      await redis.expire(keyName, expire);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keyRename(connect: ConnectQuery, keyName: string, newName: string): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      await redis.rename(keyName, newName);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keySet(connect: ConnectQuery, keyName: string, newValue: string, ttl?: number): Promise<IQueryResult> {
    try {
      console.log('------>KeyName:', keyName, ';ttl->', ttl);
      const redis = await this.getClient(connect);
      if (ttl) redis.set(keyName, newValue, 'EX', ttl);
      else redis.set(keyName, newValue);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async keySetForBuffer(connect: ConnectQuery, keyName: string, newValue: string): Promise<IQueryResult> {
    try {
      //console.log('keySetForBuffer-->',newValue)
      const redis = await this.getClient(connect);
      redis.set(keyName, DataUtil.xToBuffer(newValue));
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async deleteKeyData(connect: ConnectQuery, keyName: string, content: string[]): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      const keyType = await redis.type(keyName);
      switch (keyType) {
        case RedisType.hash:
          content.forEach((item) => redis.hdel(keyName, item));
          break;
        case RedisType.list:
          content.forEach((item) => redis.lrem(keyName, 0, item));
          break;
        case RedisType.set:
          content.forEach((item) => redis.srem(keyName, item));
          break;
        case RedisType.zset:
          content.forEach((item) => redis.zrem(keyName, item));
          break;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async updateKeyData(
    connect: ConnectQuery,
    keyName: string,
    updateParams: IRedisUpdateParam[],
  ): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      const keyType = await redis.type(keyName);
      console.log();
      switch (keyType) {
        case RedisType.hash:
          updateParams.forEach((item) => {
            redis.hdel(keyName, item.oldKey!);
            redis.hset(keyName, item.newKey!, item.newValue);
          });
          break;
        case RedisType.list:
          updateParams.forEach((item) => {
            redis.lrem(keyName, 0, item.oldKey!);
            redis.rpush(keyName, item.newValue);
          });
          break;
        case RedisType.set:
          updateParams.forEach((item) => {
            redis.srem(keyName, item.oldKey!);
            redis.sadd(keyName, item.newValue);
          });
          break;
        case RedisType.zset:
          updateParams.forEach((item) => {
            //redis.zrem(keyName, item.oldKey!);
            redis.zadd(keyName, item.newScore, item.newValue);
          });
          break;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async setKeyData(
    connect: ConnectQuery,
    keyName: string,
    keyType: RedisInputType,
    addParams: IRedisUpdateParam[],
    ttl?: number,
  ): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      await this.addKeyDataByType(redis, keyName, keyType, addParams);
      if (ttl) redis.expire(keyName, ttl);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async addKeyData(connect: ConnectQuery, keyName: string, addParams: IRedisUpdateParam[]): Promise<IQueryResult> {
    try {
      const redis = await this.getClient(connect);
      const keyNum = await redis.exists(keyName);
      if (keyNum !== 1) {
        return { success: false, message: `${keyName}不存在` };
      }
      const keyType = await redis.type(keyName);
      await this.addKeyDataByType(redis, keyName, keyType, addParams);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async addKeyDataByType(redis: Redis | Cluster, keyName: string, keyType: string, addParams: IRedisUpdateParam[]) {
    switch (keyType) {
      case RedisType.hash:
        addParams.forEach((item) => {
          redis.hset(keyName, item.newKey!, item.newValue);
        });
        break;
      case RedisType.list:
        addParams.forEach((item) => {
          redis.rpush(keyName, item.newValue);
        });
        break;
      case RedisType.set:
        addParams.forEach((item) => {
          redis.sadd(keyName, item.newValue);
        });
        break;
      case RedisType.zset:
        addParams.forEach((item) => {
          redis.zadd(keyName, item.newScore, item.newValue);
        });
        break;
    }
  }
}
