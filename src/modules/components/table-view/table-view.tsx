import React, { MouseEvent, useCallback, useMemo, useRef, useState } from 'react';
import styles from './table-view.module.less';
import { IFilterValue, TableViewProps } from './table-view.types';
import { TableViewHeader } from './table-view-header';
import { TableViewBody } from './table-view-body';
import { FixedSizeGrid } from 'react-window';
import { TableViewOption } from './table-view-option';
import { Cell } from './cell';
import cls from 'classnames';
import debounceUtil from '../../base/utils/debounce-util';
import { Loading } from '../loading';
import { DOWN_KEY, LEFT_KEY, RIGHT_KEY, TAB_KEY, UP_KEY } from '../../base/types/keys.types';
import { isOSX } from '@opensumi/ide-core-browser';
import { TableViewFilter } from './table-view-filter';
import { range } from '../../base/utils/number-util';
import { ISortColumn } from '../../components/table-editor';
import { IWhereParam } from '../../base/model/sql-param.model';

export const DEFAULT_COLUMN_WIDTH = 150;
export const DEFAULT_CELL_FIXED_LEFT_WIDTH = 40;
export const DEFAULT_OPTION_HEIGHT = 24;
export const DEFAULT_HEADER_HEIGHT = 22;

export const DEFAULT_FILTER_HEIGHT = 22;
//预留30的宽度，用来给最后一列的拖拽留出宽度
export const DEFAULT_TABLE_REST_WIDTH = 30;
//详情默认高度
export const DEFAULT_DETAIL_HEIGHT = 100;

export const TableView = (props: TableViewProps) => {
  const {
    tableWidth,
    tableHeight,

    dataType,
    data,
    style,
    cellStyle,
    columns,
    option,
    optionArgs,
    optionView,
    isLoading = false,
    showDetail = false,
    detailHeight = DEFAULT_DETAIL_HEIGHT,
    emptyTitle,
    onFilter,
    onFilterClose,
    onFilterOpen,
    onRefresh,
    onRowClick,
    onClick,
    sort,
  } = props;

  const [dataGridWidth, setDataGridWidth] = useState(0);
  const [columnWidthSetting, setColumnWidthSetting] = useState<number[]>([]);
  const [dragLineLeft, setDragLineLeft] = useState<number>(0);
  const [dragLineVisible, setDragLineVisible] = useState<boolean>(false);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [searchWord, setSearchWord] = useState<string>();
  const [selectedRowPosition, setSelectedRowPosition] = useState<number[]>();
  const [sortColumn, setSortColumn] = useState<ISortColumn>();
  const [isFilter, setIsFilter] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<{ row: number; column: number }>();
  const [filter, setFilter] = useState<Map<string, IFilterValue>>(new Map());
  const [selectedPosition, setSelectPosition] = useState<{
    rowStart: number;
    rowEnd: number;
    columnStart: number;
    columnEnd: number;
  }>();
  const [detailText, setDetailText] = useState<any>();
  //console.log('table-view----------', data)
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const bodyGridRef = useRef<FixedSizeGrid>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = useCallback(
    (_scrollLeft: number) => {
      const headTable = headerWrapRef.current;
      if (headTable) {
        //console.log('----handleBodyScroll:', _scrollLeft)
        headTable.scrollLeft = _scrollLeft;
        handleSetScroll(_scrollLeft);
      }
    },
    [headerWrapRef],
  );

  const handleSetScroll = useCallback(
    debounceUtil((_scrollLeft: number) => {
      setScrollLeft(_scrollLeft);
    }, 30),
    [],
  );

  const handleColumnWidth = useCallback((setting: number[], dataGridWidth: number) => {
    setColumnWidthSetting(setting);
    setDataGridWidth(dataGridWidth);
  }, []);

  const handleDragLineStart = useCallback(
    (left: number) => {
      left = left - scrollLeft;
      setDragLineLeft(left);
      setDragLineVisible(true);
    },
    [scrollLeft],
  );

  const handleDragLineStop = useCallback(() => {
    setDragLineVisible(false);
  }, []);

  const handleDragLine = useCallback(
    (left: number) => {
      left = left - scrollLeft;
      setDragLineLeft(left);
    },
    [scrollLeft],
  );

  const dragLineHeight = useMemo(() => {
    let dataOptionHeight = option ? DEFAULT_OPTION_HEIGHT : 0;
    return tableHeight - dataOptionHeight;
  }, [tableHeight]);

  //减去标题高度和分页高度
  const bodyHeight = useMemo(() => {
    let dataOptionHeight = option ? DEFAULT_OPTION_HEIGHT : 0;
    let filterInputHeight = isFilter ? DEFAULT_FILTER_HEIGHT : 0;
    let showDetailHeight = showDetail ? detailHeight : 0;
    return tableHeight - dataOptionHeight - DEFAULT_HEADER_HEIGHT - filterInputHeight - showDetailHeight;
  }, [tableHeight, isFilter, showDetail, detailHeight]);

  const handleSelectedRowPosition = useCallback((rowPosition: number[] | undefined) => {
    setSelectedRowPosition(rowPosition);
  }, []);

  const getPositionValue = useCallback(
    (rowIndex: number, columnIndex: number) => {
      const columnKey = columns[columnIndex]?.columnKey;
      const itemData = data[rowIndex];
      const value = dataType === 'Array' ? itemData : columnKey ? itemData[columnKey] : '';
      return value;
    },
    [columns, data, dataType],
  );

  const getCopyData = useCallback(() => {
    if (!selectedPosition) return;
    const text = range(selectedPosition.rowStart, selectedPosition.rowEnd)
      .map((i) =>
        range(selectedPosition.columnStart, selectedPosition.columnEnd)
          .map((j) => {
            const value = getPositionValue(selectedPosition.rowStart, selectedPosition.columnStart);
            return value;
          })
          .join('\t'),
      )
      .join('\n');

    return text;
  }, [selectedPosition, getPositionValue]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  const handleFilter = useCallback(() => {
    if (isFilter) {
      setIsFilter(false);
      if (onFilterClose) {
        onFilterClose();
      }
    } else {
      setIsFilter(true);
      if (onFilterOpen) {
        onFilterOpen();
      }
    }
  }, [isFilter]);

  const handleFilterSearch = useCallback(() => {
    //遍历filter，提交数据
    const filterData: IWhereParam[] = [];
    if (filter.size > 0) {
      filter.forEach((value, key) => {
        filterData.push({
          columnKey: key,
          columnType: value.columnType,
          whereValue: value.filterValue,
          whereType: value.filterType ? value.filterType : '=',
        });
      });
    }
    if (onFilter) {
      onFilter(filterData);
    }
  }, [isFilter, filter]);

  const handleSort = useCallback(
    (needSortColumn: string) => {
      let useSortColumn: ISortColumn | undefined = { column: needSortColumn, orderBy: 'desc' };
      if (sortColumn) {
        const { column, orderBy } = sortColumn;
        if (column === needSortColumn) {
          if (orderBy === 'desc') {
            useSortColumn.orderBy = 'asc';
          } else if (orderBy === 'asc') {
            //设置排序的列，如果传入undefined，就代表取消本列的排序
            useSortColumn = undefined;
          }
        }
      }
      if (sort) {
        sort(useSortColumn);
      }
      setSortColumn(useSortColumn);
    },
    [data, sortColumn],
  );

  const clearStat = useCallback(
    (clearSelectedCell: boolean = true, clearSelectedRow: boolean = true, clearEditing: boolean = true) => {
      clearSelectedCell && selectedPosition && setSelectPosition(undefined);
      clearSelectedRow && selectedRowPosition && handleSelectedRowPosition(undefined);
      if (clearEditing) {
        isEditing && setIsEditing(false);
        editingPosition && setEditingPosition(undefined);
      }
    },
    [selectedPosition, selectedRowPosition, editingPosition],
  );

  //设置单元格进入编辑状态
  const handleEditMode = useCallback(
    (rowIndex: number, columnIndex: number) => {
      setIsEditing(true);
      setEditingPosition({ row: rowIndex, column: columnIndex });
    },
    [columns],
  );

  const handleDoubleClick = useCallback(
    (ev: React.MouseEvent, rowIndex: number, columnIndex: number) => {
      ev.preventDefault();
      if (isEditing && editingPosition && rowIndex === editingPosition.row && columnIndex === editingPosition.column) {
        return;
      }
      clearStat(false, true, false);
      handleEditMode(rowIndex, columnIndex);
    },
    [isEditing, editingPosition, handleEditMode, clearStat],
  );

  const handleClick = useCallback(
    (ev: React.MouseEvent, rowIndex: number, columnIndex: number) => {
      if (isEditing && editingPosition && rowIndex === editingPosition.row && columnIndex === editingPosition.column) {
        return;
      }
      if (onClick) {
        const clickValue = getPositionValue(rowIndex, columnIndex);
        onClick(clickValue);
      }
      //单击后，清空编辑状态（非单击），清空--行--选中状态，
      clearStat(false, true, true);
      //已选中的进行点击，进如编辑态
      if (selectedPosition && rowIndex === selectedPosition.rowStart && columnIndex === selectedPosition.columnStart) {
        handleEditMode(rowIndex, columnIndex);
      } else {
        setSelectPosition({ rowStart: rowIndex, rowEnd: rowIndex, columnStart: columnIndex, columnEnd: columnIndex });
        setDetailText(getPositionValue(rowIndex, columnIndex));
      }
    },
    [isEditing, editingPosition, selectedPosition, handleEditMode, getPositionValue, clearStat, onClick],
  );

  const handleRowClick = useCallback(
    (ev: MouseEvent, rowIndex: number) => {
      if (!selectedRowPosition) clearStat();
      const shiftMask = hasShiftMask(ev);
      const ctrlCmdMask = hasCtrlCmdMask(ev);
      if (onRowClick) {
        onRowClick(data[rowIndex]);
      }

      if (shiftMask) {
        //获取上次点击的位置，计算一个范围
        if (selectedRowPosition && selectedRowPosition.length > 0) {
          let lastClickRow = selectedRowPosition[selectedRowPosition.length - 1];
          let selectedRange = range(lastClickRow, rowIndex);
          handleSelectedRowPosition([...selectedRowPosition, ...selectedRange]);
          return;
        }
      } else if (ctrlCmdMask) {
        if (selectedRowPosition && selectedRowPosition.length > 0) {
          handleSelectedRowPosition([...selectedRowPosition, rowIndex]);
          return;
        }
      }
      handleSelectedRowPosition([rowIndex]);
    },
    [selectedRowPosition, data, clearStat],
  );

  const hasShiftMask = useCallback((event): boolean => {
    // Ctrl/Cmd 权重更高
    if (hasCtrlCmdMask(event)) {
      return false;
    }
    return event.shiftKey;
  }, []);

  const hasCtrlCmdMask = useCallback((event): boolean => {
    const { metaKey, ctrlKey } = event;
    return (isOSX && metaKey) || ctrlKey;
    //return ctrlKey;
  }, []);

  const isSelected = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!selectedPosition) {
        return false;
      }
      const { rowStart, columnStart, rowEnd, columnEnd } = selectedPosition;
      const posX = columnIndex >= columnStart && columnIndex <= columnEnd!;
      const negX = columnIndex <= columnStart && columnIndex >= columnEnd!;
      const posY = rowIndex >= rowStart && rowIndex <= rowEnd!;
      const negY = rowIndex <= rowStart && rowIndex >= rowEnd!;
      return (posX && posY) || (negX && posY) || (negX && negY) || (posX && negY);
    },
    [selectedPosition],
  );

  const isSelectedRow = useCallback(
    (rowIndex: number) => {
      if (!selectedRowPosition) {
        return false;
      }
      return selectedRowPosition.includes(rowIndex)!!;
    },
    [selectedRowPosition],
  );

  const isEditor = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!editingPosition) {
        return false;
      }
      if (rowIndex === editingPosition.row && columnIndex === editingPosition.column) {
        return true;
      }
      return false;
    },
    [editingPosition],
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.isPropagationStopped && e.isPropagationStopped()) {
      return;
    }
    const ctrlKeyPressed = e.ctrlKey || e.metaKey;
    if (!selectedPosition || ctrlKeyPressed) {
      return;
    }
    //移动选中表格位置
    handleKeyboardCellMovement(e);
  };

  const handleKeyboardCellMovement = (e) => {
    if (!e || !selectedPosition) {
      return;
    }
    const totalRow = data.length;
    const totalColumn = columns.length;
    const { rowStart, columnStart } = selectedPosition;
    const keyCode = e.which || e.keyCode;
    if (keyCode === TAB_KEY) {
      if (columnStart + 1 < totalColumn) {
        setSelectPosition({
          rowStart: rowStart,
          rowEnd: rowStart,
          columnStart: columnStart + 1,
          columnEnd: columnStart + 1,
        });
      } else if (rowStart + 1 < totalRow) {
        setSelectPosition({
          rowStart: rowStart + 1,
          rowEnd: rowStart + 1,
          columnStart: 0,
          columnEnd: 0,
        });
      }
      e.preventDefault();
    } else if (keyCode === RIGHT_KEY) {
      if (columnStart + 1 < totalColumn) {
        setSelectPosition({
          rowStart: rowStart,
          rowEnd: rowStart,
          columnStart: columnStart + 1,
          columnEnd: columnStart + 1,
        });
      }
      e.preventDefault();
    } else if (keyCode === LEFT_KEY) {
      if (columnStart - 1 >= 0) {
        setSelectPosition({
          rowStart: rowStart,
          rowEnd: rowStart,
          columnStart: columnStart - 1,
          columnEnd: columnStart - 1,
        });
      }
      // e.preventDefault();
    } else if (keyCode === UP_KEY) {
      if (rowStart - 1 >= 0) {
        setSelectPosition({
          rowStart: rowStart - 1,
          rowEnd: rowStart - 1,
          columnStart: columnStart,
          columnEnd: columnStart,
        });
      }
      // e.preventDefault();
    } else if (keyCode === DOWN_KEY) {
      if (rowStart + 1 < totalRow) {
        setSelectPosition({
          rowStart: rowStart + 1,
          rowEnd: rowStart + 1,
          columnStart: columnStart,
          columnEnd: columnStart,
        });
      }
    }
    //e.preventDefault();
  };

  const onClickDataOutSide = useCallback(() => {
    //clearStat(true, true, true);
  }, [clearStat]);

  const renderDataRow = useCallback(
    (rowIndex: number) => {
      let columnList: any = [];
      const rowData = data[rowIndex];
      // console.log('table-view - rowData---->', rowData, ';isSimpleData:', dataType)
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const columnKey = columns[columnIndex]?.columnKey;
        const cellData = dataType === 'Array' ? rowData : columnKey ? rowData[columnKey] : '';
        columnList.push(
          <Cell
            key={`${rowIndex}-${columnIndex}`}
            data={cellData}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            searchWord={searchWord}
            width={columnWidthSetting[columnIndex]}
            isSelected={isSelected(rowIndex, columnIndex)}
            isEditor={isEditor(rowIndex, columnIndex)}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            style={cellStyle}
          />,
        );
      }
      return columnList;
    },
    [
      data,
      columns,
      searchWord,
      columnWidthSetting,
      isSelected,
      selectedPosition,
      selectedRowPosition,
      editingPosition,
      isEditing,
    ],
  );

  const renderRow = useCallback(
    ({ columnIndex, rowIndex, style }) => {
      //console.log('renderRow---->', rowIndex)

      let columnView = renderDataRow(rowIndex);

      const classNames = cls(
        styles['row-data'],
        styles['row-data-hover'],
        isSelectedRow(rowIndex) && styles['row-selected'],
      );
      return (
        <div
          key={`${rowIndex}`}
          className={classNames}
          style={{ ...style, width: dataGridWidth - DEFAULT_TABLE_REST_WIDTH + 'px' }}
        >
          <div
            className={cls(
              styles.cell,
              styles['read-only'],
              styles['row-handle'],
              styles['cell-fixed-left'],
              isSelectedRow(rowIndex) && styles['row-handle-selected'],
            )}
            style={{ left: '0px' }}
            onClick={(ev) => handleRowClick(ev, rowIndex)}
          >
            {rowIndex + 1}
          </div>
          {columnView}
        </div>
      );
    },
    [columns, data, dataGridWidth, isSelectedRow, isEditor, renderDataRow, handleRowClick],
  );

  const renderFilter = useCallback(() => {
    return isFilter ? (
      <TableViewFilter
        columns={columns}
        dataGridWidth={dataGridWidth}
        columnWidths={columnWidthSetting}
        filter={filter}
        setFilter={(filter) => {
          setFilter(new Map(filter));
        }}
      />
    ) : null;
  }, [columns, isFilter, filter]);

  return (
    <div className={styles['table-view-container']} style={style}>
      <div style={{ width: tableWidth + 'px' }}>
        {option ? (
          <TableViewOption
            {...optionArgs}
            optionView={optionView}
            setSearchWord={setSearchWord}
            enableFilterSearch={isFilter}
            onRefresh={handleRefresh}
            onFilter={handleFilter}
            onFilterSearch={handleFilterSearch}
          />
        ) : null}
      </div>

      <div className={styles['table-view-content']}>
        <Loading isLoading={isLoading} />
        <div
          className={styles['drag-line']}
          style={{
            height: `${dragLineHeight}px`,
            visibility: dragLineVisible ? 'visible' : 'hidden',
            left: `${dragLineLeft}px`,
          }}
        ></div>
        <div className={styles['table-view-header-container']} style={{ width: tableWidth + 'px' }} ref={headerWrapRef}>
          <TableViewHeader
            columns={columns}
            sortColumn={sortColumn}
            handleColumnWidth={handleColumnWidth}
            onDragLine={handleDragLine}
            onDragLineStart={handleDragLineStart}
            onDragLineStop={handleDragLineStop}
            sort={handleSort}
          />
          {renderFilter()}
        </div>

        <div className={styles['table-view-body-container']} tabIndex={0} ref={bodyContainerRef} onKeyDown={handleKey}>
          <TableViewBody
            width={tableWidth}
            height={bodyHeight}
            data={data}
            dataGridWidth={dataGridWidth}
            rowCount={data.length}
            onScroll={handleBodyScroll}
            bodyGridRef={bodyGridRef}
            renderRow={renderRow}
            onClickDataOutSide={onClickDataOutSide}
            emptyTitle={emptyTitle}
          />
        </div>
        {showDetail && (
          <div
            className={styles['table-view-detail-container']}
            style={{ width: tableWidth - DEFAULT_TABLE_REST_WIDTH, height: detailHeight }}
          >
            <textarea className={styles['click-cell-detail']} value={detailText} />
          </div>
        )}
      </div>
    </div>
  );
};
