import React, { MouseEvent, useCallback, useMemo, useRef, useState } from 'react';
import styles from './list-view.module.less';
import { IFilterValue, ListViewProps } from './list-view.types';
import { ListViewBody } from './list-view-body';
import { FixedSizeGrid } from 'react-window';
import { ListViewOption } from './list-view-option';
import { Row } from './row';
import cls from 'classnames';
import { Loading } from '../loading';
import { DOWN_KEY, UP_KEY } from '../../base/types/keys.types';
import { isOSX } from '@opensumi/ide-core-browser';
import { ListFilter } from './list-filter';
import { range } from '../../base/utils/number-util';

export const DEFAULT_OPTION_HEIGHT = 24;
export const DEFAULT_HEADER_HEIGHT = 22;

export const DEFAULT_FILTER_HEIGHT = 22;

export const ListView = (props: ListViewProps) => {
  const {
    tableWidth,
    dataWidth,
    tableHeight,
    dataType,
    data,
    style,
    columnKey,
    option,
    optionArgs,
    isLoading = false,
    onFilter,
    onFilterClose,
    onFilterOpen,
    onRefresh,
  } = props;

  const [searchWord, setSearchWord] = useState<string>();
  const [selectedRowPosition, setSelectedRowPosition] = useState<number[]>();
  const [isFilter, setIsFilter] = useState<boolean>(false);
  const [filter, setFilter] = useState<IFilterValue>({});

  const headerWrapRef = useRef<HTMLDivElement>(null);
  const bodyGridRef = useRef<FixedSizeGrid>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  //减去标题高度和分页高度
  const bodyHeight = useMemo(() => {
    let dataOptionHeight = option ? DEFAULT_OPTION_HEIGHT : 0;
    let filterInputHeight = isFilter ? DEFAULT_FILTER_HEIGHT : 0;
    return tableHeight - dataOptionHeight - DEFAULT_HEADER_HEIGHT - filterInputHeight;
  }, [tableHeight, isFilter]);

  const bodyWidth = useMemo(() => {
    if (dataWidth && dataWidth > tableWidth) {
      return dataWidth;
    }
    return tableWidth;
  }, [tableWidth, dataWidth]);

  const handleSelectedRowPosition = useCallback((rowPosition: number[] | undefined) => {
    //从新排序
    setSelectedRowPosition(rowPosition);
  }, []);

  const getPositionValue = useCallback(
    (rowIndex: number) => {
      const itemData = data[rowIndex];
      const value = dataType === 'Array' ? itemData : columnKey ? itemData[columnKey] : '';
      return value;
    },
    [data, dataType],
  );

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
    const filterData = {
      columnKey,
      filterValue: filter?.filterValue,
      filterType: filter?.filterType ? filter.filterType : '=',
    };
    if (onFilter) {
      onFilter(filterData);
    }
  }, [isFilter, filter]);

  const clearStat = useCallback(
    (clearSelectedRow: boolean = true) => {
      clearSelectedRow && selectedRowPosition && handleSelectedRowPosition(undefined);
    },
    [selectedRowPosition],
  );

  const handleDoubleClick = useCallback(
    (ev: React.MouseEvent, rowIndex: number, columnIndex: number) => {
      ev.preventDefault();

      clearStat();
      //
    },
    [clearStat],
  );

  const handleRowClick = useCallback(
    (ev: MouseEvent, rowIndex: number) => {
      if (!selectedRowPosition) clearStat();
      const shiftMask = hasShiftMask(ev);
      const ctrlCmdMask = hasCtrlCmdMask(ev);

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
    [selectedRowPosition],
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

  const isSelectedRow = useCallback(
    (rowIndex: number) => {
      if (!selectedRowPosition) {
        return false;
      }
      return selectedRowPosition.includes(rowIndex)!!;
    },
    [selectedRowPosition],
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.isPropagationStopped && e.isPropagationStopped()) {
      return;
    }
    const ctrlKeyPressed = e.ctrlKey || e.metaKey;
    if (!selectedRowPosition || ctrlKeyPressed) {
      return;
    }
    //移动选中表格位置
    handleKeyboardCellMovement(e);
  };

  const handleKeyboardCellMovement = (e) => {
    if (!e || !selectedRowPosition) {
      return;
    }
    const totalRow = data.length;
    const rowStart = selectedRowPosition[0];
    const keyCode = e.which || e.keyCode;
    if (keyCode === UP_KEY) {
      if (rowStart - 1 >= 0) {
        setSelectedRowPosition([rowStart - 1]);
      }
      // e.preventDefault();
    } else if (keyCode === DOWN_KEY) {
      if (rowStart + 1 < totalRow) {
        setSelectedRowPosition([rowStart + 1]);
      }
    }
    //e.preventDefault();
  };

  const onClickDataOutSide = useCallback(() => {
    clearStat(true);
  }, [clearStat]);

  const renderRow = useCallback(
    ({ rowIndex, style }) => {
      const rowValue = getPositionValue(rowIndex);
      const classNames = cls(
        styles['row'],
        styles['row-data-hover'],
        isSelectedRow(rowIndex) && styles['row-selected'],
      );
      return (
        <div
          key={`${rowIndex}`}
          className={classNames}
          style={{ ...style, width: bodyWidth + 'px' }}
          onClick={(ev) => handleRowClick(ev, rowIndex)}
        >
          <Row rowIndex={rowIndex} data={rowValue} searchWord={searchWord} width={bodyWidth} />
        </div>
      );
    },
    [data, , isSelectedRow, handleRowClick],
  );

  const renderFilter = useCallback(() => {
    return isFilter ? (
      <ListFilter columnKey={columnKey} dataGridWidth={bodyWidth} filter={filter} setFilter={setFilter} />
    ) : null;
  }, [isFilter, filter]);

  return (
    <div className={styles['list-view-container']} style={style}>
      <div style={{ width: tableWidth + 'px' }}>
        <ListViewOption
          {...optionArgs}
          setSearchWord={setSearchWord}
          enableFilterSearch={isFilter}
          onRefresh={handleRefresh}
          onFilter={handleFilter}
          onFilterSearch={handleFilterSearch}
        />
      </div>

      <div className={styles['list-view-content']}>
        <Loading isLoading={isLoading} />

        <div className={styles['list-view-header-container']} style={{ width: tableWidth + 'px' }} ref={headerWrapRef}>
          <div className={cls(styles['data-grid-container'])} style={{ width: `${bodyWidth}px` }}>
            <div className={cls(styles['row'], styles['row-title'])}>测试标题</div>
          </div>
          {renderFilter()}
        </div>

        <div className={styles['list-view-body-container']} tabIndex={0} ref={bodyContainerRef} onKeyDown={handleKey}>
          <ListViewBody
            width={tableWidth}
            height={bodyHeight}
            dataGridWidth={bodyWidth}
            data={data}
            rowCount={data.length}
            //onScroll={handleBodyScroll}
            bodyGridRef={bodyGridRef}
            renderRow={renderRow}
            onClickDataOutSide={onClickDataOutSide}
          />
        </div>
      </div>
    </div>
  );
};
