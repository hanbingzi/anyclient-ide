import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useInjectable } from '@opensumi/ide-core-browser';
import { DataViewModelType, DisplayModelType, DocumentEditorServiceToken, IDataEditor } from '../common';
import { JsonEditorView } from './viewer/json-editor.view';
import { TextEditorView } from './viewer/text-editor.view';
import styles from './data-editor.module.less';
import { DocumentEditorService } from './document-editor.service';
import { isNotNull } from '../../base/utils/object-util';

/**
 * json类：
 * @param param
 * @constructor
 */
export const StringEditorView = (param: IDataEditor) => {
  const { viewId, connect, keyName, keyData, dataType, modelMethod, isAdd, initFinish = false } = param;
  const [selectModel, setSelectModel] = useState<DisplayModelType>('Text');
  const [viewModel, setViewModel] = useState<DataViewModelType>('Text');
  const [parseSuccess, setParseSuccess] = useState<boolean>(true);
  //const [viewData, setViewData] = useState<String>('')
  const documentEditorService: DocumentEditorService = useInjectable(DocumentEditorServiceToken);
  //

  // useLayoutEffect(() => {
    useEffect(() => {
    //console.log(`文档--StringEditorView->initFinish:${initFinish},keyData:${keyData}`);
    //isAdd不需要等待初始数据加载完毕
    if (initFinish || isAdd) {
      //const [parsedKeyData, viewModel] = documentEditorService.parseViewData(keyData, selectModel);
      //console.log('文档--真正的初始化----------》StringEditorView', viewId, ';keyData:', keyData);
      const viewModel = documentEditorService.setInitData(viewId, isAdd ? '' : keyData, connect, keyName, modelMethod);
      console.log('文档--真正的初始化2 finish----------》', viewModel);
      setViewModel(viewModel);
      setSelectModel(viewModel);
    }
    return () => {
      console.log('文档--删除store数据,重新初始化----------》');
      documentEditorService.delTempData(viewId);
    };
  }, [viewId, isAdd, initFinish, keyData, documentEditorService]);

  const handleSelectModel = useCallback(
    (model: DisplayModelType) => {
      const data = DocumentEditorService.Store.get(viewId);
      if (data && isNotNull(data.keyData)) {
        const [parsedData, viewModel, parseSuccess] = documentEditorService.parseViewData(data.keyData, model);
        data.parsedData = parsedData;
        setViewModel(viewModel);

        setParseSuccess(parseSuccess);
        console.log('-->handleSelectModel:viewModel', viewModel, 'parsedData:', parsedData);
      }
      setSelectModel(model);
      //切换选择条件，需要通知页面刷新数据
      documentEditorService.shouldUpdateJsonData(viewId);
    },
    [viewId, viewModel, documentEditorService],
  );

  const canSave = useCallback((): boolean => {
    if (!parseSuccess) {
      return false;
    }
    return !['Java Serialized', 'Protobuf'].includes(selectModel);
  }, [parseSuccess, selectModel]);

  //
  // const handleSave = useCallback(async (content: string) => {
  //   if (onSave) {
  //     onSave(content)
  //   }
  // }, [onSave])
  //
  // const handleRefresh = useCallback(async () => {
  //   if (onRefresh) {
  //     onRefresh();
  //   }
  // }, [onRefresh])
  //
  // const handleCopy = useCallback((content: string) => {
  //
  // }, [])

  const renderContent = useCallback(() => {
    if (!initFinish && !isAdd) return <EmptyView />;

    // 有些数据
    switch (viewModel) {
      case 'Json':
        return (
          <JsonEditorView {...param} canSave={canSave()} selectModel={selectModel} onSelectModel={handleSelectModel} />
        );
      default:
        return (
          <TextEditorView {...param} canSave={canSave()} selectModel={selectModel} onSelectModel={handleSelectModel} />
        );
      //展示其他类型，目前要求展示text类型
    }
  }, [selectModel, param, viewModel, canSave, initFinish, isAdd]);

  return <>{renderContent()}</>;
};
export const EmptyView = () => {
  return <div className={styles['empty-container']}>空</div>;
};
