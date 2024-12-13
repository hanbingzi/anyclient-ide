import { Autowired, Injectable } from '@opensumi/di';
import { ServerInfo } from '../../../local-store-db/common';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { IEsColumn, IEsService, IEsServiceToken } from '../../../server-client/common/types/es.types';
import { Emitter } from '@opensumi/ide-core-browser';
import { IPage } from '../../../components/pagination';
import { IBaseState } from '../../common/data-browser.types';
import { ITableColumn, ITableRow, IUpdateDataResult } from '../../../components/table-editor';
import { DataInputEnum } from '../../../base/types/edit-input.types';
import { EsConvert } from '../../../server-client/common/convert/es-convert';
import { EsColumnEnum } from '../../../server-client/common/fields/es-fields';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { IQueryResult } from '../../../server-client/common';
import { isNotEmpty } from '../../../base/utils/object-util';

/**

 * 努力学习---啦啦啦
 */
export const EsId = '_id';
export const EsScore = '_score';
export const EsSource = '_source';

@Injectable({ multiple: true })
export class EsIndexViewService {
  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  @Autowired(IEsServiceToken)
  private esService: IEsService;

  protected readonly onDataLoadingChangeEmitter = new Emitter<boolean>();
  protected readonly onIndexDataChangeEmitter = new Emitter<ITableRow[]>();
  private readonly onIndexColumnChangeEmitter = new Emitter<ITableColumn[]>();
  private readonly onPageChangeEmitter = new Emitter<IPage>();

  private _page: IPage = { total: 0, page: 1, pageSize: 50 };


  //控制数据加载时的页面阴影显示
  private indexName: string;
  private server: ServerInfo;
  protected indexData: ITableRow[];
  protected indexColumn: ITableColumn[] = [];
  protected costTime;
  private _filters: IWhereParam[];
  private _enableFilter: boolean = false;

  private columnMap = new Map<string, DataInputEnum>();


  public _whenReady: Promise<void>;

  get onPageChange() {
    return this.onPageChangeEmitter.event;
  }

  get onDataLoadingChange() {
    return this.onDataLoadingChangeEmitter.event;
  }


  get onIndexDataChange() {
    return this.onIndexDataChangeEmitter.event;
  }

  get onIndexColumnChange() {
    return this.onIndexColumnChangeEmitter.event;
  }


  public setFilterSetting(isEnable: boolean) {
    this._enableFilter = isEnable;
  }


  public init(
    esState: IBaseState,
  ) {
    const { serverId, server, db, schema, nodeName, serverType, nodeType, option } = esState;
    this.server = server;
    this.indexName = nodeName;
    this._whenReady = this.resolveWorkspaceData();
  }


  get whenReady() {
    return this._whenReady;
  }

  public async resolveWorkspaceData() {
    await this.loadData();
  }

  async loadDataByPage(page: number, pageSize: number) {
    this._page = { ...this._page, page, pageSize };
    //console.log('loadDataByPage-->', this._page);
    await this.loadData();
  }


  async refreshPage(total: number, pageCount: number) {
    this._page = { ...this._page, total, pageCount };
    //console.log('refreshPage-->', this._page);
    this.onPageChangeEmitter.fire(this._page);
  }

  async remove(removeData: ITableRow[]) {
    for (let item of removeData) {
      const id = item[EsId];
      await this.esService.delete({ server: this.server }, this.indexName, id);
    }
    return true;
  }

  async filter(filters: IWhereParam[]) {
    this._filters = filters;
    this.loadData();
  }


  public async loadData() {
    if (!this.server || !this.indexName) {
      return;
    }
    const wheres = this._enableFilter ? this._filters : [];
    const result = await this.esService.getIndexDataByPage({ server: this.server }, this.indexName, wheres, this._page);
    if (result.success) {
      const dataHits = result.data['hits']['hits'];
      const pageCount = dataHits.length;
      this.refreshPage(result.total, pageCount ? pageCount : 50);
      const mappingResult = await this.esService.mappingToColumn({ server: this.server }, this.indexName);
      if (mappingResult.success) {
        const columnList = mappingResult.data;
        this.loadIndexColumn(columnList);
        const tableData: ITableRow[] = [];
        for (let hitItem of dataHits) {
          const tableDataItem: ITableRow = {};
          tableDataItem[EsId] = hitItem[EsId];
          tableDataItem[EsScore] = hitItem[EsScore];
          const source = hitItem[EsSource];
          for (let columnItem of columnList) {
            if (columnItem.type !== EsColumnEnum.object) {
              tableDataItem[columnItem.name] = source[columnItem.name];
            } else {
              tableDataItem[columnItem.name] = JSON.stringify(source[columnItem.name]);
            }
          }
          tableData.push(tableDataItem);
        }
        this.onIndexDataChangeEmitter.fire(tableData);
      }
    } else {
      this.dialogService.error(result.message, ['ok']);
    }
    this.onDataLoadingChangeEmitter.fire(false);
  }

  public async loadIndexColumn(columns: IEsColumn[]) {
    const tableColumns: ITableColumn[] = [];
    tableColumns.push({
      title: EsId,
      columnKey: EsId,
      disableEdit: true,
      dataType: DataInputEnum.string,
      isPrimary: true,
    });
    tableColumns.push({ title: EsScore, columnKey: EsScore, disableEdit: true, dataType: DataInputEnum.float });
    for (let item of columns) {
      const dataType = EsConvert.fieldToInputType(item.type);
      tableColumns.push({ title: item.name, columnKey: item.name, dataType });
      this.columnMap.set(item.name, dataType);

    }
    this.onIndexColumnChangeEmitter.fire(tableColumns);

  }

  public async save(data: IUpdateDataResult) {
    const { addData, updateData } = data;
    const runResultList: IQueryResult[] = [];

    //新增数据
    if (addData && addData.size > 0) {
      for (let addDataRow of addData) {
        //原来的数据是map，无法新增，需要转换为对象形式
        const addBody = {};
        for (let columnData of addDataRow) {
          const [key, data] = columnData;
          if (isNotEmpty(data)) {
            addBody[key] = this.convertValue(key, data);
          }
        }
        const runResult = await this.esService.add({ server: this.server }, this.indexName, addBody);
        runResultList.push(runResult);
      }
    }

    //修改数据
    if (updateData && updateData.size > 0) {
      for (let updateDataRow of updateData) {
        const { originalData, updateRow } = updateDataRow;
        const updateBody = {};
        const id = originalData[EsId];
        for (let columnData of updateRow) {
          const [key, data] = columnData;
          //没有做非空判断，是因为怕要将数据修改为空
          updateBody[key] = this.convertValue(key, data);
        }
        const runResult = await this.esService.update({ server: this.server }, this.indexName, id, updateBody);
        runResultList.push(runResult);
      }
    }
    const errorResult = runResultList.filter(item => !item.success);
    errorResult.length > 0 && this.dialogService.error(errorResult.map(item => item.message).join('\n'));
    this.loadData();
    console.log('runResultList-->', runResultList);
    return true;
  }

  convertValue(columnKey: string, data: any) {
    const dataType = this.columnMap.get(columnKey);
    switch (dataType) {
      case DataInputEnum.float:
      case DataInputEnum.long:
      case DataInputEnum.int:
        return Number.parseInt(data);
      default:
        return data;
    }

  }


}
