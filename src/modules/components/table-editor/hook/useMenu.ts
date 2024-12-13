import { useCallback, useMemo, useState } from 'react';
import {
  IMenu,
  IMenuOption,
  ISelectedPosition,
  ISelectMenuData,
  ITableColumn,
  IUpdateCell,
} from '../table-editor.types';
import { ClipboardUtils } from '../../../base/utils/clipboard-utils';
import { isEmpty, isNotEmpty, isNotNull } from '../../../base/utils/object-util';
import { DEFAULT_MENU_DIVIDER_HEIGHT, DEFAULT_MENU_ITEM_HEIGHT, DEFAULT_MENU_ITEM_WIDTH } from '../constant';
import { ITableRow } from '../../table-view';
import lodash from 'lodash';

interface MenuArgs {
  menuOption?: IMenuOption | false;
  handleRemove: () => void;
  handleAdd: (rowId?: string, order?: 'up' | 'down') => void;
  handleRefresh: () => void;
  idsIndex: string[];
  columns: ITableColumn[];
  commitData: (updateCell: IUpdateCell) => void;
  multiCommitData: (updateCells: IUpdateCell[]) => void;
  selectedPosition: ISelectedPosition;
  selectedRowPosition: number[];
}

export function useMenu({
  menuOption,
  handleRemove,
  handleAdd,
  idsIndex,
  columns,
  commitData,
  multiCommitData,
  selectedPosition,
  selectedRowPosition,
}: MenuArgs) {
  const [selectData, setSelectData] = useState<ISelectMenuData>(null);
  const [copyRowData, setCopyData] = useState<{ rowIds: string[]; rows: ITableRow[] }>(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [clickNature, setClickNature] = useState<'row' | 'cell'>('row');

  const handleAddRow = useCallback(
    (order: 'up' | 'down') => {
      const {
        row: { rowIds },
      } = selectData;
      if (rowIds && rowIds.length > 0) {
        handleAdd(rowIds[0], order);
      }
      console.log('handleAddRow 1 clicked');
    },
    [handleAdd, selectData],
  );
  const handleCopyRow = useCallback(
    (
      pasteMethod: 'contextMenu' | 'shortCuts',
      shortCutRows?: {
        rowIds: string[];
        rows: ITableRow[];
      },
    ) => {
      console.log('handleCopyRow 2 clicked', pasteMethod, );
      if (pasteMethod === 'contextMenu') {
        if (selectData) {
          const copyText = JSON.stringify(selectData.row.rows);
          ClipboardUtils.writeText(copyText);
          setCopyData({...lodash.cloneDeep(selectData.row) });
          //需要深拷贝
          //      setCopyRow({rowId:selectData.rowId,row:{...selectData.row}});
        }
      } else {
        setCopyData({ ...shortCutRows });
        if (shortCutRows.rows) {
          ClipboardUtils.writeText(JSON.stringify(shortCutRows.rows));
        }
      }
    },
    [selectData],
  );
  /**
   * 目前原则：只能复制一行，只能给空数据行复制
   * @param pasteMethod
   * @param shortCutRows
   */
  const handlePasteRow = useCallback(() => {
    console.log('handlePasteRow 3 clicked', copyRowData);
    if (copyRowData && copyRowData.rows && copyRowData.rows.length > 0 && selectedRowPosition) {
      const { rowIds, rows } = copyRowData;
      const copyRow = rows[0];
      const rowStart = selectedRowPosition[0];
      const rowId = idsIndex[rowStart];
      const multiData: IUpdateCell[] = [];
      Object.keys(copyRow).map((key, index) => {
        const newValue = copyRow[key];
        if (isNotNull(newValue)) {
          multiData.push({ rowId, columnIndex: index, newValue });
        }
      });
      multiCommitData(multiData);
    }
  }, [selectedRowPosition, idsIndex, multiCommitData, copyRowData]);
  /**
   * contextMenu,右键复制
   * showCuts：快捷键ctrl+c复制
   */
  const handleCopyCell = useCallback(
    (
      copyMethod: 'contextMenu' | 'shortCuts',
      shortCutCell?: {
        rowId: string;
        columnIndex: number;
        data: any;
      },
    ) => {
      let copyValue = '';
      if (copyMethod === 'contextMenu') {
        const { rowId, columnIndex, data } = selectData.cell;
        copyValue = data;
      } else {
        copyValue = shortCutCell.data;
        if (isNotEmpty(copyValue)) {
          setSelectData({ ...selectData, cell: shortCutCell });
        }
      }
      if (isNotEmpty(copyValue)) {
        ClipboardUtils.writeText(copyValue);
      }
    },
    [selectData],
  );
  const handlePasteCell = useCallback(
    async (
      pasteMethod: 'contextMenu' | 'shortCuts',
      shortPasteCell?: {
        rowId: string;
        rowIndex: number;
        columnIndex: number;
      },
    ) => {
      // onCommit([{ rowId, columnIndex, columnKey, newValue, lastValue: data, option: isAdd ? 'add' : 'update' }], e);
      //右键粘贴
      const pasteValue = await ClipboardUtils.readText();
      if (isEmpty(pasteMethod)) {
        return;
      }
      if (pasteMethod === 'contextMenu') {
        const { rowStart, columnStart } = selectedPosition;
        const rowId = idsIndex[rowStart];
        commitData({ rowId, columnIndex: columnStart, newValue: pasteValue });
      } else {
        const { rowId, rowIndex, columnIndex } = shortPasteCell;
        //获取selectPosition
        commitData({ rowId, columnIndex, newValue: pasteValue });
        //快捷键粘贴
      }
    },
    [commitData, selectedPosition, idsIndex],
  );

  const contextMenu = useMemo(() => {
    const contextMenu: IMenu[][] = [];
    if (clickNature === 'row') {
      if (menuOption) {
        const {
          removeRow = true,
          insertRow = true,
          copyRow = true,
          pasteRow = true,
          refresh = true,
          customMenu,
        } = menuOption;
        if (removeRow) {
          contextMenu.push([{ label: '删除记录', visible: true, onClick: handleRemove }]);
        }
        if (insertRow) {
          contextMenu.push([
            { label: '上方添加行', visible: true, onClick: () => handleAddRow('up') },
            { label: '下方添加行', visible: true, onClick: () => handleAddRow('down') },
          ]);
        }
        if (copyRow) {
          const canPasteRow = !!(copyRowData && copyRowData.rows && copyRowData.rows[0]);
          contextMenu.push([
            { label: '复制行', visible: true, onClick: () => handleCopyRow('contextMenu') },
            { label: '粘贴行', visible: canPasteRow, onClick: () => handlePasteRow() },
          ]);
        }

        if (customMenu && customMenu.length > 0) {
          for (let group of customMenu) {
            const customMenuGroup: IMenu[] = [];
            for (let item of group) {
              customMenuGroup.push({ ...item, onClick: () => item.onClick(selectData) });
            }
            contextMenu.push(customMenuGroup);
          }
        }
        if (refresh) {
          contextMenu.push([{ label: '刷新', visible: true, onClick: () => handleCopyRow('contextMenu') }]);
        }
      }
    } else {
      contextMenu.push([
        { label: '复制', visible: true, onClick: () => handleCopyCell('contextMenu') },
        { label: '粘贴', visible: true, onClick: () => handlePasteCell('contextMenu') },
      ]);
    }
    return contextMenu;
  }, [clickNature, menuOption, handleAddRow, handleCopyRow, handleCopyCell, handlePasteCell, selectData, copyRowData]);

  //if (menuOption) {
  const menuHeight = useMemo(() => {
    let height = 0;
    if (contextMenu && contextMenu.length > 0) {
      for (let i = 0; i < contextMenu.length; i++) {
        const menu = contextMenu[i];
        height = height + menu.length * DEFAULT_MENU_ITEM_HEIGHT;
        if (i + 1 !== contextMenu.length) {
          height = height + DEFAULT_MENU_DIVIDER_HEIGHT;
        }
      }
    }
    return height;
  }, [contextMenu]);

  const handleMenu = useCallback(
    (event, selectMenuData: ISelectMenuData, clickNature: 'row' | 'cell') => {
      console.log('selectMenuData-->', selectMenuData);
      event.preventDefault();
      setMenuVisible(true);
      setClickNature(clickNature);
      setSelectData(selectMenuData);
      //计算弹出位置
      const clickX = event.clientX;
      const clickY = event.clientY;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      // 假设菜单的尺寸为 200x300
      const menuW = DEFAULT_MENU_ITEM_WIDTH;
      const menuH = menuHeight;
      // 计算 x 位置
      const right = screenW - clickX < menuW;
      //const left = !right;
      let x = right ? clickX - menuW : clickX;
      // 计算 y 位置
      const bottom = screenH - clickY < menuH;
      const top = !bottom;
      let y = top ? clickY : clickY - menuH;
      setMenuPosition({ x, y });
    },
    [menuOption, menuHeight],
  );
  return {
    contextMenu,
    handleMenu,
    menuPosition,
    menuVisible,
    setMenuVisible,
    handleCopyCell,
    handlePasteCell,
    handleCopyRow,
    handlePasteRow,
  };
}
