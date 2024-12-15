import { IEsCommand } from '../types/es.types';
import { IPage } from '../../../components/pagination';
import { PageUtils } from '../page/pageService';
import { IWhereParam } from '../../../base/model/sql-param.model';
import { isNotEmpty } from '../../../base/utils/object-util';


export class EsDialect {

  public clusterHealth(): IEsCommand {
    return {
      type: 'GET',
      path: '_cluster/health',
    };
  }
  public clusterStats(): IEsCommand {
    return {
      type: 'GET',
      path: '_cluster/stats',
    };
  }

  public allStats():IEsCommand{
    return {
      type:'GET',
      path:'_all/_stats'
    }
  }
  public nodeStats():IEsCommand{
    return {
      type:'GET',
      path:'_nodes/stats/os,process,jvm,fs'
    }
  }

  public indices(): IEsCommand {
    return {
      type: 'GET',
      path: '_cat/indices?format=json',
    };
  }

  /**
   * 分页查询index内容
   * @param index
   * @param pageInfo
   * @param wheres
   */
  public page(index: string, wheres: IWhereParam[], pageInfo: IPage): IEsCommand {
    const { start, pageSize } = PageUtils.buildPage(pageInfo.page, pageInfo.pageSize);
    const query = this.queryBody(wheres);
    return {
      type: 'POST',
      path: `${index}/_search`,
      body: {
        from: start,
        size: pageSize,
        query: query,
      },
    };
  }

  /**
   * 获取index的结构
   * @param index
   */
  public mapping(index: string): IEsCommand {
    return {
      type: 'GET',
      path: `${index}/_mapping`,
    };
  }

  public delete(index: string, id: string): IEsCommand {
    return {
      type: 'DELETE',
      path: `${index}/_doc/${id}`,
    };

  }

  public postAdd(index: string, data: Object): IEsCommand {
    return {
      type: 'POST',
      path: `${index}/_doc`,
      body: data,
    };
  }

  public update(index: string, id: string, data: Object): IEsCommand {
    return {
      type: 'POST',
      path: `${index}/_update/${id}`,
      body: { doc: data },
    };
  }

  public queryBody(wheres: IWhereParam[]) {
    const matchList: Object[] = [];
    for (let item of wheres) {
      if (isNotEmpty(item.whereValue)) {
        switch (item.whereType) {
          case '<':
            matchList.push({
              range: { [item.columnKey]: { lt: item.whereValue } },
            });
            break;
          case '>':
            matchList.push({ range: { [item.columnKey]: { gt: item.whereValue } } });
            break;
          case '<>':
            matchList.push({
              must_not: [
                {
                  term: {
                    [item.columnKey]: item.whereValue,  // type != 'admin'
                  },
                }],
            });
            break;
          case '=':
            matchList.push({
              term: { [item.columnKey]: item.whereValue },
            });
            break;
          case 'like':
            matchList.push({
              match: {
                [item.columnKey]: item.whereValue,
              },
            });
            break;
        }
      }
    }
    if (wheres && wheres.length > 0) {
      return {
        bool: {
          must: matchList,
        },
      };
    }
    return {
      match_all: {},
    };

  }


}
