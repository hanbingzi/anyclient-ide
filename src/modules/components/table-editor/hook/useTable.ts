import React from 'react';
import lodash from 'lodash';
import { ITableRow } from '../table-editor.types';
import { isEmpty } from '../../../base/utils/object-util';

export interface ITableStoreCell {
  rowId: string;
  columnName: string;
  newValue: any;
}

export interface IColumnValue {
  rowId: string;
  columnValue: any;
}

class TableStore {
  //修改后的最终数据
  private store: Map<string, ITableRow>;
  private deleteStore: Map<string, ITableRow>;
  private validate: string;
  private isInitData: boolean;
  private readonly forceRootUpdate: () => void;

  constructor(forceRootUpdate: () => void) {
    console.log('我会初始化几遍userTable constructor')
    this.store = new Map(); // 状态库
    this.deleteStore = new Map();
    this.isInitData = false;
    this.forceRootUpdate = forceRootUpdate;
  }

  //初始化仓库
  setInitData = (initialData: Map<string, ITableRow>) => {
    console.log('设置初始值----》', initialData)
    this.store = lodash.cloneDeep(initialData);
    this.deleteStore = new Map();
    this.isInitData = true;
    //console.log('赋值完的store----》', this.store)
    this.notifyObservers();
  };

  clearStore = () => {
    console.log('清空了初始值---》')
    this.isInitData = false;
    this.store = new Map();
    this.notifyObservers();
  };

  getStore = () => {
    //console.log('getStore--->', this.store);
    return this.store;
  };
  getDeleteStore = () => {
    return this.deleteStore;
  };

  private notifyObservers = () => {
    this.forceRootUpdate();
  };

  deleteRow = (rowId: string) => {
    if (this.store.has(rowId)) {
      const deleteRow = this.store.get(rowId);
      this.store.delete(rowId);
      deleteRow && this.deleteStore.set(rowId, deleteRow);
      this.notifyObservers();
    }
  };

  deleteRows = (rowIds: string[]) => {
    for (let rowId of rowIds) {
      this.deleteRow(rowId);
    }
    this.notifyObservers();
  };

  recoverDeleteRow = (rowId: string) => {
    if (this.deleteStore.has(rowId)) {
      this.store.set(rowId, this.deleteStore.get(rowId)!);
      this.deleteStore.delete(rowId);
      this.notifyObservers();
    }
  };

  recoverDeleteRows = (rowIds: string[]) => {
    if (rowIds && rowIds.length > 0) {
      for (let rowId of rowIds) {
        this.recoverDeleteRow(rowId);
      }
      this.notifyObservers();
    }
  };

  addRow = (rowId: string, rowValue: ITableRow) => {
    this.store.set(rowId, rowValue);
    this.notifyObservers();
  };

  // set
  setColumnValue = (cell: ITableStoreCell, isNotify = true) => {
    const { rowId, columnName, newValue } = cell;
    if (this.store.has(rowId)) {
      const rowData = this.store.get(rowId)!;
      rowData[columnName] = newValue;
    } else {
      this.store.set(rowId, { [columnName]: newValue });
    }
    if (isNotify) {
      this.notifyObservers();
    }
    //console.log("store", this.store); //sy-log
  };

  setColumnsValue = (cells: ITableStoreCell[]) => {
    for (let cell of cells) {
      this.setColumnValue(cell, false);
    }
    this.notifyObservers();
  };

  //获得一行的值
  getRowData = (rowId: string): ITableRow => {
    return this.store.get(rowId)!;
  };
  //获得一个单元格的值
  getCellValue = (rowId: string, columnName: string): any => {
    return this.store.get(rowId)![columnName];
  };

  getColumnHasData = (columnName: string): Map<string, any> => {
    console.log('getColumnHasData:', this.store);
    let verticalColumn: Map<string, any> = new Map();
    for (let item of this.store) {
      const [key, columns] = item;
      if (!isEmpty(columns[columnName])) {
        verticalColumn.set(key, columns[columnName]);
      }
    }
    return verticalColumn;
  };

  //获取一个列的数据，根据主列是否有数据，
  getColumnsHasData = (mainColumnName: string, otherColumnNames: string[]): Map<string, Map<string, any>> => {
    let ColumnsData: Map<string, Map<string, any>> = new Map();
    for (let item of this.store) {
      const [key, columns] = item;
      if (!isEmpty(columns[mainColumnName])) {
        let rowMap: Map<string, any> = new Map();
        rowMap.set(mainColumnName, columns[mainColumnName]);
        for (let otherColumnName of otherColumnNames) {
          rowMap.set(otherColumnName, columns[otherColumnName]);
        }
        ColumnsData.set(key, rowMap);
      }
    }
    return ColumnsData;
  };

  setValidate = (validateValue: string) => {
    this.validate = validateValue;
  };

  getForm = () => {
    return {
      getStore: this.getStore,
      getDeleteStore: this.getDeleteStore,
      getRowData: this.getRowData,
      getCellValue: this.getCellValue,
      getColumnHasData: this.getColumnHasData,
      getColumnsHasData: this.getColumnsHasData,
      setInitData: this.setInitData,
      clearStore: this.clearStore,
      deleteRow: this.deleteRow,
      deleteRows: this.deleteRows,
      recoverDeleteRow: this.recoverDeleteRow,
      recoverDeleteRows: this.recoverDeleteRows,
      addRow: this.addRow,
      setColumnValue: this.setColumnValue,
      setColumnsValue: this.setColumnsValue,
      setValidate: this.setValidate,
    };
  };
}

export interface TableInstance {
  getStore: () => Map<string, ITableRow>;
  getDeleteStore: () => Map<string, ITableRow>;
  setInitData: (initialData: Map<string, ITableRow>) => void;
  clearStore: () => void;
  deleteRow: (rowId: string) => void;
  deleteRows: (rowIds: string[]) => void;
  recoverDeleteRow: (rowId: string) => void;
  recoverDeleteRows: (rowIds: string[]) => void;
  addRow: (rowId: string, rowValue: ITableRow) => void;
  setColumnValue: (cell: ITableStoreCell) => void;
  setColumnsValue: (cells: ITableStoreCell[]) => void;
  getRowData: (rowId: string) => ITableRow;
  getCellValue: (rowId: string, columnName: string) => any;
  getColumnHasData: (columnName: string) => Map<string, any>;
  getColumnsHasData: (mainColumnName: string, otherColumnName: string[]) => Map<string, Map<string, any>>;
  setValidate: (validateValue: string) => void;
  dataObserver: any;
}

export default function useTable(form?: TableInstance) {
  const formRef = React.useRef<TableInstance>();
  const [dataObserver, forceUpdate] = React.useState({});

  if (!formRef.current) {
    if (form) {
      formRef.current = form;
    } else {
      const forceReRender = () => {
        forceUpdate({});
        //console.log('forceRender------------------------->')
      };
      const tableStore = new TableStore(forceReRender);
      formRef.current = { ...tableStore.getForm(), dataObserver };
    }
  }
  return [formRef.current];
}
