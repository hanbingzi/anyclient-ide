import React, { CSSProperties, ReactNode } from 'react';
import { PaginationProps } from '../pagination';
import { FixedSizeGrid } from 'react-window';
import { TableInstance } from './hook/useTable';
import { DataInputEnum } from '../../base/types/edit-input.types';
import { WhereType } from '../../base/types/sql.types';
import { IWhereParam } from '../../base/model/sql-param.model';

export type BaseSorter = (
  a?: string | number | boolean | undefined,
  b?: string | number | boolean | undefined,
) => number;

export type OrderByTypes = 'asc' | 'desc';
//修改  新增
export type DataOptionTypes = 'update' | 'add' | 'remove' | 'up' | 'down';

export interface ISqlFile {
  length?: number;
  /**
   * 名称
   */
  name?: string;
  /**
   * 类型
   * blob
   * clob
   * bytes
   */
  type?: string;
  data?: string;
}

//被修改的数据
export interface IDeriveData {
  //未被修改的原始数据
  originalData: ITableRow;
  //被修改的列<修改的列名，修改后的值>
  updateRow: Map<string, any>;
}

//

//从新排序的数据
export interface ISortData {
  //在数据中排在第几位
  order?: number;
  //排序的数据的前一个
  beforeKey: string | number;
  //数据初始化的前一个
  initialBeforeKey?: string | number;
  //被排序的数据,每个key中途可能发生过更改
  sortKey: string | number;
  sortData: ITableRow;
}

export interface IUpdateCell {
  rowId: string;
  columnIndex?: number;
  columnKey?: string;
  newValue?: string | number | undefined;
  // oldValue?: string | number | undefined;
  lastValue?: string | number | undefined;
  fromIndex?: number;
  //option可以不填，系统会自动拍段
  option?: DataOptionTypes;
}

export interface IUpdateRecord {
  updateInfo: IUpdateCell[];
}

export interface ISelectOption {
  label: string;
  value: string;
}

export type InputType = 'input' | 'select' | 'selectInput' | 'checkbox' | 'file';

export interface ITableColumn {
  //表格表头中文名或英文名
  title: string;
  /**
   * 提示信息，
   */
  tooltip?: string;
  //从data里面取数据的key
  columnKey: string;
  width?: number;
  openEditMode?: 'click' | 'doubleClick';
  sorter?: BaseSorter;
  /**
   * 是否可以编辑
   */
  disableEdit?: boolean;
  /**
   * 显示直接编辑框，比如checkbox
   * 这样就不用双击才可以编辑
   */
  showEdit?: boolean;
  /**
   * 编辑时的输入类型
   */
  inputType?: InputType;
  /**
   * 显示的数据类型
   */
  dataType?: DataInputEnum; //'string' | 'number' | 'date' | 'time' | 'datetime' | 'year' | 'timestamp'
  selectGroup?: ISelectOption[];
  selectTags?: boolean; //selectTags select是否可以多选
  //本列数据是否允许为空，默认YES
  nullAble?: 'YES' | 'NO';
  defaultValue?: string | number;

  isPrimary?: boolean;
  render?: (cellData: CellDataProps) => React.ReactNode;
  /**
   * 字体显示方位，默认right
   */
}

export interface ITableRow {
  [key: string | number]: any;

  //[key: number]: any;
}

export interface IUpdateDataResult {
  data?: ITableRow[];
  updateData?: Set<IDeriveData>;
  addData?: Set<Map<string, any>>;
  removeData?: ITableRow[];
  sortData?: ISortData[];
}

export interface TableEditorProps {
  tableWidth: number;
  tableHeight: number;
  columns: ITableColumn[];
  data: ITableRow[];

  /**
   * 表格样式
   */
  style?: CSSProperties;
  /**
   * 单元格样式
   */
  cellStyle?: CSSProperties;

  //排序或者删除时，需要从数据里面提取出来的key
  primaryKey?: string;
  //是否展示分页
  pagination?: false | PaginationProps;
  //
  table?: TableInstance;
  option?: boolean;
  optionArgs?: DataOptionBase;
  //自定义展示的option内容
  optionView?: IOptionView;
  isLoading?: boolean;
  //删除的数据直接作用于后端，无法撤回
  immediateRemove?: boolean;
  //当数据为空时，第一行展示位编辑行
  firstRowIsEdit?: boolean;
  //是否展示列类型的图标
  showTitleTypeIcon?: boolean;
  /**
   *
   */
  menuOption?: false | IMenuOption;
  /**
   * clearSelectedRow 会导致删除不可用，如果没有删除的操作，才可以开启，
   * 具体原因：点击删除按钮是，会优先清除选中的行，在执行删除，导致删除时，找不到选中的行
   */
  clickOutSideClear?: { clearSelectedRow: boolean; clearSelectedCell: boolean };
  emptyTitle?: string;
  showEmptyLine?: boolean;
  onAdd?: () => void;
  onRemove?: (removeData: ITableRow[]) => Promise<boolean>;
  onSave?: (updateData: IUpdateDataResult) => Promise<boolean>;
  onRefresh?: () => Promise<boolean>;
  onFilter?: (filterData: IWhereParam[]) => void;
  onFilterClose?: () => void;
  onFilterOpen?: () => void;
  onDataChange?: (updateData?: IUpdateCell[]) => void;
  onRevert?: () => void;
  onUpRow?: (rowIndex: number) => boolean;
  onDownRow?: (rowIndex: number) => boolean;

  onClick?: (cellData: any) => void;
  onRowClick?: (rowData: IClickCellData[][]) => void;

  //设置排序的列，如果传入undefined，就代表取消本列的排序
  sort?: (sortColumn: ISortColumn | undefined) => void;
}

export interface IOptionView {
  location: 'start' | 'end' | 'afterSearch';
  view: ReactNode;
}

export interface DataOptionBase {
  /**
   * 显示搜索框
   */
  search?: boolean;
  /**
   * 显示+按钮
   */
  add?: boolean;
  /**
   * 显示删除按钮
   */
  remove?: boolean;
  /**
   * 是否允许修改
   */
  update?: boolean;
  /**
   * 显示保存按钮
   */
  save?: boolean;
  /**
   * 显示撤销按钮
   */
  revert?: boolean;
  /**
   * 显示刷新按钮
   */
  refresh?: boolean;
  /**
   * 显示过滤数据按钮
   */
  filter?: boolean;
  /**
   * 取消所有修改
   */
  cancel?: boolean;
  /**
   * 显示向上排序按钮
   */
  upRow?: boolean;
  /**
   * 显示向下排序按钮
   */
  downRow?: boolean;


}

export interface DataOptionProps extends DataOptionBase {

  enableRemove?: boolean;
  enableSave?: boolean;
  enableRevert?: boolean;
  enableCancel?: boolean;
  enableUpRow?: boolean;
  enableDownRow?: boolean;
  enableFilterSearch?: boolean;

  optionView?: IOptionView;
  setSearchWord: (word: string) => void;
  onAdd?: () => void;
  onRemove: () => void;
  onSave?: () => void;
  onRevert?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  onFilter?: () => void;
  onFilterSearch?: () => void;
  onUpRow?: () => void;
  onDownRow?: () => void;
}

export type ISelectMenuData = {
  row?: { rowIds: string[]; rows: ITableRow[] };
  cell?: { rowId: string; columnIndex: number; data: any };
};

export interface ISelectedPosition {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface IMenu {
  label: string;
  visible?: boolean;
  onClick: (args?: ISelectMenuData) => void;
}

export interface IMenuOption {
  //删除一行
  removeRow?: boolean;
  //添加一行，包括（在上方插入一行，在下方插入一行）
  insertRow?: boolean;
  //
  copyRow?: boolean;
  //
  //
  pasteRow?: boolean;

  refresh?: boolean;

  customMenu?: IMenu[][];
}

export interface ISortColumn {
  column: string;
  orderBy: OrderByTypes;
}

export interface TableBodyProps {
  width: number;
  height: number;
  data: ITableRow[];
  //触发表格编辑模式
  dataGridWidth: number;
  rowCount: number;
  emptyTitle?: string;
  showEmptyLine?: boolean;
  onClickDataOutSide: () => void;
  //onScroll?: ((props: GridOnScrollProps) => any) | undefined;
  onScroll: (scrollLeft: number) => void;
  bodyGridRef: React.RefObject<FixedSizeGrid>;
  renderRow: ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: CSSProperties }) => any;
}

export interface ICellBase {
  rowId: string;
  rowIndex: number; //循环标记使用
  columnIndex: number; //循环标记使用
  style?: React.CSSProperties;
  column: ITableColumn;

  //coll?: number;
  data?: string | number | undefined;
  initialValue?: string | number | undefined;
  width: number;
  isEditor?: boolean;
  isSelected?: boolean;
  isModified?: boolean;
  isAdd?: boolean;
  isError?: boolean;
  searchWord?: string;
}

export interface CellProps extends ICellBase {
  // onClick?: (ev: React.MouseEvent, rowIndex: number, columnIndex: number) => void;
  onDoubleClick?: (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => void;
  onClick?: (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => void;
  onMouseDown?: (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => void;
  onMouseOver?: (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => void;
  //onChange?: (rowId: string, rowIndex: number, columnIndex: number, cell: IUpdateCell) => void;
  onCommit?: (cells?: IUpdateCell[], ev?: React.KeyboardEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  //当前编辑的数值，用于缓存提交
}

export interface CellDataProps {
  value?: string | number | any;
  //此单元格最初的数据格式
  initialValue?: string | number;
  column?: ITableColumn;
  columnKey: string;
  rowId: string;
  rowIndex: number;
  columnIndex: number;
  //此单元格是否处于新增行
  isAdd?: boolean;
  //是否是正在编辑此单元格
  isEditor?: boolean;
  width?: number;
  searchWord?: string;
  // onChange?: (rowId: string, rowIndex: number, columnIndex: number, cell: IUpdateCell) => void;
  multiCommit?: (cells?: IUpdateCell[], ev?: React.KeyboardEvent) => void;
  commit?: (newValue: any, e?: React.KeyboardEvent) => void;
  onEditorCurrentValue?: (newValue: string) => void;
}

export type ScrollDirection = 'forward' | 'backward';

export interface ListOnScrollProps {
  scrollDirection: ScrollDirection;
  scrollOffset: number;
  scrollUpdateWasRequested: boolean;
}

export interface ITempInputValue {
  rowIndex: number;
  columnIndex: number;
  newValue: string | number;
}

export interface IFilterValue {
  columnType?: DataInputEnum;
  filterValue?: string;
  filterType?: WhereType;
}

export interface IClickCellData {
  originValue?: any;
  lastValue: any;
  columnKey: string;
  column: ITableColumn;
}
