import { Autowired, Injectable } from '@opensumi/di';
import { IEsClientServicePath, IEsColumn, IEsCommand, IEsService, IEsServiceClient } from '../../common/types/es.types';
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
    const command = this.dialect.getHealth();
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

  clusterHealth(connectQuery: ConnectQuery){
    const command = this.dialect.getHealth();
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
