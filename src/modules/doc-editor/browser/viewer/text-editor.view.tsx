import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import styles from '../data-editor.module.less';
import { DocumentEditorServiceToken, IDataEditorViewer } from '../../common';
import { EditorOption } from '../editor-option.view';
import { DisposableCollection, IClipboardService, useInjectable } from '@opensumi/ide-core-browser';
import { DocumentEditorService } from '../document-editor.service';
import cls from 'classnames';
import debounceUtil from '../../../base/utils/debounce-util';

export function TextEditorView(param: IDataEditorViewer) {
  const {
    height,
    selectModel,
    viewId,
    enableSave,
    canSave,
    enableRefresh,
    enableCopy,
    onSelectModel,
    dataType,
    bordered = true,
  } = param;

  const [content, setContent] = useState<string>('');

  const clipboardService = useInjectable<IClipboardService>(IClipboardService);
  const documentEditorService: DocumentEditorService = useInjectable(DocumentEditorServiceToken);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  //
  useEffect(() => {
    //一开始，从documentEditorService里面取数据
    setTimeout(() => {
      viewData();
    }, 50);
  }, [viewId, selectModel]);

  const viewData = useCallback(async () => {
    const viewData = await documentEditorService.getKeyData(viewId);
    //console.log(`test-editor,渲染text:${viewData}`);
    setContent(viewData);
  }, [viewId, selectModel, documentEditorService]);

  useEffect(() => {
    disposableRef.current?.push(
      documentEditorService.onJsonDataChange((data) => {
        if (data === viewId) {
          handleRefresh();
        }
      }),
    );
    // disposableRef.current?.push(
    //   documentEditorService.onActiveSave((value) => {
    //     console.log('value:',value,';viewId:',viewId)
    //     if (value === viewId) {
    //       console.log('保存编辑的数据---》',content)
    //       //进行一次数据保存，用在编辑的过程中取出数据
    //
    //     }
    //   })
    // );
    return () => {
      disposableRef.current?.dispose();
    };
  }, [viewId]);

  // useEffect(() => {
  //   console.log('useEffect--test');
  //   documentEditorService.saveKeyDataProvider(viewId, content);
  // }, [content]);

  const handleSaveData = useCallback(
    debounceUtil((content: any) => {
      documentEditorService.saveKeyDataProvider(viewId, content);
      //console.log('handleContentChange:----->', content);
    }, 500),
    [documentEditorService],
  );

  const handleContentChange = useCallback(
    (event) => {
     // console.log('handleContentChange--test');
      const data = event.target.value;
      setContent(data);
      handleSaveData(data);
    },
    [handleSaveData],
  );

  const handleSave = useCallback(() => {
    documentEditorService.saveKeyDataProvider(viewId, content, true, selectModel);
  }, [documentEditorService, viewId, content, selectModel]);

  const handleCopy = useCallback(() => {
    clipboardService.writeText(decodeURIComponent(content.toString()));
  }, [content]);

  const handleRefresh = useCallback(
    async (requestData: boolean = false) => {
      console.log('=========>handleRefresh text');
      if (requestData) {
        documentEditorService.readyRefresh(viewId, selectModel);
      }
      const queryData = await documentEditorService.getKeyData(viewId);
      setContent(queryData);
    },
    [documentEditorService, viewId, selectModel],
  );

  return (
    <div className={styles['date-editor-container']}>
      <EditorOption
        dataType={dataType}
        enableSave={enableSave}
        canSave={canSave}
        enableCopy={enableCopy}
        enableRefresh={enableRefresh}
        model={selectModel}
        onSave={() => {
          handleSave();
        }}
        onRefresh={() => {
          handleRefresh(true);
        }}
        onSelectMode={onSelectModel!}
        onCopy={handleCopy}
      />

      <div className={styles['content-container']} style={{ height: height - 22 + 'px' }}>
        <textarea
          className={cls(styles['content-input'], { [styles['content-input-border']]: bordered })}
          value={content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
