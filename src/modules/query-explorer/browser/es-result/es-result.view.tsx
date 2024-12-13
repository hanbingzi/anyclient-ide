import React from 'react';
import cls from 'classnames';
import styles from '../query-explorer.module.less';
import { ResultExplorerProps } from '../../common';
import { StringEditorView } from '../../../doc-editor/browser/string-editor.view';
import { uuid } from '@opensumi/ide-utils';

//as IKeyResult
export const EsResultView = (props: ResultExplorerProps) => {
  const { isShow, width, height, serverInfo, runResult } = props;
  const { data } = runResult;
  const jsonId = `es-result-${uuid()}`;
  //console.log('keyName---->',keyName,'dbValue:',dbValue,'server:',serverInfo)

  return (
    <div className={cls(isShow ? styles['data-container-show'] : styles['data-container-hidden'])}>
      <StringEditorView
        width={width}
        height={height}
        keyData={data}
        viewId={jsonId}
        modelMethod={'Elasticsearch'}
        initFinish={true}
        dataType={'string'}
        enableSave={false}
        enableRefresh={false}
      />
    </div>
  );
};
