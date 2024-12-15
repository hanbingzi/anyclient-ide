import { Autowired, Injectable } from '@opensumi/di';
import {
  IEsClientServicePath,
  IESClusterStats,
  IEsColumn,
  IEsCommand,
  IEsIndexStats,
  IEsService,
  IEsServiceClient,
} from '../../common/types/es.types';
import { ConnectQuery } from '../../../local-store-db/common';
import { IEsPageDataResult, IEsRunResult, IQueryResult } from '../../common';
import { EsDialect } from '../../common/dialet/es-dialect';
import { IPage } from '../../../components/pagination';
import { EsColumnEnum } from '../../common/fields/es-fields';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { isNotEmpty } from '../../../base/utils/object-util';

@Injectable()
export class EsService implements IEsService {


  private dialect: EsDialect = new EsDialect();
  @Autowired(IEsClientServicePath)
  private esClientService: IEsServiceClient;

  ping(connect: ConnectQuery): Promise<IQueryResult> {
    const command = this.dialect.clusterHealth();
    return this.esClientService.runCommand(connect, command);
  }

  async run(connectQuery: ConnectQuery, command: string[]): Promise<IEsRunResult> {

    const hasBody = command.length > 2 && isNotEmpty(command[2]);
    const esCommand: IEsCommand = { type: command[0], path: command[1], body: (hasBody ? command[2] : null) };
    const runResult = await this.esClientService.runCommand(connectQuery, esCommand);
    const runCommand = `${command[0]} ${command[1]} ${hasBody ? '\n' + command[2] : ''}`;
    return {
      ...runResult,
      data: JSON.stringify(runResult.data),
      command: runCommand,
      message: runResult.success ? 'success' : runResult.message,
    };
  }

  async dashboard(connectQuery: ConnectQuery): Promise<IQueryResult<IESClusterStats>> {
    const healthCommand = this.dialect.clusterHealth();
    const clusterStatsCommand = this.dialect.clusterStats();
    const nodesStatsCommand = this.dialect.nodeStats();
    const indicesCommand = this.dialect.indices();
    const healthResult = await this.esClientService.runCommand(connectQuery, healthCommand);
    const clusterStatsResult = await this.esClientService.runCommand(connectQuery, clusterStatsCommand);
    const nodesStatsResult = await this.esClientService.runCommand(connectQuery, nodesStatsCommand);
    const indicesResult = await this.esClientService.runCommand(connectQuery, indicesCommand);
    const clusterStats: IESClusterStats = {};
    try {
      if (healthResult.success) {
        const healthBody = healthResult.data;
        clusterStats.clusterHealth = {
          status: healthBody?.status,
          numberOfNodes: healthBody?.number_of_nodes,
          activeShards: healthBody?.active_shards,
          relocatingShards: healthBody?.relocating_shards,
          initializingShards: healthBody?.initializing_shards,
          unassignedShards: healthBody?.unassigned_shards,
          pendingTasks: healthBody?.number_of_pending_tasks,
          activePrimaryShards: healthBody?.active_primary_shards,
          activeShardsPercentAsNumber: healthBody?.active_shards_percent_as_number,
        };
      }
      if (clusterStatsResult.success) {
        const clusterBody = clusterStatsResult.data;
        clusterStats.cluster = {
          name: clusterBody?.cluster_name,
          version: clusterBody?.nodes?.versions[0],
          indicesCount: clusterBody?.indices?.count,
          indicesDocCount: clusterBody?.indices?.docs?.count,
          indicesDocDeleted: clusterBody?.indices?.docs?.deleted,
          storeSizInBytes: clusterBody?.indices?.store?.size_in_bytes,
          storeTotalDataSetSizeInBytes: clusterBody?.indices?.store?.total_data_set_size_in_bytes,
        };
      }
      if (nodesStatsResult.success) {
        const nodesBody = nodesStatsResult.data;
        clusterStats.nodes = Object.entries(nodesBody.nodes).map(([nodeId, node]: [string, any]) => {
          return {
            name: node?.name,
            ip: node?.ip,
            role: node?.roles,
            cpu: node?.process?.cpu?.percent,
            memory: {
              used: node?.os?.mem?.used_in_bytes,
              total: node?.os?.mem?.total_in_bytes,
              percent: node?.os.mem.used_percent
            },
            // disk: {
            //   used: node?.fs?.total?.total_in_bytes - node?.fs?.total?.free_in_bytes,
            //   total: node?.fs?.total?.total_in_bytes,
            //   percent: ((node?.fs?.total?.total_in_bytes - node?.fs?.total?.free_in_bytes) / node?.fs?.total?.total_in_bytes) * 100,
            // },
            heapUsage: (node?.jvm?.mem?.heap_used_percent || 0),
          };

        });
      }
      if (indicesResult?.success) {
        const indicesBody = indicesResult?.data;
        const indexStats: IEsIndexStats[] = [];
        for (const index of indicesBody) {
          // 构建 IEsIndexStats 对象
          const indexStat: IEsIndexStats = {
            name: index?.index,
            docsCount: index?.['docs.count'],
            storageSize: index?.['store.size'], // 存储大小以字节为单位
            primaryShards: parseInt(index?.pri, 10),
            replicaShards: parseInt(index?.rep, 10),
          };

          indexStats.push(indexStat);
        }
        clusterStats.indices = indexStats;
      }
      return { success: true, data: clusterStats };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  clusterHealth(connectQuery: ConnectQuery) {
    const command = this.dialect.clusterHealth();
    return this.esClientService.runCommand(connectQuery, command);
  }

  showIndexList(connectQuery: ConnectQuery) {
    const command = this.dialect.indices();
    return this.esClientService.runCommand(connectQuery, command);
  }

  async getIndexDataByPage(connectQuery: ConnectQuery, index: string, wheres: IWhereParam[], page: IPage): Promise<IEsPageDataResult> {
    const command = this.dialect.page(index, wheres, page);
    const response = await this.esClientService.runCommand(connectQuery, command);
    if (response.success) {
      const data = response.data;
      //console.log('es-response:', response);
      return { success: true, total: data.hits.total.value, data: data };
    }
    return { ...response };

  }

  async mapping(connectQuery: ConnectQuery, index: string): Promise<IQueryResult> {
    const command = this.dialect.mapping(index);
    return await this.esClientService.runCommand(connectQuery, command);
  }

  async mappingToColumn(connectQuery: ConnectQuery, index: string): Promise<IQueryResult<IEsColumn[]>> {
    const command = this.dialect.mapping(index);
    const mappingResult = await this.esClientService.runCommand(connectQuery, command);
    if (mappingResult.success) {
      const columnList: IEsColumn[] = [];
      const properties = mappingResult.data[index]['mappings']['properties'];
      Object.keys(properties).map((key: string) => {
        const type = properties[key]['type'];
        if (type) {
          columnList.push({ name: key, type });
        } else {
          columnList.push({ name: key, type: EsColumnEnum.object });
        }

      });
      return { success: true, data: columnList };
    }
    return mappingResult;
  }


  async delete(connectQuery: ConnectQuery, index: string, id: string): Promise<IQueryResult<any>> {
    const command = this.dialect.delete(index, id);
    return await this.esClientService.runCommand(connectQuery, command);
  }


  async add(connectQuery: ConnectQuery, index: string, data: Object): Promise<IQueryResult<any>> {
    const command = this.dialect.postAdd(index, data);
    return await this.esClientService.runCommand(connectQuery, command);
  }

  async update(connectQuery: ConnectQuery, index: string, id: string, data: Object): Promise<IQueryResult<any>> {
    const command = this.dialect.update(index, id, data);
    console.log('add data--->', command);
    return await this.esClientService.runCommand(connectQuery, command);
  }
}
