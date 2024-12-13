import { Etcd3 } from 'etcd3';
import { AbstractBaseClient } from './base-client';
import { IEtcdAddPermission, IEtcdDataInfo, IEtcdMember, IEtcdServiceClient } from '../common/types/etcd.types';
import { Injectable } from '@opensumi/di';
import { ConnectQuery } from '../../local-store-db/common';
import { IKeyPathInfo, IQueryResult } from '../common';
import { EtcdServerAdapter } from './adapter/etcd-server-adapter';
import { StrKeyObject } from '../../base/model/common.model';

@Injectable()
export class EtcdServiceClient extends AbstractBaseClient<Etcd3> implements IEtcdServiceClient {

  public async ping(connect: ConnectQuery): Promise<IQueryResult> {
    try {
      const connection = (await this.getConnection(connect)) as EtcdServerAdapter;
      const result = await connection.ping();
      return { success: result };
    } catch (error) {
      console.log(error);
      return this.getErrorResult(error);
    } finally {
      this.closeConnection(connect);
    }
  }

  public getErrorResult(error: any): IQueryResult {
    console.log(error);
    return { success: false, message: error.message, code: error.errno }; //sql: error.sql,
  }

  /**
   *
   */
  public async showKeys(connect: ConnectQuery, prefix: string = ''): Promise<IQueryResult<IKeyPathInfo[]>> {
    try {
      let startKey = null;
      let totalItems = 0;
      const allDirectories = new Set<string>();
      const allKeys: string[] = [];
      while (totalItems < 5000) {
        const result = await this.getKeysWithDirectoryStructure(connect, prefix, 1000, startKey);
        result.directories.forEach((dir) => allDirectories.add(dir));
        allKeys.push(...result.keys);
        totalItems = allDirectories.size + allKeys.length;
        if (!result.nextStartKey || totalItems >= 5000) break;
        startKey = result.nextStartKey;
      }
      const allKeyPath: IKeyPathInfo[] = [];

      allDirectories.forEach((item) => {
        allKeyPath.push({ name: item, type: 'dic', isKey: false, fullPath: prefix + item + '/' });
      });

      allKeys.forEach((item) => {
        allKeyPath.push({ name: item, type: 'key', isKey: true, fullPath: item });
      });

      console.log('Keys:', allKeys);
      console.log('Total items:', totalItems);
      return { success: true, data: allKeyPath };
    } catch (error) {
      console.error('Error in main function:', error);
      return { success: true, ...this.getErrorResult(error) };
    }
  }

  public async getKeysWithDirectoryStructure(connect: ConnectQuery, prefix = '', pageSize = 1000, startKey = null) {
    const result = {
      keys: [],
      directories: new Set<string>(),
      allDicAndKeys: [],
      nextStartKey: null,
    };

    try {
      const client = await this.getClient(connect);
      let query = client.getAll().prefix(prefix).sort('Key', 'Ascend').limit(pageSize);

      if (startKey) {
        query = query.minCreateRevision(startKey);
      }

      const keys = await query.keys();
      //const keys = Object.keys(response);

      for (const key of keys) {
        const finalPath = prefix ? key.replace(prefix, '') : key;
        const parts = finalPath.split('/');
        if (parts.length > 1) {
          result.directories.add(parts[0]);
        } else {
          result.keys.push(key);
        }
      }
      // result.directories = Array.from(result.directories);
      // result.keys = result.keys.filter(key => !result.directories.includes(key));
      if (keys.length === pageSize) {
        result.nextStartKey = keys[keys.length - 1];
      }

      return result;
    } catch (error) {
      console.error('Error fetching keys:', error);
      throw error;
    }
  }

  async keyData(connect: ConnectQuery, key: string): Promise<IQueryResult<IEtcdDataInfo>> {
    try {
      const client = await this.getClient(connect);
      const response = await client.get(key).exec();

      if (response.kvs && response.kvs.length > 0) {
        const kv = response.kvs[0];
        const data: IEtcdDataInfo = {
          key: kv.key.toString(),
          value: kv.value.toString(),
          create_revision: kv.create_revision,
          mod_revision: kv.mod_revision,
          version: kv.version,
          lease: kv.lease,
        };
        return { success: true, data };
      }
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: true, ...this.getErrorResult(error) };
    }

    return { success: false };
  }

  async keyValue(connect: ConnectQuery, key: string): Promise<IQueryResult<string>> {
    try {
      const client = await this.getClient(connect);
      const keyValue = await client.get(key).string();
      return { success: true, data: keyValue };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async addOrUpdateKeyValue(connect: ConnectQuery, key: string, value: string): Promise<IQueryResult<string>> {
    try {
      const client = await this.getClient(connect);
      await client.put(key).value(value);
      return { success: true };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteKey(connect: ConnectQuery, key: string): Promise<IQueryResult<string>> {
    try {
      const client = await this.getClient(connect);
      await client.delete().key(key);
      return { success: true };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteKeys(connect: ConnectQuery, keys: string[]): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      for (let itemKey of keys) {
        await client.delete().key(itemKey);
      }
      return { success: true };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteByKeyPrefix(connect: ConnectQuery, keyPrefix: string): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      await client.delete().prefix(keyPrefix);
      return { success: true };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async putKeyValue(
    connect: ConnectQuery,
    key: string,
    value: string,
    ttlInSeconds?: number,
  ): Promise<IQueryResult<string>> {
    try {
      const client = await this.getClient(connect);
      //const lease = client.lease(ttlInSeconds);
      await client.put(key).value(value);
      return { success: true };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async showUsersInfo(connect: ConnectQuery): Promise<IQueryResult<StrKeyObject[]>> {
    const result: StrKeyObject[] = [];
    try {
      const client = await this.getClient(connect);
      const users = await client.getUsers();
      for (let user of users) {
        const roles = await client.user(user.name).roles();
        result.push({ user: user.name, roles: roles.map((role) => role.name).join(',') });
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async showUsers(connect: ConnectQuery): Promise<IQueryResult<string[]>> {
    try {
      const client = await this.getClient(connect);
      const users = await client.getUsers();

      return { success: true, data: users.map((item) => item.name) };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteUsers(connect: ConnectQuery, users: string[]): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      for (let user of users) {
        await client.user(user).delete();
      }
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteUser(connect: ConnectQuery, user: string): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      await client.user(user).delete();
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async addUser(connect: ConnectQuery, user: string, password: string): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      await client.user(user).create(password);
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async userAddRole(connect: ConnectQuery, user: string, roles: string[]): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      if (roles && roles.length > 0) {
        for (const role of roles) {
          await client.user(user).addRole(role);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async showRolesInfo(connect: ConnectQuery): Promise<IQueryResult<StrKeyObject[]>> {
    const result: StrKeyObject[] = [];
    try {
      const client = await this.getClient(connect);
      const roles = await client.getRoles();
      for (let role of roles) {
        const permissions = await client.role(role.name).permissions();
        result.push({
          role: role.name,
          permissions: permissions
            .map(
              (per) => `{Type:${per.permission},Start:${per.range.start.toString()},End:${per.range.end.toString()}}`,
            )
            .join(','),
        });
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async showRoles(connect: ConnectQuery): Promise<IQueryResult<string[]>> {
    try {
      const client = await this.getClient(connect);
      const roles = await client.getRoles();

      return { success: true, data: roles.map((item) => item.name) };
    } catch (error) {
      console.error('Etcd Error ', error);
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteRoles(connect: ConnectQuery, roles: string[]): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      for (let role of roles) {
        await client.role(role).delete();
      }
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async deleteRole(connect: ConnectQuery, role: string): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      await client.role(role).delete();
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async addRole(connect: ConnectQuery, role: string): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      await client.role(role).create();
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async roleAddPermission(connect: ConnectQuery, role: string,permissions:IEtcdAddPermission[]): Promise<IQueryResult> {
    try {
      const client = await this.getClient(connect);
      for(let per of permissions){
        await client.role(role).grant(per)
      }
      return { success: true };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }
  }

  async showCluster(connect: ConnectQuery):Promise<IQueryResult<IEtcdMember[]>> {
    try {
      const data:IEtcdMember[] = []
      const client = await this.getClient(connect);
     const members = await client.cluster.memberList({});
      for(let per of members.members){
       data.push({
         peerURLs:per.peerURLs.join(','),
         clientURLs:per.clientURLs.join(','),
         ID:per.ID,
         name:per.name,
         isLearner:per.isLearner
       })
      }
      return { success: true,data };
    } catch (error) {
      return { success: false, ...this.getErrorResult(error) };
    }

  }
}
