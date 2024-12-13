import { Autowired, Injectable } from '@opensumi/di';
import { IServerDao } from '../common';
import { AppConfig, uuid } from '@opensumi/ide-core-node';
import BaseDao from './base.dao';
import { ServerInfo } from '../../local-store-db/common/model.define';
import { ServerType } from '../../base/types/server-node.types';
import { isEmpty } from '../../base/utils/object-util';

@Injectable()
export class ServerDao extends BaseDao<ServerInfo> implements IServerDao {
  @Autowired(AppConfig)
  private appConfig: AppConfig;

  get collection(): string {
    return 'server';
  }

  get primaryKey(): string {
    return 'serverId';
  }

  async testConnect(serverInfo: ServerInfo): Promise<boolean> {
    //
    await this.findRecentOpen();
    return true;
  }

  /**
   * 增
   */
  async save(serverInfo: ServerInfo) {
    if (isEmpty(serverInfo.serverId)) serverInfo.serverId = uuid();
    this.insert(serverInfo);
  }

  /**
   * 删
   */

  async delete(id: string): Promise<void> {
    this._deleteById(id);
  }

  /**
   * 查询解析
   */
  async countByWhereParam(whereParam: Partial<ServerInfo>): Promise<number> {
    return this._countByWhereParam(whereParam);
  }

  async findById(id: string): Promise<ServerInfo> {
    return this._findById(id);
  }

  async findByIds(ids: string[]): Promise<ServerInfo[]> {
    return this._findByIds(ids);
  }

  async updateById(id: string, serverInfo: ServerInfo) {
    this._updateById(id, serverInfo);
  }

  /**
   * // const findSql = `select ${this.getColumnsSql()}
   *     //                  from ${this.table}
   *     //                  order by open_time desc `
   */

  async findRecentOpen(): Promise<ServerInfo[]> {
    const sortOptions = { openTime: 1 };
    return this._findAndSort({}, sortOptions);
    // return new Promise<ServerInfo[]>(resolve => {
    //   const sortOptions = {openTime: 1};
    //   this.db.find(this.collectionParam).sort(sortOptions).exec((err, docs) => {
    //     if (err) {
    //       console.error('Error querying data:', err);
    //       resolve([])
    //     } else {
    //       console.log('Sorted Documents:', docs);
    //       resolve(docs)
    //     }
    //   })
    // })
  }

  async findAll(): Promise<ServerInfo[]> {
    const sortOptions = { serverType: -1, serverName: -1 };
    return this._findAndSort({}, sortOptions);
    // return new Promise<ServerInfo[]>(resolve => {
    //   const sortOptions = {serverType: -1,serverName:-1};
    //   this.db.find(this.collectionParam).sort(sortOptions).exec((err, docs) => {
    //     if (err) {
    //       console.error('Error querying data:', err);
    //       resolve([])
    //     } else {
    //       console.log('Sorted Documents:', docs);
    //       resolve(docs)
    //     }
    //   })
    // })
  }

  async findByType(type: ServerType): Promise<ServerInfo[]> {
    const query = { serverType: type };
    const sortOptions = { serverName: -1 };
    return this._findAndSort(query, sortOptions);
    // return new Promise<ServerInfo[]>(resolve => {
    //
    //   this.db.find(query).sort(sortOptions).exec((err, docs) => {
    //     if (err) {
    //       console.error('Error querying data:', err);
    //       resolve([])
    //     } else {
    //       console.log('Sorted Documents:', docs);
    //       resolve(docs)
    //     }
    //   })
    // })
  }

  async findByWorkspaceAndServerType(serverId: string[], serverType: ServerType[]): Promise<ServerInfo[]> {
    // const findSql = `
    //   select ${this.getColumnsSql('b')}
    //   from ac_open_recent as a
    //          left join ac_server as b on a.server_id = b.server_id
    //   where workspace = ?
    //     and b.server_type in (${serverType.map(item => `'${item}'`).join(',')})
    //   order by b.server_type`;

    // const result = this._execFindSql(findSql, workspace);
    //return result;
    const query = { serverId: { $in: serverId }, serverType: { $in: serverType } };
    return this._findByWhereParam(query);
  }
}
