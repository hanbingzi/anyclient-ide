import { ICodeEditor, IEditorDocumentModelService } from '@opensumi/ide-editor/lib/browser';
import React, { RefObject, useCallback, useEffect, useRef } from 'react';
import styles from '../data-editor.module.less';
import { DisposableCollection, PreferenceService, URI, useInjectable } from '@opensumi/ide-core-browser';
import type { IStandaloneCodeEditor } from '@opensumi/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneCodeEditor';
import { EditorCollectionService } from '@opensumi/ide-editor';
import { DocumentEditorServiceToken, IDataEditorViewer, JSONEditorDocumentContentProviderToken } from '../../common';
import { EditorOption } from '../editor-option.view';
import { JSONEditorDocumentContentProvider, JsonViewScheme } from '../provider/json-document.provider';
import { DocumentEditorService } from '../document-editor.service';

export function JsonEditorView(param: IDataEditorViewer) {
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
  } = param;
  const documentEditorService: DocumentEditorService = useInjectable(DocumentEditorServiceToken);
  const editorCollectionService: EditorCollectionService = useInjectable(EditorCollectionService);
  const docManager: IEditorDocumentModelService = useInjectable(IEditorDocumentModelService);
  const docProvider: JSONEditorDocumentContentProvider = useInjectable(JSONEditorDocumentContentProviderToken);

  const preferenceService: PreferenceService = useInjectable(PreferenceService);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  const editorHtmlRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<IStandaloneCodeEditor>(null);
  const iCodeEditorRef = useRef<ICodeEditor>(null);

  const currentUri = useCallback(() => {
    return URI.from({
      scheme: JsonViewScheme,
      query: URI.stringifyQuery({ id: viewId }), //此处不能缩写，缩写无法使用
    });
  }, [viewId]);

  // init monaco CodeEditor
  useEffect(() => {
    if (editorHtmlRef.current && !editorRef.current) {
      const editor2 = editorCollectionService.createCodeEditor(editorHtmlRef.current, {
        value: '',
        automaticLayout: true,
        readOnly: false,
        minimap: {
          enabled: false,
        },
      });
      // @ts-ignore
      iCodeEditorRef.current = editor2;

      setTimeout(() => {
        editor2.layout();
        //editor2.monacoEditor.getAction('editor.action.formatDocument').run();
        //editor2.monacoEditor.trigger("anyString","editor.action.formatDocument")
      }, 0);

      docManager
        .createModelReference(currentUri(), 'editor-react-component')
        .then((ref) => {
          editor2.open(ref);
        })
        .catch(console.error);
      // @ts-ignore
      editorRef.current = editor2.monacoEditor;
    }
  }, [editorHtmlRef.current]);

  useEffect(() => {
    disposableRef.current?.push(
      documentEditorService.onJsonDataChange((value) => {
        if (value === viewId) {
          handleRefresh();
        }
      }),
    );
    disposableRef.current?.push(
      documentEditorService.onActiveSave((value) => {
        //console.log('json---value:', value, 'viewId:', viewId);
        if (value === viewId) {
          iCodeEditorRef.current?.save();
        }
      }),
    );
    return () => {
      disposableRef.current?.dispose();
    };
  }, [viewId]);

  const handleSave = () => {
    const p1 = preferenceService.get('editor.autoSave');
    //const p2 = preferenceService.get('editor.autoSaveDelay')
    console.log('handleSave - json ---》', p1);
    // if (p1 === 'off') {//判断是否是自动保存，如果是自动保存，就不用调用这个方法
    //   documentEditorService.readyRealSave(viewId)
    //   //执行一个真save
    //   iCodeEditorRef.current?.save();
    // } else {
    iCodeEditorRef.current?.save();
    documentEditorService.saveKeyDataByUser(viewId, selectModel);
    // }
  };

  const handleRefresh = useCallback(
    (requestData: boolean = false) => {
      console.log('=========>handleRefresh json');
      //documentEditorService.readyFakeSave(viewId)
      if (requestData) {
        documentEditorService.readyRefresh(viewId, selectModel);
      }
      //这是一个假save，因为目前opensumi如果文本被编辑，不执行save，会拒绝刷新,希望以后能解决opensumi中monaco编辑器的问题
      iCodeEditorRef.current?.save();
      setTimeout(() => {
        docProvider.fireDidChangeContent(currentUri());
      }, 50);
    },
    [documentEditorService, iCodeEditorRef.current, docProvider, currentUri, viewId],
  );

  const handleCopy = useCallback(() => {
    iCodeEditorRef.current?.save();
    setTimeout(() => {
      documentEditorService.copyData(viewId);
    }, 50);
  }, [documentEditorService]);

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
      <div
        ref={editorHtmlRef}
        //28为操作框的高度
        style={{ marginTop: '3px', width: '100%', flexGrow: 1, height: height - 28 + 'px' }}
      ></div>
    </div>
  );
}
