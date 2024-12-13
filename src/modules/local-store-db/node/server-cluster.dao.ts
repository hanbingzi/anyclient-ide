import { Autowired, Injectable } from '@opensumi/di';
import { IServerClusterDao } from '../common';
import { uuid } from '@opensumi/ide-core-node';
import { ServerCluster } from '../common/model.define';
import { isEmpty } from '../../base/utils/object-util';
import BaseDao from './base.dao';

@Injectable()
export class ServerClusterDao extends BaseDao<ServerCluster> implements IServerClusterDao {
  get collection(): string {
    return 'serverCluster';
  }

  get primaryKey(): string {
    return 'clusterId';
  }

  async countByWhereParam(whereParam: Partial<ServerCluster>): Promise<number> {
    return this._countByWhereParam(whereParam);
  }

  async delete(id: string): Promise<void> {
    this._deleteById(id);
  }

  async deleteByIds(ids: string[]): Promise<void> {
    this._deleteByIds(ids);
  }

  async deleteByServerId(serverId: string): Promise<void> {
    // 根据多个ID删除文档
    const documentIds = ['id1', 'id2', 'id3']; // 要删除的文档的ID数组
    const query = { serverId: serverId }; // 使用$in运算符匹配多个ID值
    this.db.remove(query, {}, (err, numRemoved) => {
      if (err) {
        console.error('Error deleting documents:', err);
      } else {
        console.log('Number of documents removed:', numRemoved);
      }
    });
  }

  async findById(id: string): Promise<ServerCluster> {
    return this._findById(id);
  }

  async findByIds(ids: string[]): Promise<ServerCluster[]> {
    return this._findByIds(ids);
  }

  async save(cluster: ServerCluster): Promise<void> {
    if (isEmpty(cluster.clusterId)) {
      cluster.clusterId = uuid();
    } else {
      let exist = await this._countByWhereParam({ clusterId: cluster.clusterId });
      if (exist > 0) {
        await this.updateById(cluster.clusterId, cluster);
        return;
      }
    }
    this.insert(cluster);
  }

  async multiSave(serverClusters: ServerCluster[]): Promise<void> {
    for (let item of serverClusters) {
      await this.save(item);
    }
  }

  async updateById(id: string, serverCluster: Partial<ServerCluster>) {
    this._updateById(id, serverCluster);
  }

  async findByServerId(serverId: string): Promise<ServerCluster[]> {
    return this._findByWhereParam({ serverId });
  }

  //  syncFindByServerId(serverId: string): ServerCluster[] {
  //   return await this._findByWhereParam({serverId})
  // }
}
