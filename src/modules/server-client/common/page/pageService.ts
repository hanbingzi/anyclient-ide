export class PageModel {
  /**
   * 页码
   */
  page: number;
  /**
   * 每页多少条
   */
  pageSize: number;
  /**
   * 开始页
   */
  start: number;
  /**
   * 结束页
   */
  end: number;
}

export interface IPageService {
  /**
   * build page sql
   * @param sql
   * @param page
   * @param pageSize
   * @return paginationSql
   */
  buildSql(sql: string, page?: number, pageSize?: number): string;

  buildTable(table: string, page?: number, pageSize?: number): string;

  //getPageSize(sql: string): number;
}

export class PageUtils {
  public static buildPage(page?: number, pageSize?: number): PageModel {
    if (!page) {
      page = 1;
    }
    if (!pageSize) {
      pageSize = 100;
    }
    let start = (page - 1) * pageSize;
    let end = start + pageSize;
    return { page, pageSize, start, end };
  }

  // public getPageSize(sql: string): number {
  //     const limitBlock = sql.match(this.pageMatch())
  //     if (limitBlock) {
  //         return parseInt(limitBlock[1])
  //     }
  //     return 100;
  // }
  //
  // protected pageMatch() {
  //     return /limit\s*(\d+)/i;
  // }
}
