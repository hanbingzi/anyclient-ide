import React, { useEffect, useState } from 'react';
import { IRunSqlResult } from '../../server-client/common';
import { IListColumn } from '../../components/table-view';
import cls from 'classnames';
import styles from './query-explorer.module.less';
import { FileSuffixType } from '../../base/types/server-node.types';
import { TableEditor } from '../../components/table-editor';

export interface SummaryProps {
  isShow: boolean;
  width: number;
  height: number;
  serverClass?: FileSuffixType;
  responses: IRunSqlResult[] | undefined;
}

//
// export interface SummaryResponse extends IRunSqlResult {
//   successColor: ReactNode;
// }

export const SummaryView = ({ isShow, width, height, serverClass, responses }: SummaryProps) => {
  const [columns, setColumns] = useState<IListColumn[]>([]);

  if (!responses || responses.length === 0) {
    return null;
  }
  // const [summaryList, setSummaryList] = useState<SummaryResponse[]>([]);

  // useEffect(() => {
  //   const list: SummaryResponse[] = [];
  //   for (let item of responses) {
  //     if (item.success) {
  //       list.push({...item, successColor: <span style={{color: "green"}}>true</span>})
  //     } else {
  //       list.push({...item, successColor: <span style={{color: "red"}}>false</span>})
  //     }
  //
  //   }
  //   setSummaryList(list)
  // }, [])

  // const column = useMemo(() => {
  //   let successColumn: IListColumn = { title: 'Success', columnKey: 'success', width: 100 };
  //   //console.log('width:', width)
  //   let sqlColumn: IListColumn = { title: 'SQL', columnKey: 'sql', width: 300 };
  //   let messageColumn: IListColumn = { title: 'Message', columnKey: 'message', width: 120 };
  //   if (serverClass === 'redis') {
  //     sqlColumn.title = 'Command';
  //     sqlColumn.columnKey = 'command';
  //   }
  //   let costTime: IListColumn = { title: 'CosTime(ms)', columnKey: 'costTime', width: 100 };
  //   if (responses) {
  //     if (responses.find(item => !item.success)) {
  //       if (width > 800) {
  //         // 170 = 100(costTime宽) + 40（表格序号宽） +30（表格拖拽增宽预留宽度）
  //         sqlColumn.width = (width - 270) * 0.5;
  //         messageColumn.width = (width - 270) * 0.5;
  //       } else {
  //         messageColumn.width = 300;
  //       }
  //     } else {
  //       //560 = 520(列宽) +40（表格序号宽）
  //       if (width > 660) {
  //         sqlColumn.width = (width - 270) * 0.7;
  //         messageColumn.width = (width - 270) * 0.3;
  //       }
  //     }
  //   }
  //   //console.log('sql:', sqlColumn)
  //   //console.log('message:', messageColumn)
  //   return [successColumn, sqlColumn, messageColumn, costTime];
  // }, [responses, width]);

  useEffect(() => {
    if (width === 0) {
      return;
    }
    console.log('SummaryView--width:', width);
    let successColumn: IListColumn = { title: 'Success', columnKey: 'success', width: 100 };
    //console.log('width:', width)
    let sqlColumn: IListColumn = { title: 'SQL', columnKey: 'sql', width: 300 };
    let messageColumn: IListColumn = { title: 'Message', columnKey: 'message', width: 120 };
    if (serverClass === 'redis' || serverClass==='es') {
      sqlColumn.title = 'Command';
      sqlColumn.columnKey = 'command';
    }
    let costTime: IListColumn = { title: 'CosTime(ms)', columnKey: 'costTime', width: 100 };
    if (responses) {
      if (responses.find((item) => !item.success)) {
        if (width > 800) {
          // 170 = 100(costTime宽) + 40（表格序号宽） +30（表格拖拽增宽预留宽度）
          sqlColumn.width = (width - 270) * 0.5;
          messageColumn.width = (width - 270) * 0.5;
        } else {
          messageColumn.width = 300;
        }
      } else {
        //560 = 520(列宽) +40（表格序号宽）
        if (width > 660) {
          sqlColumn.width = (width - 270) * 0.7;
          messageColumn.width = (width - 270) * 0.3;
        }
      }
    }
    //console.log('sql:', sqlColumn)
    //console.log('message:', messageColumn)
    setColumns([successColumn, sqlColumn, messageColumn, costTime]);
  }, [responses, width]);

  return (
    <div className={cls(isShow ? styles['data-container-show'] : styles['data-container-hidden'])}>
      <TableEditor
        cellStyle={{ textAlign: 'center' }}
        columns={columns}
        data={responses}
        tableHeight={height}
        tableWidth={width}
        option={true}
        optionArgs={{ search: true }}
        pagination={false}
      />
    </div>
  );
};
