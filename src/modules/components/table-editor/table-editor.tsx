import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './table-editor.module.less';
import {
  IClickCellData,
  IDeriveData,
  IFilterValue,
  ISelectedPosition,
  ISortColumn,
  ISortData,
  ITableRow,
  ITempInputValue,
  IUpdateCell,
  IUpdateRecord,
  TableEditorProps,
} from './table-editor.types';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { FixedSizeGrid } from 'react-window';
import { Pagination } from '../pagination';
import { TableOption } from './table-option';
import { Cell } from './cell';
import cls from 'classnames';
import debounceUtil from '../../base/utils/debounce-util';
import { Loading } from '../loading';
import {
  BACKSPACE_KEY,
  DELETE_KEY,
  DOWN_KEY,
  ENTER_KEY,
  LEFT_KEY,
  RIGHT_KEY,
  TAB_KEY,
  UP_KEY,
} from '../../base/types/keys.types';
import { isEmpty, isNull } from '../../base/utils/object-util';
import { uuid } from '@opensumi/ide-core-common';
import useTable, { ITableStoreCell } from './hook/useTable';
import { isOSX } from '@opensumi/ide-core-browser';
import { TableFilter } from './table-filter';
import { range } from '../../base/utils/number-util';
import { DataUtil } from '../../base/utils/data-util';
import { IWhereParam } from '../../base/model/sql-param.model';

import {
  DEFAULT_FILTER_HEIGHT,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_OPTION_HEIGHT,
  DEFAULT_PAGINATION_HEIGHT,
  DEFAULT_TABLE_REST_WIDTH,
} from './constant';
import { useDragLine } from './hook/useDragLine';
import { Menu } from './menu';
import { useMenu } from './hook/useMenu';
import { ErrorToast } from '../error';

export const TableEditor = (props: TableEditorProps) => {
  const {
    tableWidth,
    tableHeight,
    columns,
    data,
    style,
    cellStyle,
    pagination = false,
    table,
    option,
    optionArgs,
    optionView,
    isLoading = false,
    immediateRemove = true,
    primaryKey,
    firstRowIsEdit = false,
    showTitleTypeIcon = false,
    emptyTitle,
    showEmptyLine,
    menuOption = {},
    clickOutSideClear,
    onAdd,
    onFilter,
    onFilterClose,
    onFilterOpen,
    onRefresh,
    onRemove,
    onSave,
    onDataChange,
    onRevert,
    onClick,
    onRowClick,

    onDownRow,
    onUpRow,
    sort,
  } = props;

  const [dataGridWidth, setDataGridWidth] = useState(0);
  const [columnWidthSetting, setColumnWidthSetting] = useState<number[]>([]);

  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const { dragLineLeft, dragLineVisible, handleDragLineStart, handleDragLineStop, handleDragLine } = useDragLine({
    scrollLeft,
  });

  const [searchWord, setSearchWord] = useState<string>();
  //页面操作相关状态
  const [selectedRowPosition, setSelectedRowPosition] = useState<number[]>();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isFilter, setIsFilter] = useState<boolean>(false);
  const [filter, setFilter] = useState<Map<string, IFilterValue>>(new Map());
  //菜单相关

  //点击位置
  const [editingPosition, setEditingPosition] = useState<{ row: number; column: number }>();
  //选中的
  const [selectedPosition, setSelectPosition] = useState<ISelectedPosition>();

  const headerWrapRef = useRef<HTMLDivElement>(null);
  const bodyGridRef = useRef<FixedSizeGrid>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 数据变化相关状态
   */
  const [sortColumn, setSortColumn] = useState<ISortColumn>();
  const [idsIndex, setIdsIndex] = useState<string[]>([]);
  const [indexData, setIndexData] = useState<Map<string, ITableRow>>(new Map());
  const [updateCellMap, setUpdateCellMap] = useState<Map<string, Map<number, IUpdateCell>>>(new Map());
  const [addCellMap, setAddCellMap] = useState<Map<string, Map<number, IUpdateCell>>>(new Map());
  // 如果数据更改了，又删除了，记录在removeCellMap中，用于恢复？？？？？
  const [removeCellMap, setRemoveCellMap] = useState<Map<string, Map<number, IUpdateCell>>>(new Map());
  const [sortRowSet, setSortRowSet] = useState<Set<string>>(new Set());
  //
  const [updateRecordIndex, setUpdateRecordIndex] = useState<IUpdateRecord[]>([]);

  const [verifyError, setVerifyError] = useState<Map<string, Set<number>>>(new Map());
  const [alertMessage,setAlertMessage] = useState<string>()

  const [tableInstance] = useTable(table);
  const {
    getStore,
    dataObserver,
    setInitData,
    clearStore,
    deleteRow,
    deleteRows,
    recoverDeleteRow,
    recoverDeleteRows,
    addRow,
    setColumnValue,
    setColumnsValue,
    setValidate,
  } = tableInstance;

  useEffect(() => {
    console.log('useEffect-->表格初始化', data);
    //let idsIndex: string[] = []
    if (data && data.length > 0) {
      let indexData: Map<string, ITableRow> = new Map();
      let idsIndex: string[] = [];
      //const idsIndexExist = idsIndex && idsIndex.length > 0 ? true : false;
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        let genUuid = primaryKey ? item[primaryKey] : uuid();
        idsIndex.push(genUuid);
        indexData.set(genUuid, item);
      }
      setIndexData(indexData);
      //if (!idsIndexExist) {
      //只初始化一次，
      setIdsIndex(idsIndex);

      setInitData(indexData);
    } else if (!firstRowIsEdit) {
      console.log('--------->data bianle ?', data);
      setIndexData(new Map());
      setIdsIndex([]);
      setInitData(new Map());
    }
    //}
  }, [data]);

  useEffect(() => {
    if (firstRowIsEdit && data.length === 0) {
      setIdsIndex([uuid()]);
    }
  }, []);

  const dragLineHeight = useMemo(() => {
    let paginationHeight = pagination ? DEFAULT_PAGINATION_HEIGHT : 0; //改成常量
    let dataOptionHeight = option ? DEFAULT_OPTION_HEIGHT : 0;
    return tableHeight - dataOptionHeight - paginationHeight;
  }, [pagination, tableHeight]);

  //减去标题高度和分页高度
  const bodyHeight = useMemo(() => {
    let paginationHeight = pagination ? DEFAULT_PAGINATION_HEIGHT : 0;
    let dataOptionHeight = option ? DEFAULT_OPTION_HEIGHT : 0;
    let filterInputHeight = isFilter ? DEFAULT_FILTER_HEIGHT : 0;
    return tableHeight - dataOptionHeight - DEFAULT_HEADER_HEIGHT - filterInputHeight - paginationHeight;
  }, [pagination, tableHeight, isFilter]);

  /**
   *
   * @Result true 校验通过 false 校验不通过
   */
  const verifyNullData = useCallback((): boolean => {
    //需要校验null的列
    let verifyColumns: { key: string; index: number }[] = [];
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      if (column.nullAble === 'NO') {
        verifyColumns.push({ key: column.columnKey, index: i });
      }
    }
    if (verifyColumns.length === 0) return false;
    let verifyResult: Map<string, Set<number>> = new Map();
    //验证修改的数据数据
    const verifyNull = (cellMap: Map<string, Map<number, IUpdateCell>>, isAdd: boolean = false) => {
      cellMap.forEach((row, rowId) => {
        let set: Set<number> = new Set();
        for (let verifyColumn of verifyColumns) {
          let isError = false;
          const updateCell = row.get(verifyColumn.index);
          if (isAdd) {
            if (!updateCell || updateCell.newValue === '') isError = true;
          } else {
            if (updateCell && updateCell.newValue === '') isError = true;
          }
          if (isError) {
            set.add(verifyColumn.index);
          }
        }
        if (set.size > 0) verifyResult.set(rowId, set);
      });
    };
    verifyNull(updateCellMap);
    verifyNull(addCellMap, true);
    if (verifyResult.size !== 0) {
      //console.log('verify验证结果：', verifyResult)
      setVerifyError(verifyResult);
      return true;
    }
    return false;
  }, [updateCellMap, addCellMap]);

  const deleteUpdateRecord = useCallback(
    (rowIds: string[]) => {
      const newUpdateIndex: IUpdateRecord[] = updateRecordIndex.map((item) => {
        let newUpdateCells: IUpdateCell[] = item.updateInfo.filter((cell) => !rowIds.includes(cell.rowId));
        return { updateInfo: newUpdateCells };
      });
      setUpdateRecordIndex(newUpdateIndex);
    },
    [updateRecordIndex],
  );

  const removeAddData = useCallback(
    (rowIds: string[]) => {
      if (rowIds.length > 0) {
        //排序索引删除
        const newIdsIndex = idsIndex.filter((id) => !rowIds.includes(id));
        setIdsIndex(newIdsIndex);
        if (immediateRemove) {
          //修改记录彻底删除
          deleteUpdateRecord(rowIds);
        }
        let cellExistFlag = false;
        for (let rowId of rowIds) {
          if (addCellMap.has(rowId)) {
            cellExistFlag = true;
            const updateRow = addCellMap.get(rowId);
            //非即刻删除，要讲删除的数据缓存下来，方便恢复
            if (!immediateRemove && updateRow) {
              removeCellMap.set(rowId, updateRow);
            }
            addCellMap.delete(rowId);
          }
        }
        if (cellExistFlag) {
          if (!immediateRemove) {
            setRemoveCellMap(new Map(removeCellMap));
          }
          setAddCellMap(new Map(addCellMap));
        }
      }
    },
    [idsIndex, immediateRemove, updateRecordIndex, addCellMap, removeCellMap, deleteUpdateRecord],
  );

  //消除所有编辑结果
  const handleRemove = useCallback(async () => {
    //console.log('handleRemove------------->1', immediateRemove, removeCellMap);
    if (selectedRowPosition && selectedRowPosition.length > 0) {
      //console.log('handleRemove------------->2');
      const sortSelectedRowPosition = selectedRowPosition.sort((a, b) => a - b);
      let allRowId: string[] = [],
        notAddRowIds: string[] = [],
        addRowIds: string[] = [];
      let removeRows: IUpdateCell[] = [];
      sortSelectedRowPosition.forEach((item) => {
        const rowId = idsIndex[item];
        if (isAddRow(item)) {
          addRowIds.push(rowId);
        } else {
          notAddRowIds.push(rowId);
        }
        allRowId.push(rowId);
        removeRows.push({ rowId, fromIndex: item, option: 'remove' });
      });
      if (immediateRemove) {
        //console.log('immediateRemove=====kaishi--------------', notAddRowIds.length);
        if (notAddRowIds.length > 0 && onRemove) {
          let removeData: ITableRow[] = [];
          notAddRowIds.map((item) => removeData.push(indexData.get(item)!));
          const remoteRemove = await onRemove(removeData);
          //删除成功执行
          if (remoteRemove) removeUpdateData(notAddRowIds);
        }
      } else {
        removeUpdateData(notAddRowIds);
      }

      if (addRowIds.length > 0) {
        removeAddData(addRowIds);
      }
      if (!immediateRemove) {
        //记录删除索引，用于以后恢复数据
        updateRecordIndex.push({ updateInfo: removeRows });
        setUpdateRecordIndex([...updateRecordIndex]);
      }

      setSelectedRowPosition(undefined);
      //删除tableStore中的数据
      deleteRows(allRowId);
    }
  }, [selectedRowPosition, idsIndex, removeAddData, onRemove, immediateRemove]);

  const handleAdd = useCallback(
    (rowId?: string, order?: 'up' | 'down') => {
      console.log('handleAdd+++---1');
      const verify = verifyNullData();
      if (verify) return;
      console.log('handleAdd+++---2', rowId);
      if (rowId) {
        console.log('handleAdd+++---3');
        const newIdsIndex = [...idsIndex];
        const insertIndex = newIdsIndex.indexOf(rowId);
        if (insertIndex !== -1) {
          //const valueToInsert = 999; // 要插入的固定值
          if (order === 'down') {
            newIdsIndex.splice(insertIndex + 1, 0, uuid()); // 在指定位置后插入新值
          } else {
            newIdsIndex.splice(insertIndex, 0, uuid()); // 在指定位置后插入新值
          }
          setIdsIndex(newIdsIndex);
        }
      } else {
        console.log('handleAdd+++---4');
        setIdsIndex([...idsIndex, uuid()]);
        //跳转到最后一行
        if (bodyGridRef.current) {
          bodyGridRef.current.scrollToItem({ columnIndex: 1, rowIndex: getTotalRow() - 1 });
        }
      }
    },
    [data, idsIndex, verifyNullData],
  );

  const clearError = useCallback(
    (rowId: string, columnIndex: number) => {
      if (verifyError.has(rowId)) {
        let set = verifyError.get(rowId);
        if (set && set.has(columnIndex)) {
          set.delete(columnIndex);
          setVerifyError(new Map(verifyError));
        }
      }
    },
    [verifyError],
  );

  //新增一个数据，传入行和列，和编辑的键值
  const processUpdateData = useCallback(
    (updateCells: IUpdateCell[]) => {
      const multiCell: ITableStoreCell[] = [];
      for (let updateCell of updateCells) {
        const { rowId, columnIndex, columnKey, newValue } = updateCell;
        //console.log('addUpdateData--将要编辑的值为：--》', updateCell)
        clearError(rowId, columnIndex!);
        //存储修改的数据到updateCellMap
        if (updateCellMap.has(rowId)) {
          let rowMap = updateCellMap.get(rowId);
          const initCellValue = getInitialColumnValue(rowId, columnKey!);
          //console.log('addUpdateData--：--》initCellData', initCellValue, ';newValue:', newValue)
          //比较相等都转换为字符串比较
          if (newValue + '' === initCellValue + '' || (isEmpty(initCellValue) && isEmpty(newValue))) {
            rowMap!.delete(columnIndex!);
            if (rowMap!.size === 0) {
              //空Map需要删掉，用来保证父级map的长度计算
              updateCellMap.delete(rowId);
            }
          } else {
            rowMap!.set(columnIndex!, updateCell);
            //setUpdateCellMap(new Map(updateCellMap));
          }
        } else {
          let rowMap: Map<number, IUpdateCell> = new Map();
          rowMap.set(columnIndex!, updateCell);
          updateCellMap.set(rowId, rowMap);
        }
        multiCell.push({ rowId, columnName: columnKey!, newValue });
      }
      if (multiCell.length > 0) {
        setColumnsValue(multiCell);
      }
      return updateCellMap;
    },
    [updateRecordIndex, updateCellMap, clearError, dataObserver],
  );

  const processAddData = useCallback(
    (addData: IUpdateCell[]) => {
      const multiCell: ITableStoreCell[] = [];
      for (let addCell of addData) {
        const { rowId, columnKey, columnIndex, newValue, lastValue } = addCell;
        clearError(rowId, columnIndex!);
        //记录新增的的数据：先判断之前有没有，之前有，更新之前的数据，之前没有，直接讲新修改的添加到map中
        if (addCellMap.has(rowId)) {
          let rowMap = addCellMap.get(rowId);
          //如果新值为空，说明没有更改，因为新增的行，每个单元值初始都是空
          if (isEmpty(newValue)) {
            rowMap!.delete(columnIndex!);
            if (rowMap!.size === 0) addCellMap.delete(rowId);
          } else {
            rowMap!.set(columnIndex!, addCell);
          }
        } else {
          let rowMap: Map<number, IUpdateCell> = new Map();
          rowMap.set(columnIndex!, addCell);
          addCellMap.set(rowId, rowMap);
        }
        //setAddCellMap(new Map(addCellMap));
        //console.log('------------------------>是否添加成功', addCellMap)
        //将更改的值存储到tableStore
        multiCell.push({ rowId, columnName: columnKey!, newValue });
      }
      if (multiCell.length > 0) {
        setColumnsValue(multiCell);
      }
      return addCellMap;
    },
    [updateRecordIndex, addCellMap, updateRecordIndex, clearError, dataObserver],
  );

  const getFinalData = useCallback((): ITableRow[] => {
    //console.log('finalTableData---->', getStore());
    let tableData: ITableRow[] = [];
    for (let id of idsIndex) {
      let item = getStore().get(id);

      tableData.push(item!);
    }
    return tableData;
  }, [dataObserver, idsIndex]);

  const getFinalRowData = useCallback(
    (rowId: string): ITableRow => {
      return getStore().get(rowId);
    },
    [dataObserver],
  );

  const getFinalCellData = useCallback(
    (rowId: string, columnIndex: number) => {
      const item = getStore().get(rowId);
      if (isNull(item)) {
        return;
      }
      const columnKey = columns[columnIndex].columnKey;
      return item[columnKey];
    },
    [dataObserver, columns],
  );
  /**
   *
   */
  const multiCommitData = useCallback(
    (updateCells: IUpdateCell[]) => {
      //console.log('修改的数据:', updateCells);
      let needUpdateData: IUpdateCell[] = [];
      let needAddData: IUpdateCell[] = [];
      for (let cell of updateCells) {
        const { rowId, option, lastValue, columnIndex, columnKey } = cell;
        let doneOption = option;
        if (!option) {
          doneOption = option ? option : indexData.has(rowId) ? 'update' : 'add';
          cell.option = doneOption;
        }
        //复制，粘贴的情况下无法获取lastvalue，需要补充上
        if (isEmpty(lastValue)) {
          cell.lastValue = getFinalCellData(rowId, columnIndex);
        }
        if (isEmpty(columnKey)) {
          cell.columnKey = columns[columnIndex].columnKey;
        }
        //console.log('multiAddUpdateData:', doneOption)
        //console.log('multiAddUpdateData', doneOption, optionArgs?.update);
        if (doneOption === 'add') {
          needAddData.push(cell);
        } else if (doneOption === 'update') {
          if (optionArgs && optionArgs.update) {
            needUpdateData.push(cell);
          }else{
            setAlertMessage('该表无主键，禁止编辑');
          }
        }
      }
      //console.log('修改的数据:needUpdateData:', needUpdateData, ';needAddData:', needAddData);
      let isAddOrUpdate: boolean = false;
      if (needUpdateData.length > 0) {
        processUpdateData(needUpdateData);
        setUpdateCellMap(new Map(updateCellMap));
        isAddOrUpdate = true;
      }
      if (needAddData.length > 0) {
        processAddData(needAddData);
        setAddCellMap(new Map(addCellMap));
        isAddOrUpdate = true;
      }
      //
      isAddOrUpdate && setUpdateRecordIndex([...updateRecordIndex, { updateInfo: updateCells }]);
      if (isAddOrUpdate && onDataChange) {
        onDataChange(updateCells);
      }
    },
    [updateRecordIndex, indexData, processAddData, processUpdateData, optionArgs, onDataChange,columns,alertMessage],
  );

  const commitData = useCallback(
    (updateCell: IUpdateCell) => {
      const { rowId, columnIndex, option, lastValue, columnKey } = updateCell;
      //
      let doneOption = option;
      if (!option) {
        doneOption = option ? option : indexData.has(rowId) ? 'update' : 'add';
        updateCell.option = doneOption;
      }
      //复制，粘贴的情况下无法获取lastvalue，需要补充上
      if (isEmpty(lastValue)) {
        updateCell.lastValue = getFinalCellData(rowId, columnIndex);
      }
      if (isEmpty(columnKey)) {
        updateCell.columnKey = columns[columnIndex].columnKey;
      }
      //console.log('commitData-->option.update', optionArgs?.update);
      if (doneOption === 'update' && optionArgs && !optionArgs.update) {
        return;
      }
      if (doneOption === 'add') {
        processAddData([updateCell]);
        setAddCellMap(addCellMap);
      } else if (doneOption === 'update') {
        processUpdateData([updateCell]);
        setUpdateCellMap(updateCellMap);
      }
      setUpdateRecordIndex([...updateRecordIndex, { updateInfo: [updateCell] }]);
    },
    [updateRecordIndex, indexData, processAddData, processUpdateData, columns, getFinalCellData],
  );

  //console.log('listener indexData  ------------>', indexData);
  const clearUpdateAndAdd = useCallback(
    (isClearStore: boolean = false) => {
      console.log('clearUpdateAndAdd1  ------------>', indexData);
      // console.log('updateRecordIndex:', updateRecordIndex, ';updateCellMap:', updateCellMap,
      //   ";addCellMap:", addCellMap, ";removeCellMap:", removeCellMap)

      if (updateRecordIndex && updateRecordIndex.length > 0) setUpdateRecordIndex([]);
      if (updateCellMap && updateCellMap.size > 0) setUpdateCellMap(new Map());
      if (addCellMap && addCellMap.size > 0) setAddCellMap(new Map());
      if (removeCellMap && removeCellMap.size > 0) setRemoveCellMap(new Map());
      if (isClearStore) {
        //store 通过useEffect初始化，handleRefresh和handleSave调用clearUpdateAndAdd，会把store又清理了一遍，所以此处加判断，
        //不让随便清理store
        clearStore();
        setTimeout(() => {
          setInitData(indexData);
        });
      }
    },
    [updateRecordIndex, updateCellMap, addCellMap, removeCellMap, idsIndex, indexData],
  );

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      const runResult = await onRefresh();
      if (runResult) clearUpdateAndAdd();
    } else {
      clearUpdateAndAdd();
    }
  }, [clearUpdateAndAdd, onRefresh, indexData]);

  const {
    contextMenu,
    handleMenu,
    menuVisible,
    menuPosition,
    setMenuVisible,
    handleCopyCell,
    handlePasteCell,
    handleCopyRow,
    handlePasteRow,
  } = useMenu({
    menuOption,
    handleRemove,
    handleAdd,
    handleRefresh,
    commitData,
    multiCommitData,
    selectedPosition,
    selectedRowPosition,
    idsIndex,
    columns,
  });

  const handleBodyScroll = useCallback(
    (_scrollLeft: number) => {
      const headTable = headerWrapRef.current;
      if (headTable) {
        headTable.scrollLeft = _scrollLeft;
        handleSetScroll(_scrollLeft);
      }
    },
    [headerWrapRef],
  );

  const handleSetScroll = useCallback(
    debounceUtil((_scrollLeft: number) => {
      setScrollLeft(_scrollLeft);
      //console.log('scrollLeft:----->',_scrollLeft)
    }, 5),
    [],
  );

  const handleColumnWidth = useCallback((setting: number[], dataGridWidth: number) => {
    setColumnWidthSetting(setting);
    setDataGridWidth(dataGridWidth);
  }, []);

  // const enableOutClick = useCallback(() => {
  //console.log('enableOutClick->', disableOutClick);
  //   disableOutClick && setDisableOutClick(false);
  // }, [disableOutClick]);

  //删除某个修改过的数据
  const removeUpdate = useCallback(
    (rowId: string, rowIndex: number, columnIndex: number) => {
      if (updateCellMap.has(rowId)) {
        let rowMap = updateCellMap.get(rowId);
        if (rowMap!.has(columnIndex)) {
          //删除旧的索引位置
          // const newIndex = updateRecordIndex.filter((item) =>
          //   (item.rowId !== rowId || item.columnIndex !== columnIndex))
          // setUpdateRecordIndex(newIndex);
          rowMap!.delete(columnIndex);
          if (rowMap!.size === 0) {
            //空Map需要删掉，用来保证父级map的长度计算
            updateCellMap.delete(rowId);
          }
          setUpdateCellMap(new Map(updateCellMap));
        }
      }
    },
    [updateCellMap, clearError],
  );

  const isUpdate = useCallback(
    (rowId: string, rowIndex: number, columnIndex: number): false | IUpdateCell => {
      if (updateCellMap.size === 0) {
        return false;
      }
      if (updateCellMap.has(rowId)) {
        const rowEditingCellMap = updateCellMap.get(rowId);
        if (rowEditingCellMap!.has(columnIndex)) {
          return rowEditingCellMap!.get(columnIndex)!;
        } else {
          return false;
        }
      } else {
        return false;
      }
    },
    [updateCellMap],
  );

  //有疑问
  const removeUpdateData = useCallback(
    (rowIds: string[]) => {
      //console.log('removeUpdateData------------->1', removeCellMap);
      if (rowIds.length > 0) {
        //排序索引删除
        const newIdsIndex = idsIndex.filter((id) => !rowIds.includes(id));
        setIdsIndex(newIdsIndex);
        //修改索引删除,立即删除的数据无法恢复，所有修改记录也要跟着一起删除
        if (immediateRemove) {
          //修改记录彻底删除
          deleteUpdateRecord(rowIds);
        }
        let cellExistFlag = false;
        //修改记录删除
        const newRemoveCellMap = new Map(removeCellMap);
        for (let rowId of rowIds) {
          if (updateCellMap.has(rowId)) {
            cellExistFlag = true;
            const updateRow = updateCellMap.get(rowId);
            if (!immediateRemove && updateRow) {
              newRemoveCellMap.set(rowId, updateRow);
            }
            updateCellMap.delete(rowId);
          } else {
            newRemoveCellMap.set(rowId, new Map());
          }
        }
        //console.log('cellExistFlag', cellExistFlag);
        //console.log('removeCellMap', newRemoveCellMap);
        if (cellExistFlag) {
          if (!immediateRemove) {
            setRemoveCellMap(new Map(newRemoveCellMap));
          }
          setUpdateCellMap(new Map(updateCellMap));
        }
      }
    },
    [idsIndex, updateRecordIndex, addCellMap],
  );

  const getAddData = useCallback(
    (rowId: string, rowIndex: number, columnIndex: number) => {
      if (!addCellMap || addCellMap.size === 0) {
        return;
      }
      if (addCellMap.has(rowId)) {
        const rowCellMap = addCellMap.get(rowId);
        if (rowCellMap && rowCellMap.has(columnIndex)) {
          return rowCellMap.get(columnIndex);
        }
      }
    },
    [addCellMap],
  );

  const getUpdateDataToSave = useCallback((): Set<IDeriveData> | undefined => {
    if (!updateCellMap || updateCellMap.size === 0) {
      return;
    }
    //console.log('updateCellMap--->', updateCellMap)
    const result: Set<IDeriveData> = new Set();
    updateCellMap.forEach((child, key) => {
      //console.log('map foreach---->')
      let updateRow: Map<string, string | number> = new Map();
      const originalData = indexData.get(key);
      child.forEach((value) => {
        updateRow.set(value.columnKey!, value.newValue!);
      });
      result.add({ originalData: originalData!, updateRow });
    });
    return result;
  }, [updateCellMap, indexData]);

  const getAddDataToSave = useCallback((): Set<Map<string, string | number>> | undefined => {
    if (!addCellMap || addCellMap.size === 0) {
      return;
    }
    const result: Set<Map<string, string | number>> = new Set();
    addCellMap.forEach((child, key) => {
      let updateCells: Map<string, string | number> = new Map();
      child.forEach((value) => {
        updateCells.set(value.columnKey!, value.newValue!);
      });
      result.add(updateCells);
    });
    return result;
  }, [addCellMap]);

  const getRemoveDataToSave = useCallback((): ITableRow[] => {
    let removeData: ITableRow[] = [];
    for (let updateRecord of updateRecordIndex) {
      //const {option} = updateRecord.updateInfo[0];
      //if (updateRecord.option !== 'remove') continue
      const removeInfos = updateRecord.updateInfo;
      for (let removeInfo of removeInfos) {
        const { rowId, option } = removeInfo;
        if (option === 'remove') {
          if (indexData.has(rowId)) {
            removeData.push(indexData.get(rowId)!);
          }
        }
      }
    }
    return removeData;
  }, [updateRecordIndex, indexData]);

  const getSortDataToSave = useCallback((): ISortData[] => {
    //修改的动过排序的数据
    let sortData: ISortData[] = [];
    for (let rowId of sortRowSet) {
      //记录里面可能会包含被删除的数据的排序结果，被删除的数据排序不会进入排序
      if (!idsIndex.includes(rowId)) continue;
      //排序的数据会上下移动多次，但只有最后一次结果
      const currentOrder = idsIndex.indexOf(rowId);
      const beforeKey = getDataLastKey(idsIndex[currentOrder - 1]);
      const currentKey = getDataLastKey(rowId);
      const rowDta = getEditRowData(rowId);
      sortData.push({ order: currentOrder, beforeKey, sortKey: currentKey, sortData: rowDta });
    }
    //排序，因为需要先声明order在前面的sql，才能保证保存排序时，不乱
    sortData.sort((a, b) => a.order! - b.order!);
    return sortData;
  }, [updateRecordIndex, indexData]);

  const getDataLastKey = useCallback(
    (rowId: string) => {
      if (!primaryKey) console.error('数据错误----》没有配置primaryKey，数据无法排序');
      if (indexData.has(rowId)) {
        if (updateCellMap.has(rowId)) {
          const cellMap = updateCellMap.get(rowId);
          for (let item of cellMap!.values()) {
            if (item.columnKey === primaryKey) {
              return item.newValue;
            }
          }
        }
        return indexData.get(rowId)![primaryKey!];
      } else {
        //数据是新增的
        const cellMap = addCellMap.get(rowId);
        if (cellMap) {
          for (let item of cellMap.values()) {
            if (item.columnKey === primaryKey) {
              return item.newValue;
            }
          }
        }
      }
      return '';
    },
    [indexData, updateCellMap, addCellMap],
  );

  /**
   * 获取某行被编辑的所有数据--只包含被编辑的。
   */
  const getEditRowData = useCallback(
    (rowId: string): ITableRow => {
      // if (!primaryKey) console.error('数据错误----》没有配置primaryKey，数据无法排序')
      let rowData: ITableRow = {};
      if (indexData.has(rowId)) {
        rowData = indexData.get(rowId)!;
        if (updateCellMap.has(rowId)) {
          const cellMap = updateCellMap.get(rowId);
          for (let item of cellMap!.values()) {
            rowData[item.columnKey!] = item.newValue;
          }
        }
      } else {
        //数据是新增的
        const cellMap = addCellMap.get(rowId);
        if (cellMap) {
          for (let item of cellMap.values()) {
            rowData[item.columnKey!] = item.newValue;
          }
        }
      }
      return rowData;
    },
    [indexData, updateCellMap, addCellMap],
  );

  /**
   * 获取当前单元格的最后一次修改的值
   */
  const getLastColumnValue = useCallback(
    (rowId: string, columnIndex: number) => {
      let columnValue;
      const columnKey = columns[columnIndex].columnKey;
      if (indexData.has(rowId)) {
        // rowData = indexData.get(rowId);
        if (updateCellMap.has(rowId)) {
          const cellMap = updateCellMap.get(rowId);
          if (cellMap && cellMap.has(columnIndex)) {
            columnValue = cellMap.get(columnIndex);
          }
        }
        columnValue = indexData.get(rowId)![columnKey];
      } else {
        //数据是新增的
        const cellMap = addCellMap.get(rowId);
        if (cellMap && cellMap.has(columnIndex)) {
          columnValue = cellMap.get(columnIndex);
        }
      }
      return DataUtil.dataFormat(columnValue);
    },
    [indexData, updateCellMap, addCellMap, columns],
  );

  /**
   * 获取单元格最初的值
   */
  const getInitialColumnValue = useCallback(
    (rowId: string, columnKey: string) => {
      if (indexData.has(rowId)) {
        return indexData.get(rowId)![columnKey];
      }
    },
    [indexData],
  );

  /**
   * 获取行的数据。
   */
  const getRowData = useCallback(
    (rowIndex: string): IClickCellData[] => {
      const rowData: IClickCellData[] = [];
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const column = columns[columnIndex];
        const lastValue = getLastColumnValue(rowIndex, columnIndex);
        const originValue = getInitialColumnValue(rowIndex, column.columnKey);
        rowData.push({ originValue, lastValue, column, columnKey: column.columnKey });
      }
      return rowData;
    },
    [columns, getLastColumnValue, getInitialColumnValue],
  );

  /**
   * 修改数据上下顺序
   */
  const upDownData = useCallback(
    (opt: 'up' | 'down', optRowId?: string) => {
      let currentRowPosition;
      if (!optRowId) {
        if (!selectedRowPosition || selectedRowPosition.length !== 1) return;
        if (opt === 'up' && selectedRowPosition[0] === 0) return;
        if (opt === 'down' && selectedRowPosition[0] === data.length - 1) return;
        currentRowPosition = selectedRowPosition[0];
        optRowId = idsIndex[currentRowPosition];
      } else {
        currentRowPosition = idsIndex.indexOf(optRowId);
      }

      let goalRowPosition;
      if (opt === 'up') goalRowPosition = currentRowPosition - 1;
      else goalRowPosition = currentRowPosition + 1;
      //let initialBeforeKey;
      //if (sortRowMap.has(optRowId)) {
      //const sortRow = sortRowMap.get(optRowId)
      //initialBeforeKey = sortRow.initialBeforeKey;
      //} else {
      // //说明之前没有
      //}

      //修改顺序索引
      const tempId = idsIndex[goalRowPosition];
      //  const currentRowId = idsIndex[currentRowPosition]
      idsIndex[goalRowPosition] = optRowId;
      idsIndex[currentRowPosition] = tempId;
      setSelectedRowPosition([goalRowPosition]);
      setIdsIndex([...idsIndex]);
      //存储更改过程
      setUpdateRecordIndex([...updateRecordIndex, { updateInfo: [{ rowId: optRowId, option: opt }] }]);
      !sortRowSet.has(optRowId) && sortRowSet.add(optRowId);
      setSortRowSet(sortRowSet);
    },
    [selectedRowPosition, idsIndex],
  );

  //撤销最近的一个编辑或者新增
  const revertLast = useCallback(() => {
    if (updateRecordIndex.length === 0) {
      return;
    }
    const lastUpdate = updateRecordIndex[updateRecordIndex.length - 1];
    //console.log('lastUpdate:', lastUpdate)
    const { updateInfo } = lastUpdate;
    let updateCellMapRefresh = false,
      addCellMapRefresh = false,
      removeCellMapRefresh = false,
      idsIndexRefresh = false;
    for (const updateCell of updateInfo) {
      const {
        option,
        rowId: updateRowId,
        columnIndex: updateColumnIndex,
        columnKey: updateColumnKey,
        newValue: updateNewValue,
        lastValue: updateLastValue,
        fromIndex,
      } = updateCell;
      // const {rowId: lastRowId, option, removeInfos} = lastUpdate;
      if (option === 'update') {
        // const {rowId: lastRowId, columnIndex, columnKey, lastValue} = rowInfo;
        processUpdateData([{ ...updateCell, newValue: updateLastValue }]);
        updateCellMapRefresh = true;
      } else if (option === 'add') {
        ////////////////.
        //  for (const rowInfo of updateInfo) {
        // const {rowId: lastRowId, columnIndex, columnKey, lastValue} = rowInfo;
        processAddData([{ ...updateCell, newValue: updateLastValue }]);
        addCellMapRefresh = true;
        // }
      } else if (option === 'remove') {
        //恢复删除的数据
        //const removeInfos = removeInfos;
        //if (!removeInfos || removeInfos.length === 0) return
        //   for (const rowInfo of updateInfo) {
        //  const {rowId, fromIndex} = rowInfo;
        //编辑的数据恢复
        if (removeCellMap.has(updateRowId)) {
          if (indexData.has(updateRowId)) {
            updateCellMap.set(updateRowId, removeCellMap.get(updateRowId)!);
            updateCellMapRefresh = true;
          } else {
            addCellMap.set(updateRowId, removeCellMap.get(updateRowId)!);
            addCellMapRefresh = true;
          }
          removeCellMap.delete(updateRowId);
          removeCellMapRefresh = true;
        }
        idsIndex.splice(fromIndex!, 0, updateRowId);
        //恢复tableStore被删除的值
        recoverDeleteRow(updateRowId);
        //插入索引
      } else if (option === 'up') {
        //因为每次只能移动一个，所以此处调用不会出错，如果同时移动多个，此处调用会出错
        upDownData('down', updateRowId);
      } else if (option === 'down') {
        upDownData('up', updateRowId);
      }
    }
    updateCellMapRefresh && setUpdateCellMap(new Map(updateCellMap));
    addCellMapRefresh && setAddCellMap(new Map(addCellMap));
    removeCellMapRefresh && setRemoveCellMap(new Map(removeCellMap));
    idsIndexRefresh && setIdsIndex([...idsIndex]);
    //删除存储的对象
    const newIndex = updateRecordIndex.slice(0, -1);
    setUpdateRecordIndex(newIndex);
  }, [
    updateRecordIndex,
    updateCellMap,
    addCellMap,
    removeCellMap,
    idsIndex,
    indexData,
    upDownData,
    processUpdateData,
    processAddData,
  ]);

  const getTotalRow = useCallback((): number => {
    return idsIndex.length;
  }, [idsIndex]);

  const getCopyData = () => {
    if (isEditing || !selectedPosition) return;
    const text = range(selectedPosition.rowStart, selectedPosition.rowEnd)
      .map((i) =>
        range(selectedPosition.columnStart, selectedPosition.columnEnd)
          .map((j) => {
            const cell = data[i][j];
            const value = cell[columns[j].columnKey];
            return value;
          })
          .join('\t'),
      )
      .join('\n');

    return text;
  };

  const handleSelectedRowPosition = useCallback(
    (rowPositions: number[] | undefined) => {
      setSelectedRowPosition(rowPositions);
      //console.log('select row:', rowPositions);
      if (rowPositions && rowPositions.length > 0 && onRowClick) {
        const rowDataList: IClickCellData[][] = [];
        for (let position of rowPositions) {
          const rowIndex = idsIndex[position];
          rowDataList.push(getRowData(rowIndex));
        }

        onRowClick(rowDataList);
      }
    },
    [onRowClick, getRowData, idsIndex],
  );

  const handleSave = useCallback(async () => {
    const verify = verifyNullData();
    //console.log('verify验证结果：', verify)
    if (verify) return;
    //最终的数据
    const finalData = getFinalData();
    //获取修改的数据
    const updateData = getUpdateDataToSave();
    //获取新增的数据
    const addData = getAddDataToSave();
    //获取删除的数据
    const removeData = getRemoveDataToSave();
    //获取排序的数据
    const sortData = getSortDataToSave();

    if (onSave) {
      const optResult = await onSave({ data: finalData, updateData, addData, removeData, sortData });
      //console.log('操作结果--->', optResult)
      if (optResult) {
        clearUpdateAndAdd();
      }
    }
  }, [
    verifyNullData,
    getFinalData,
    getUpdateDataToSave,
    getAddDataToSave,
    getRemoveDataToSave,
    getSortDataToSave,
    clearUpdateAndAdd,
  ]);

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

  const handleUpData = useCallback(() => {
    upDownData('up');
  }, [upDownData]);

  const handleDownData = useCallback(() => {
    upDownData('down');
  }, [upDownData]);

  const handleRevert = useCallback(() => {
    revertLast();
    if (onRevert) {
      onRevert();
    }
  }, [updateCellMap, addCellMap, revertLast]);

  const handleCancel = useCallback(() => {
    clearUpdateAndAdd(true);
  }, [clearUpdateAndAdd]);

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

    //提交filter
  }, [isFilter, filter]);

  //--------------------------------------------------------

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
      // console.log(
      //   `clearStat:', clearSelectedCell:${selectedPosition},clearSelectedRow:${selectedRowPosition},clearEditing:${editingPosition}`,
      // );
      clearSelectedCell && selectedPosition && setSelectPosition(undefined);
      clearSelectedRow && selectedRowPosition && handleSelectedRowPosition(undefined);
      if (clearEditing) {
        isEditing && setIsEditing(false);
        editingPosition && setEditingPosition(undefined);
      }
    },
    [selectedPosition, selectedRowPosition, isEditing, editingPosition, handleSelectedRowPosition],
  );

  //设置单元格进入编辑状态
  const handleEditMode = useCallback(
    (rowIndex: number, columnIndex: number, inputKeyValue?: ITempInputValue) => {
      const currentColumn = columns[columnIndex];
      if (currentColumn && (currentColumn.showEdit || currentColumn.disableEdit)) {
        //if (currentColumn && currentColumn.disableEdit) {
        return;
      }
      setIsEditing(true);
      setEditingPosition({ row: rowIndex, column: columnIndex });
    },
    [columns],
  );

  const handleDoubleClick = useCallback(
    (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => {
      ev.preventDefault();
      if (isEditing && editingPosition && rowIndex === editingPosition.row && columnIndex === editingPosition.column) {
        return;
      }
      clearStat(false, true, false);
      handleEditMode(rowIndex, columnIndex);
    },
    [isEditing, editingPosition, handleEditMode],
  );

  const handleClick = useCallback(
    (ev: React.MouseEvent, rowId: string, rowIndex: number, columnIndex: number) => {
      //必须阻止click往上传输，否则会造成数据提交混乱，
      ev.stopPropagation();
      const { dataType, inputType, showEdit, columnKey } = columns[columnIndex];
      //console.log('我被点击了--》', rowIndex, columnIndex, ';isEditing:', isEditing, '--', columnKey);
      // if ((dataType && [DataInputEnum.date, DataInputEnum.datetime, DataInputEnum.year, DataInputEnum.timestamp, DataInputEnum.time].includes(dataType))
      //   || inputType === 'select') {
      //   !disableOutClick && setDisableOutClick(true);
      // } else {
      //   disableOutClick && setDisableOutClick(false);
      // }
      //1.点击的是编辑位置，点击无效

      if (isEditing && editingPosition && rowIndex === editingPosition.row && columnIndex === editingPosition.column) {
        console.log('点击无效----》');
        return;
      }
      //单击后，清空编辑状态（非单击），清空--行--选中状态，
      if (showEdit) {
        clearStat(true, true, true);
      } else {
        clearStat(false, true, true);
        //已选中的进行点击，进如编辑态
        if (
          selectedPosition &&
          rowIndex === selectedPosition.rowStart &&
          columnIndex === selectedPosition.columnStart
        ) {
          handleEditMode(rowIndex, columnIndex);
        } else {
          setSelectPosition({ rowStart: rowIndex, rowEnd: rowIndex, columnStart: columnIndex, columnEnd: columnIndex });
        }
        //当点击的cell有弹出框时，要禁用点击外部清除状态(disableOutClick),否者点击弹出框时，会修改状态
      }
      if (onClick) {
        const lastValue = getLastColumnValue(rowId, columnIndex);
        onClick(lastValue);
      }
    },
    [columns, isEditing, editingPosition, selectedPosition, handleEditMode, getLastColumnValue],
  );

  const handleRowClick = useCallback(
    (ev: MouseEvent, rowIndex: number) => {
      //阻止点击空白区域的提交
      ev.stopPropagation();
      if (!selectedRowPosition) clearStat();
      const shiftMask = hasShiftMask(ev);
      const ctrlCmdMask = hasCtrlCmdMask(ev);

      if (shiftMask) {
        //获取上次点击的位置，计算一个范围
        if (selectedRowPosition && selectedRowPosition.length > 0) {
          let lastClickRow = selectedRowPosition[selectedRowPosition.length - 1];
          let selectedRange = range(lastClickRow, rowIndex);
          handleSelectedRowPosition([...selectedRange]);
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
    [selectedRowPosition, handleSelectedRowPosition],
  );
  const handleRowContextMenu = useCallback(
    (event, rowId: string, rowIndex: number) => {
      if (selectedRowPosition && selectedRowPosition.length > 0 && selectedRowPosition.includes(rowIndex)) {
        const selectedRowIds: string[] = selectedRowPosition.map((rowIndex) => idsIndex[rowIndex]);
        const selectedRows: ITableRow[] = selectedRowIds.map((id) => getFinalRowData(id));
        handleMenu(event, { row: { rowIds: selectedRowIds, rows: selectedRows } }, 'row');
      } else {
        setSelectedRowPosition([rowIndex]);
        handleMenu(event, { row: { rowIds: [rowId], rows: [getFinalRowData(rowId)] } }, 'row');
      }
    },
    [selectedRowPosition, idsIndex, indexData, getFinalRowData, handleMenu],
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
      // if (rowIndex === rowStart && columnIndex === columnStart) {
      //   return true;
      // }
      const posX = columnIndex >= columnStart && columnIndex <= columnEnd!;
      const negX = columnIndex <= columnStart && columnIndex >= columnEnd!;
      const posY = rowIndex >= rowStart && rowIndex <= rowEnd!;
      const negY = rowIndex <= rowStart && rowIndex >= rowEnd!;
      return (posX && posY) || (negX && posY) || (negX && negY) || (posX && negY);
    },
    [selectedPosition],
  );

  const isError = useCallback(
    (rowId: string, columnIndex: number) => {
      if (verifyError.has(rowId)) {
        const rowError = verifyError.get(rowId);
        if (rowError && rowError.has(columnIndex)) {
          return true;
        }
      }
      return false;
    },
    [verifyError],
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

  const canRevert = (): boolean => {
    if (updateRecordIndex.length > 0) {
      return true;
    }
    return false;
  };

  const canSave = (): boolean => {
    //console.log(
    //   `updateCellMap.size:${updateCellMap.size},addCellMap.size:${addCellMap.size},
    //   removeCellMap.size:${removeCellMap.size},sortRowSet.size:${sortRowSet.size},
    //   updateRecordIndex.length:${updateRecordIndex.length}`,
    // );
    if (
      updateCellMap.size > 0 ||
      addCellMap.size > 0 ||
      removeCellMap.size > 0 ||
      sortRowSet.size > 0 ||
      updateRecordIndex.length > 0
    ) {
      return true;
    }
    return false;
  };

  const isAddRow = useCallback(
    (rowNum: number): boolean => {
      const rowId = idsIndex[rowNum];
      if (indexData.has(rowId)) {
        return false;
      }
      return true;
    },
    [idsIndex, indexData],
  );

  const handleDataChange = (rowId: string, rowIndex: number, columnIndex: number, cell: IUpdateCell) => {
    //console.log('handleDataChange->', ';rowIndex:', rowIndex, ';columnIndex:', columnIndex, ';newValue:', cell)
    //记录
    if (onDataChange) {
    }
  };

  const handlePage = useCallback(
    (page: number, pageSize: number) => {
      if (pagination) {
        clearUpdateAndAdd(true);
        const { onChange } = pagination;
        if (onChange) {
          onChange(page, pageSize);
        }
      }
    },
    [clearUpdateAndAdd, pagination],
  );

  const handleCommit = (cells?: IUpdateCell[], ev?: React.KeyboardEvent) => {
    //console.log('handleDataCommit->', ';rowIndex:', cells)
    //如果该列不能编辑，则不能提交

    if (cells) {
      multiCommitData(cells);
    }
    //将数据在tableStore中存储一份
    // const tableStore = cells.map(value => ({
    //   rowId: value.rowId,
    //   columnName: value.columnKey,
    //   newValue: value.newValue
    // }))
    // setColumnsValue(tableStore)
    setEditingPosition(undefined);
    setIsEditing(false);
    //console.log('编辑完成，是否还有selectedPosition:', selectedPosition)
    handleKeyboardCellMovement(ev);
    if (ev) {
      ev.preventDefault();
      bodyContainerRef.current?.focus();
    }
  };

  // const handleRowKey = (e: React.KeyboardEvent) => {
  //   if (e.isPropagationStopped && e.isPropagationStopped()) {
  //     return;
  //   }
  //   console.log('handleRowKey操作被触发');
  //   if (!selectedRowPosition || selectedRowPosition.length === 0) {
  //     return;
  //   }
  //   const ctrlKeyPressed = e.ctrlKey || e.metaKey;
  //   if (ctrlKeyPressed) {
  //     //const { rowStart, columnStart } = selectedRowPosition;
  //     //const rowId = idsIndex[rowStart];
  //     switch (e.key.toLowerCase()) {
  //       case 'c':
  //         console.log('行复制操作被触发');
  //         //  const data = getFinalCellData(rowId, columnStart);
  //         // 在这里添加你的复制操作逻辑
  //         //handleCopyCell('shortCuts', { rowId, columnIndex: columnStart, data });
  //         break;
  //       case 'v':
  //         console.log('行粘贴操作被触发');
  //         //handlePasteCell('shortCuts', { rowId, rowIndex: rowStart, columnIndex: columnStart });
  //         // 在这里添加你的粘贴操作逻辑
  //         break;
  //     }
  //   }
  // };

  const handleKey = (e: React.KeyboardEvent) => {
    //console.log('会触发吗table-editor handleKey');
    if (e.isPropagationStopped && e.isPropagationStopped()) {
      return;
    }
    //const isCellsSelected = selectedPosition ;//&& selectedPosition.rowStart && selectedPosition.columnStart;
    const ctrlKeyPressed = e.ctrlKey || e.metaKey;
    if ((!selectedPosition && !selectedRowPosition) || isEditing) {
      return;
    }
    if (ctrlKeyPressed) {
      console.log('会触发吗table-editor ctrlKeyPressed');
      handleCtrlCV(e);
      return;
    }
    if (!selectedPosition) {
      return;
    }
    //console.log('会触发吗table-editor handleKey2')
    const keyCode = e.which || e.keyCode;
    const { rowStart, columnStart } = selectedPosition;
    const deleteKeysPressed = keyCode === DELETE_KEY || keyCode === BACKSPACE_KEY;
    const enterKeyPressed = keyCode === ENTER_KEY;
    const numbersPressed = keyCode >= 48 && keyCode <= 57;
    const lettersPressed = keyCode >= 65 && keyCode <= 90;
    const latin1Supplement = keyCode >= 160 && keyCode <= 255;
    const numPadKeysPressed = keyCode >= 96 && keyCode <= 105;
    const equationKeysPressed =
      [187 /* equal */, 189 /* substract */, 190 /* period */, 107 /* add */, 109 /* decimal point */, 110].indexOf(
        keyCode,
      ) > -1;
    if (!isEditing) {
      //移动选中表格位置
      handleKeyboardCellMovement(e);
      if (deleteKeysPressed) {
        e.preventDefault();
        //清空当前字母
        clearSelectedCells(rowStart, columnStart);
      } else if (enterKeyPressed) {
        //更改当前表格为选中状态
        setIsEditing(true);
        setEditingPosition({ row: rowStart, column: columnStart });
        //this._setState({editing: start, clear: {}, forceEdit: true});
        e.preventDefault();
      }
      //此功能禁用，会导致数据安全性太差
      else if (numbersPressed || numPadKeysPressed || lettersPressed || latin1Supplement || equationKeysPressed) {
        //改变当前表格内容
        const newValue = e.key;
        const rowId = idsIndex[rowStart];
        const isAdd = isAddRow(rowStart);
        const column = columns[columnStart];
        const columnKey = column.columnKey;
        const inputType = column.inputType;
        // console.log('handleKey,newVal----->', newVal)
        if (!inputType || inputType === 'input') {
          //select checkbox不能直接赋值
          //先判断是否是input类型，然后赋值
          handleEditMode(rowStart, columnStart, { rowIndex: rowStart, columnIndex: columnStart, newValue });
        }
        // e.preventDefault();
        // empty out cell if user starts typing without pressing enter
        // this._setState({editing: start, clear: start, forceEdit: false});
      }
    }
  };

  const handleKeyboardCellMovement = (e) => {
    //console.log('handleKeyboardCellMovement--selectedPosition:', selectedPosition)
    //  const isCellsSelected = selectedPosition ;//&& selectedPosition.rowStart && selectedPosition.columnStart;
    if (!e || !selectedPosition) {
      return;
    }
    const totalRow = getTotalRow();
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
      //e.preventDefault();
    }
    //   e.preventDefault();
  };
  const handleCtrlCV = useCallback(
    (e) => {
      console.log('selectedRowPosition:', selectedRowPosition, ';selectedPosition:', selectedPosition);
      if (selectedRowPosition && selectedRowPosition.length > 0) {
        switch (e.key.toLowerCase()) {
          case 'c':
            const rowIds = selectedRowPosition.map((index) => idsIndex[index]);
            const rows: ITableRow[] = rowIds.map((rowId) => getFinalRowData(rowId));
            handleCopyRow('shortCuts', { rowIds, rows });
            break;
          case 'v':
            handlePasteRow();
            break;
        }
      } else if (selectedPosition) {
        const { rowStart, columnStart } = selectedPosition;
        const rowId = idsIndex[rowStart];
        switch (e.key.toLowerCase()) {
          case 'c':
            //console.log('复制操作被触发');
            const data = getFinalCellData(rowId, columnStart);
            // 在这里添加你的复制操作逻辑
            handleCopyCell('shortCuts', { rowId, columnIndex: columnStart, data });
            break;
          case 'v':
            //console.log('粘贴操作被触发');
            handlePasteCell('shortCuts', { rowId, rowIndex: rowStart, columnIndex: columnStart });
            // 在这里添加你的粘贴操作逻辑
            break;
        }
      }
    },
    [
      dataObserver,
      selectedPosition,
      selectedRowPosition,
      idsIndex,
      getFinalCellData,
      getFinalRowData,
      handleCopyCell,
      handlePasteCell,
      handleCopyRow,
      handlePasteRow,
    ],
  );

  const clearSelectedCells = (rowStart: number, columnStart: number) => {
    const columnKey = columns[columnStart].columnKey;
    const rowId = idsIndex[rowStart];
    const lastValue = getLastColumnValue(rowId, columnStart);
    if (!isEmpty(lastValue)) {
      //FALSE和O都应该可以输入
      //const updateCell :IUpdateCell= {rowId, columnIndex: columnStart, columnKey, newValue: '', lastValue};
      commitData({ rowId, columnIndex: columnStart, columnKey, newValue: '', lastValue });
      //  addNewData({rowId, columnIndex: columnStart, columnKey, newValue: '', lastValue, option: 'add'}, true)
    }
  };
  /**
   * 点击页面空白部分，提交
   * 用来消除编辑状态，但是带来了很多问题，
   * 比如1：date，select，点击弹出的浮层，会导致这个方法无效运行
   * 比如2：点击删除按钮是，也会提前运行这个方法，导致删除失效
   * 所以要注意使用disableOutClick状态，来禁用
   *
   * clearSelectedRow：默认为false的原因：如果为true，会导致删除行的效果失效，如果没有删除行的效果，才能设置为true
   */
  const onClickDataOutSide = useCallback(() => {
    // if (!disableOutClick) {
    //console.log('onClickDataOutSide,-------------------->');
    if (clickOutSideClear) {
      const { clearSelectedCell = true, clearSelectedRow = true } = clickOutSideClear;
      clearStat(clearSelectedCell, clearSelectedRow, true);
    } else {
      clearStat(true, true, true);
    }
    //}
  }, [clearStat, clickOutSideClear]);

  const renderDataRow = useCallback(
    ({ rowId, rowIndex }) => {
      const row = indexData.get(rowId)!;
      let columnList: any = [];

      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const column = columns[columnIndex];

        const isUpdateData = isUpdate(rowId, rowIndex, columnIndex);
        //const data = isUpdateData ? isUpdateData.newValue : DataUtil.dataFormat(row[column.columnKey]);
        const data = isUpdateData ? isUpdateData.newValue : row[column.columnKey];
        //console.log('origin',row[column.columnKey],'dataFormat:',DataUtil.dataFormat(row[column.columnKey]),',deal:',data);
        //isUpdateData && console.log('renderDataRow,isUpdateData----->', isUpdateData);
        columnList.push(
          <Cell
            style={cellStyle}
            key={`${rowId}-${rowIndex}-${columnIndex}-${column.columnKey}`}
            column={column}
            data={data}
            initialValue={row[column.columnKey]}
            isModified={isUpdateData !== false}
            rowId={rowId}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            searchWord={searchWord}
            width={columnWidthSetting[columnIndex]}
            isSelected={isSelected(rowIndex, columnIndex)}
            isEditor={isEditor(rowIndex, columnIndex)}
            isError={isError(rowId, columnIndex)}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            onCommit={handleCommit}
            onContextMenu={(e) => {
              setSelectPosition({
                rowStart: rowIndex,
                rowEnd: rowIndex,
                columnStart: columnIndex,
                columnEnd: columnIndex,
              });
              handleMenu(e, { cell: { rowId, columnIndex, data } }, 'cell');
            }}
          />,
        );
      }
      return columnList;
    },
    [
      data,
      indexData,
      columns,
      searchWord,
      idsIndex,
      columnWidthSetting,
      isSelected,
      isEditing,
      selectedPosition,
      selectedRowPosition,
      updateCellMap,
      verifyError,
    ],
  );

  const renderDataAdd = useCallback(
    ({ rowId, rowIndex }) => {
      return (
        <>
          {columns.map((column, columnIndex) => {
            const data = getAddData(rowId, rowIndex, columnIndex)?.newValue;
            return (
              <Cell
                key={`${rowIndex}-${columnIndex}-${column.columnKey}`}
                column={column}
                data={data}
                rowId={rowId}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
                searchWord={searchWord}
                width={columnWidthSetting[columnIndex]}
                isSelected={isSelected(rowIndex, columnIndex)}
                isEditor={isEditor(rowIndex, columnIndex)}
                isAdd={true}
                isError={isError(rowId, columnIndex)}
                onDoubleClick={handleDoubleClick}
                onCommit={handleCommit}
                onClick={handleClick}
                onContextMenu={(e) => {
                  setSelectPosition({
                    rowStart: rowIndex,
                    rowEnd: rowIndex,
                    columnStart: columnIndex,
                    columnEnd: columnIndex,
                  });
                  handleMenu(e, { cell: { rowId, columnIndex, data } }, 'cell');
                }}
                style={cellStyle}
              />
            );
          })}
        </>
      );
    },
    [
      data,
      indexData,
      columns,
      searchWord,
      idsIndex,
      columnWidthSetting,
      isEditing,
      isSelected,
      selectedPosition,
      selectedRowPosition,
      addCellMap,
      verifyError,
    ],
  );
  const renderEmpty = useCallback(({ columnIndex, rowIndex, style }) => {
    return <div key={`${rowIndex}`} style={{ ...style, width: dataGridWidth - DEFAULT_TABLE_REST_WIDTH + 'px' }}></div>;
  }, []);

  const renderRow = useCallback(
    ({ columnIndex, rowIndex, style }) => {
      if (rowIndex >= idsIndex.length) {
        return renderEmpty({ columnIndex, rowIndex, style });
      }
      let columnView;
      let rowId = idsIndex[rowIndex];
      let isAddRow = false;

      if (indexData.has(rowId)) {
        columnView = renderDataRow({ rowId, rowIndex });
      } else {
        columnView = renderDataAdd({ rowId, rowIndex });
        isAddRow = true;
      }
      const classNames = cls(
        styles['row-data'],
        styles['row-data-hover'],
        isSelectedRow(rowIndex) && styles['row-selected'],
        isAddRow && styles['row-add'],
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
            onContextMenu={(event) => {
              handleRowContextMenu(event, rowId, rowIndex);
            }}
            // onKeyDown={handleRowKey}
          >
            {rowIndex + 1}
          </div>
          {columnView}
        </div>
      );
    },
    [
      data,
      dataGridWidth,
      idsIndex,
      isSelectedRow,
      renderDataAdd,
      renderDataRow,
      handleRowClick,
      addCellMap,
      updateCellMap,
      selectedRowPosition,
      handleRowContextMenu,
    ],
  );

  const renderFilter = useCallback(() => {
    return isFilter ? (
      <TableFilter
        columns={columns}
        dataGridWidth={dataGridWidth}
        columnWidths={columnWidthSetting}
        filter={filter}
        setFilter={(filter) => {
          setFilter(new Map(filter));
        }}
      />
    ) : null;
  }, [columns, isFilter, dataGridWidth, columnWidthSetting, filter]);

  const renderPagination = useCallback(() => {
    if (pagination !== false) {
      return <Pagination {...pagination} onChange={handlePage} />;
    }
  }, [pagination, handlePage]);

  return (
    <div className={styles['table-editor-container']} style={style}>
      <div style={{ width: tableWidth + 'px' }}>
        <TableOption
          {...optionArgs}
          enableRemove={selectedRowPosition && selectedRowPosition.length > 0}
          enableSave={canSave()}
          setSearchWord={setSearchWord}
          enableRevert={canRevert()}
          enableCancel={canRevert()}
          enableFilterSearch={isFilter}
          optionView={optionView}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onSave={handleSave}
          onRevert={handleRevert}
          onCancel={handleCancel}
          onRefresh={handleRefresh}
          onFilter={handleFilter}
          onUpRow={handleUpData}
          onDownRow={handleDownData}
          onFilterSearch={handleFilterSearch}
        />
      </div>

      <div className={styles['table-content']}>
        <Loading isLoading={isLoading} />
        <div
          className={styles['drag-line']}
          style={{
            height: `${dragLineHeight}px`,
            visibility: dragLineVisible ? 'visible' : 'hidden',
            left: `${dragLineLeft}px`,
            //visibility: "visible",
          }}
        ></div>
        <div className={styles['table-header-container']} style={{ width: tableWidth + 'px' }} ref={headerWrapRef}>
          <TableHeader
            columns={columns}
            sortColumn={sortColumn}
            showTitleTypeIcon={showTitleTypeIcon}
            // tableHeight={tableHeight}
            handleColumnWidth={handleColumnWidth}
            onDragLine={handleDragLine}
            onDragLineStart={handleDragLineStart}
            onDragLineStop={handleDragLineStop}
            sort={handleSort}
            canSort={sort ? true : false}
          />
          {renderFilter()}
        </div>

        <div
          className={styles['table-body-container']}
          tabIndex={0}
          ref={bodyContainerRef}
          onKeyDown={handleKey}
          onClick={onClickDataOutSide}
        >
          <TableBody
            width={tableWidth}
            height={bodyHeight}
            data={data}
            dataGridWidth={dataGridWidth}
            rowCount={idsIndex.length !== 0 ? idsIndex.length + 1 : 0}
            onScroll={handleBodyScroll}
            bodyGridRef={bodyGridRef}
            renderRow={renderRow}
            onClickDataOutSide={onClickDataOutSide}
            emptyTitle={emptyTitle}
            showEmptyLine={showEmptyLine}
          />
          {alertMessage ? (
            <ErrorToast
              message={alertMessage}
              position={'center'}
              onClose={() => {
                setAlertMessage(undefined);
              }}
            />
          ) : null}
        </div>

      </div>
      <div className={styles['table-footer-container']} style={{ width: tableWidth + 'px' }}>
        {/*<Pagination  />*/}
        {renderPagination()}
      </div>

      <Menu menus={contextMenu} closeMenu={() => setMenuVisible(false)} position={menuPosition} visible={menuVisible} />
    </div>
  );
};
