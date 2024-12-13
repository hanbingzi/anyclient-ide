import React, { useCallback, useEffect, useState } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import styles from './table-editor.module.less';
import cls from 'classnames';
import './resize_able.less';
import { ISortColumn, ITableColumn } from './table-editor.types';
import { VscTriangleDown, VscTriangleUp } from 'react-icons/vsc';
import { DEFAULT_CELL_FIXED_LEFT_WIDTH, DEFAULT_COLUMN_WIDTH } from './constant';
import { FontTypeIcon } from '../../icons/font';
import { Key } from '../../icons/node';

export interface TableHeaderProps {
  canSort?: boolean;
  columns: ITableColumn[];
  sortColumn?: ISortColumn;
  // tableHeight:number;
  //是否展示列类型的图标
  showTitleTypeIcon?: boolean;
  handleColumnWidth: (setting: number[], dataGridWidth: number) => void;
  onDragLineStart: (left: number) => void;
  onDragLineStop: () => void;
  onDragLine: (left: number) => void;
  sort: (column: string) => void;
}

export interface ITableColumnSettings {
  width: number;
  fixed?: boolean;
  key: string;
}

export const TableHeader = (props: TableHeaderProps) => {
  const {
    columns,
    sortColumn,
    handleColumnWidth,
    onDragLine,
    onDragLineStart,
    onDragLineStop,
    sort,
    canSort,
    showTitleTypeIcon = false,
  } = props;
  const [dataGridWidth, setDataGridWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [columnSettings, setColumnSettings] = useState<Map<string, ITableColumnSettings>>(new Map());
  useEffect(() => {
    let _columnWidths: number[] = [];
    let _columnSettings: Map<string, ITableColumnSettings> = new Map();
    let needUpdateColumn = false;
    if (!columnWidths || columnWidths.length === 0) {
      needUpdateColumn = true;
      console.log('初始化列宽度，我会运行几次---》1--');
    } else {
      //表格展示顺序或者添加了列等情况，
      const originalColumnJoin = columns.map((item) => item.columnKey).join('-');
      const newColumnJoin = Array.from(columnSettings.keys()).join('-');
      if (originalColumnJoin !== newColumnJoin) {
        console.log('初始化列宽度，我会运行几次---》2--');
        needUpdateColumn = true;
      }
    }
    if (needUpdateColumn) {
      columns.forEach((item) => {
        const columnKey = item.columnKey;
        let columnWidth = 0;
        if (columnSettings.has(columnKey)) {
          columnWidth = columnSettings.get(columnKey).width;
        } else if (item.width) {
          columnWidth = item.width;
        } else {
          const columnWordLength = item.title.length;
          const calcColumnWidth = columnWordLength * 8 + 28;
          columnWidth = DEFAULT_COLUMN_WIDTH > calcColumnWidth ? DEFAULT_COLUMN_WIDTH : calcColumnWidth;
        }
        _columnWidths?.push(columnWidth);
        _columnSettings.set(columnKey, { key: columnKey, width: columnWidth });
      });
      setColumnWidths(_columnWidths);
      let _dataGridWidth = calcDataGridWidth(_columnWidths);
      //console.log('table header:',_dataGridWidth)
      setDataGridWidth(_dataGridWidth);
      setColumnSettings(_columnSettings);
      handleColumnWidth(_columnWidths, _dataGridWidth);
    }
  }, [columns]);

  const calcDataGridWidth = useCallback((_columnWidths: number[]): number => {
    let _dataGridWidth = DEFAULT_CELL_FIXED_LEFT_WIDTH; // 初始宽度包含操作列
    _columnWidths?.forEach((item) => {
      _dataGridWidth += item;
    });
    return _dataGridWidth + 30;
  }, []);

  const caleDragLineLeft = useCallback((_columnWidths: number[], columnIndex: number): number => {
    let caleColumnWidths = _columnWidths.slice(0, columnIndex + 1);
    return caleColumnWidths?.reduce(
      (total, currentValue, index) => (total += currentValue),
      DEFAULT_CELL_FIXED_LEFT_WIDTH,
    );
  }, []);

  const onResize = (index: number, { node, size, handle }: ResizeCallbackData) => {
    // 计算效率还可以再提高
    let cloneColumnWidths = [...columnWidths];
    cloneColumnWidths[index] = size.width;
    let _dataGridWidth = calcDataGridWidth(cloneColumnWidths);
    setDataGridWidth(_dataGridWidth);
    setColumnWidths(cloneColumnWidths);
    let dragLineLeft = caleDragLineLeft(cloneColumnWidths, index);
    // console.log('draglineLeft:', dragLineLeft, ';index:', index)
    onDragLine(dragLineLeft);
  };

  const onResizeStart = (index: number) => {
    let dragLineLeft = caleDragLineLeft(columnWidths, index);
    onDragLineStart(dragLineLeft);
  };

  const onResizeStop = () => {
    handleColumnWidth(columnWidths, dataGridWidth);
    onDragLineStop();
  };

  const handleSort = (column: string) => {
    sort(column);
  };

  const renderSortIcon = useCallback(
    (column: string) => {
      let sortCls;
      let upCls;
      let downCls;
      if (sortColumn && sortColumn.column === column) {
        const { orderBy } = sortColumn;
        sortCls = cls(styles['cell-sort-icon'], styles['sort-icon-show']);
        upCls = cls(styles['cell-sort-icon-up'], { [styles['on-sort']]: orderBy === 'desc' });
        downCls = cls(styles['cell-sort-icon-down'], { [styles['on-sort']]: orderBy === 'asc' });
      } else {
        sortCls = styles['cell-sort-icon'];
        upCls = styles['cell-sort-icon-up'];
        downCls = styles['cell-sort-icon-down'];
      }
      return (
        <div className={sortCls} onClick={() => handleSort(column)}>
          <span className={upCls}>
            <VscTriangleUp />
          </span>
          <span className={downCls}>
            <VscTriangleDown />
          </span>
        </div>
      );
    },
    [sortColumn],
  );

  return (
    <div className={cls(styles['data-grid-container'])} style={{ width: `${dataGridWidth}px` }}>
      <div className={cls(styles['row-data'])}>
        <div
          className={cls(
            styles.cell,
            styles['read-only'],
            styles['row-handle'],
            styles['cell-fixed-left'],
            styles['cell-title'],
          )}
          style={{ left: '0px' }}
        ></div>
        {columns.map(({ title, columnKey, tooltip, isPrimary, dataType }, index) => (
          <Resizable
            key={`resize-${index}`}
            width={columnWidths[index]}
            height={0}
            onResize={(ev, data) => onResize(index, data)}
            onResizeStart={() => onResizeStart(index)}
            onResizeStop={() => onResizeStop()}
          >
            {/*<Tooltip title={tooltip ? tooltip : ''} mouseLeaveDelay={0} placement={"bottom"}>*/}
            <div
              key={`${index}-${columnKey}`}
              style={{ width: `${columnWidths[index]}px` }}
              className={cls(styles.cell, styles['read-only'], styles['cell-title'])}
              title={tooltip}
            >
              {isPrimary ? (
                <div className={styles['cell-header-icon']}>
                  <Key />
                </div>
              ) : showTitleTypeIcon ? (
                <div className={styles['cell-header-icon']}>
                  <FontTypeIcon fontType={dataType!} />
                </div>
              ) : null}
              {title}
              {canSort ? renderSortIcon(columnKey) : null}
            </div>
            {/*</Tooltip>*/}
          </Resizable>
        ))}
      </div>
    </div>
  );
};
