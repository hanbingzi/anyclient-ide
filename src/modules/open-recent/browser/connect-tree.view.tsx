import cls from 'classnames';
import React, {
  DragEvent,
  memo,
  MouseEvent,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// import {
//     RecycleTreeFilterDecorator,
//     RecycleTree,
//     TreeNodeType,
//     INodeRendererWrapProps,
//     IRecycleTreeFilterHandle,
//     TreeModel, PromptHandle,
// } from '@opensumi/ide-components';
import { DisposableCollection, isOSX, URI, useInjectable, ViewState } from '@opensumi/ide-core-browser';
import { ProgressBar } from '@opensumi/ide-core-browser/lib/components/progressbar';
import { WelcomeView } from '@opensumi/ide-main-layout/lib/browser/welcome.view';

import { IConnectTreeServiceToken } from '../common';
import { ServerEntity, ServerNode } from '../common/connect-tree-node.define';

import { ConnectTreeNodeView, FILE_TREE_NODE_HEIGHT } from './connect-tree-node.view';
import styles from './connect-tree.module.less';
import { ConnectTreeService, ICustomSearch, ITreeIndent } from './connect-tree.service';
import { ConnectTreeModelService } from './services/connect-tree-model.service';
import {
  INodeRendererWrapProps,
  IRecycleTreeFilterHandle,
  RecycleTree,
  RecycleTreeFilterDecorator,
  TreeModel,
  TreeNodeType,
} from '../../components/recycle-tree';
import { Icon, Input } from '@opensumi/ide-components';

export const FILTER_AREA_HEIGHT = 30;
export const FILE_TREE_FILTER_DELAY = 500;

export const FilterSearchView = (customSearch: ICustomSearch) => {
  const { mode, title: searchTitle } = customSearch;
  const [value, setValue] = React.useState<string>('');

  const fileTreeService = useInjectable<ConnectTreeService>(IConnectTreeServiceToken);

  const handleClose = useCallback(() => {
    fileTreeService.closeFilterQuery();
  }, []);

  const handleFilter = useCallback((pattern: string) => {
    fileTreeService.filterQuery(pattern);
  }, []);

  if (mode) {
    return (
      <div className='kt-recycle-tree-filter-wrapper'>
        <Input
          hasClear
          autoFocus
          className='kt-recycle-tree-filter-input'
          size='small'
          placeholder={searchTitle}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          //addonBefore={<Icon className='kt-recycle-tree-filter-icon' icon='retrieval' />}
          addonAfter={
            <div>
              <Icon
                icon={'search'}
                className={cls('kt-clickable-icon')}
                style={{ marginTop: 4 }}
                onClick={() => handleFilter(value)}
              />
              <Icon
                icon={'close'}
                style={{ marginLeft: 6, marginTop: 4 }}
                className={cls('kt-clickable-icon')}
                onClick={handleClose}
              />
            </div>
          }
        />
      </div>
    );
  }
  return null;
};

const FilterableRecycleTree = RecycleTreeFilterDecorator(RecycleTree);

export const ConnectTreeView = ({ viewState }: PropsWithChildren<{ viewState: ViewState }>) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outerActive, setOuterActive] = useState<boolean>(false);
  // const [outerDragOver, setOuterDragOver] = useState<boolean>(false);
  const [model, setModel] = useState<TreeModel>();
  const wrapperRef: RefObject<HTMLDivElement> = useRef(null);
  const disposableRef: RefObject<DisposableCollection> = useRef(new DisposableCollection());

  const { height } = viewState;
  //console.log('ConnectTreeView   height----->',height)
  const fileTreeService = useInjectable<ConnectTreeService>(IConnectTreeServiceToken);
  const {
    iconService,
    locationToCurrentFile,
    filterMode: defaultFilterMode,
    indent: defaultIndent,
    baseIndent: defaultBaseIndent,
  } = fileTreeService;
  const connectTreeModelService = useInjectable<ConnectTreeModelService>(ConnectTreeModelService);

  const [treeIndent, setTreeIndent] = useState<ITreeIndent>({
    indent: defaultIndent,
    baseIndent: defaultBaseIndent,
  });
  const [filterMode, setFilterMode] = useState<boolean>(defaultFilterMode);
  const [customSearch, setCustomSearch] = useState<ICustomSearch>({ mode: false, title: '' });
  const [iconTheme, setIconTheme] = useState<{
    hasFolderIcons: boolean;
    hasFileIcons: boolean;
    hidesExplorerArrows: boolean;
  }>(
    iconService.currentTheme || {
      hasFolderIcons: true,
      hasFileIcons: true,
      hidesExplorerArrows: true,
    },
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
  }, []);

  const handleItemClicked = useCallback((event: MouseEvent, item: ServerNode | ServerEntity, type: TreeNodeType) => {
    // 阻止点击事件冒泡
    event.stopPropagation();

    const { handleItemClick, handleItemToggleClick, handleItemRangeClick } = connectTreeModelService;
    if (!item) {
      return;
    }
    const shiftMask = hasShiftMask(event);
    const ctrlCmdMask = hasCtrlCmdMask(event);
    if (shiftMask) {
      handleItemRangeClick(item, type);
    } else if (ctrlCmdMask) {
      handleItemToggleClick(item as ServerNode, type);
    } else {
      handleItemClick(item, type);
    }
  }, []);

  const handleItemDoubleClicked = useCallback(
    (event: MouseEvent, item: ServerNode | ServerEntity, type: TreeNodeType) => {
      // 阻止点击事件冒泡
      event.stopPropagation();

      const { handleItemDoubleClick } = connectTreeModelService;
      if (!item) {
        return;
      }
      handleItemDoubleClick(item, type);
    },
    [],
  );

  const handleTwistierClick = useCallback((ev: MouseEvent, item: ServerNode) => {
    // 阻止点击事件冒泡
    ev.stopPropagation();

    const { toggleDirectory } = connectTreeModelService;

    toggleDirectory(item);
  }, []);

  useEffect(() => {
    if (isReady) {
      // 首次初始化完成时，设置当前TreeModel，同时监听后续变化，适配工作区变化事件
      setModel(connectTreeModelService.treeModel);
      // console.log('connectTreeModelService.treeModel:', connectTreeModelService.treeModel)
      // 监听工作区变化
      connectTreeModelService.onFileTreeModelChange(async (treeModel) => {
        setIsLoading(true);
        if (treeModel) {
          // 确保数据初始化完毕，减少初始化数据过程中多次刷新视图
          await treeModel.root.ensureLoaded();
        }
        setModel(treeModel);
        setIsLoading(false);
      });
    }
  }, [isReady]);

  useEffect(() => {
    ensureIsReady();
    disposableRef.current?.push(
      iconService.onThemeChange((theme) => {
        setIconTheme(theme);
      }),
    );
    disposableRef.current?.push(
      fileTreeService.onTreeIndentChange(({ indent, baseIndent }) => {
        setTreeIndent({ indent, baseIndent });
      }),
    );
    disposableRef.current?.push(
      fileTreeService.onFilterModeChange((flag) => {
        setFilterMode(flag);
      }),
    );

    disposableRef.current?.push(
      fileTreeService.onCustomSearchChange((search) => {
        setCustomSearch(search);
      }),
    );

    return () => {
      connectTreeModelService.removeFileDecoration();
      disposableRef.current?.dispose();
    };
  }, []);

  const isChildOf = useCallback((child, parent) => {
    let parentNode;
    if (child && parent) {
      parentNode = child.parentNode;
      while (parentNode) {
        if (parent === parentNode) {
          return true;
        }
        parentNode = parentNode.parentNode;
      }
    }
    return false;
  }, []);

  const handleBlur = useCallback(
    (e) => {
      // 当失去焦点的节点为子节点或 null 时，忽略该事件
      if (isChildOf(e.relatedTarget, wrapperRef.current) || !e.relatedTarget) {
        return;
      }
      setOuterActive(false);
      connectTreeModelService.handleTreeBlur();
    },
    [wrapperRef.current],
  );

  useEffect(() => {
    wrapperRef.current?.addEventListener('blur', handleBlur, true);
    if (wrapperRef.current) {
      fileTreeService.initContextKey(wrapperRef.current);
    }
    return () => {
      wrapperRef.current?.removeEventListener('blur', handleBlur);
      connectTreeModelService.handleTreeBlur();
    };
  }, [wrapperRef.current]);

  useEffect(() => {
    if (!filterMode) {
      if (connectTreeModelService.fileTreeHandle) {
        connectTreeModelService.fileTreeHandle.clearFilter();
      }
      if (connectTreeModelService.selectedFiles.length === 1) {
        // 单选情况下定位到对应文件或目录
        connectTreeModelService.location(connectTreeModelService.selectedFiles[0].uri);
      }
    }
  }, [filterMode]);

  useEffect(() => {
    const disposeCollection = new DisposableCollection();
    if (model) {
      disposeCollection.push(
        connectTreeModelService.onDidFocusedFileChange((e) => {
          if (e) {
            if (e.isEqual((model?.root as ServerNode).uri)) {
              if (!outerActive) {
                setOuterActive(!outerActive);
              }
            } else {
              if (outerActive) {
                setOuterActive(!outerActive);
              }
            }
          } else if (!e) {
            if (outerActive) {
              setOuterActive(!outerActive);
            }
          }
        }),
      );
      disposeCollection.push(
        connectTreeModelService.onDidContextMenuFileChange((e) => {
          if (e) {
            if (e.isEqual((model?.root as ServerNode).uri)) {
              if (!outerActive) {
                setOuterActive(!outerActive);
              }
            } else {
              if (outerActive) {
                setOuterActive(!outerActive);
              }
            }
          } else if (!e) {
            if (outerActive) {
              setOuterActive(!outerActive);
            }
          }
        }),
      );
    }
    return () => {
      disposeCollection.dispose();
    };
  }, [model, outerActive]);

  const beforeFilterValueChange = useCallback(async () => {
    const { expandAllCacheDirectory } = connectTreeModelService;
    await expandAllCacheDirectory();
  }, [connectTreeModelService]);

  const ensureIsReady = useCallback(async () => {
    await connectTreeModelService.whenReady;
    if (connectTreeModelService.treeModel) {
      // 确保数据初始化完毕，减少初始化数据过程中多次刷新视图
      // 这里需要重新取一下treeModel的值确保为最新的TreeModel
      await connectTreeModelService.treeModel.root.ensureLoaded();
    }
    if (!disposableRef.current?.disposed) {
      setIsReady(true);
    }
  }, [connectTreeModelService, disposableRef.current]);

  const handleTreeReady = useCallback(
    (handle: IRecycleTreeFilterHandle) => {
      connectTreeModelService.handleTreeHandler({
        ...handle,
        getModel: () => connectTreeModelService.treeModel,
        hasDirectFocus: () => wrapperRef.current === document.activeElement,
      });
    },
    [wrapperRef.current, model],
  );

  const handleOuterClick = useCallback(() => {
    // 空白区域点击，取消焦点状态
    const { handleItemClick } = connectTreeModelService;
    handleItemClick();
  }, []);

  const handleFocus = useCallback(() => {
    // 文件树焦点
    const { handleTreeFocus } = connectTreeModelService;
    handleTreeFocus();
  }, []);

  const handleOuterContextMenu = useCallback((ev: MouseEvent) => {
    const { handleContextMenu } = connectTreeModelService;
    // 空白区域右键菜单
    handleContextMenu(ev);
  }, []);

  const handleOuterDragStart = useCallback((ev: DragEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
  }, []);

  const handleOuterDragOver = useCallback((ev: DragEvent) => {
    ev.preventDefault();
    // setOuterDragOver(true);
  }, []);

  const handleOuterDragLeave = useCallback(() => {
    // setOuterDragOver(false);
  }, []);

  const handleOuterDrop = useCallback((ev: DragEvent) => {
    const { handleDrop } = connectTreeModelService.dndService;
    // setOuterDragOver(false);
    handleDrop(ev);
  }, []);

  const handleContextMenu = useCallback(
    (ev: MouseEvent, node: ServerNode | ServerEntity, type: TreeNodeType, activeUri?: URI) => {
      const { handleContextMenu } = connectTreeModelService;
      handleContextMenu(ev, node, activeUri);
    },
    [],
  );

  return (
    <div
      className={cls(styles.file_tree, outerActive && styles.outer_active)} //outerDragOver && styles.outer_drag_over,
      tabIndex={-1}
      ref={wrapperRef}
      onClick={handleOuterClick}
      onFocus={handleFocus}
      onContextMenu={handleOuterContextMenu}
      draggable={true}
      onDragStart={handleOuterDragStart}
      onDragLeave={handleOuterDragLeave}
      onDragOver={handleOuterDragOver}
      onDrop={handleOuterDrop}
    >
      <FileTreeView
        isLoading={isLoading}
        isReady={isReady}
        height={height}
        model={model}
        iconTheme={iconTheme}
        treeIndent={treeIndent}
        filterMode={filterMode}
        customSearch={<FilterSearchView {...customSearch} />}
        locationToCurrentFile={locationToCurrentFile}
        beforeFilterValueChange={beforeFilterValueChange}
        onTreeReady={handleTreeReady}
        onContextMenu={handleContextMenu}
        onItemClick={handleItemClicked}
        onItemDoubleClick={handleItemDoubleClicked}
        onTwistierClick={handleTwistierClick}
      />
    </div>
  );
};

interface FileTreeViewProps {
  model?: TreeModel;
  isReady: boolean;
  isLoading: boolean;
  height: number;
  filterMode: boolean;
  treeIndent: ITreeIndent;
  customSearch?: React.ReactNode;
  iconTheme: {
    hasFolderIcons: boolean;
    hasFileIcons: boolean;
    hidesExplorerArrows: boolean;
  };
  onTreeReady: (handle: IRecycleTreeFilterHandle) => void;
  beforeFilterValueChange: () => Promise<void>;
  locationToCurrentFile: (location: string) => void;

  onItemClick(event: MouseEvent, item: ServerNode | ServerEntity, type: TreeNodeType, activeUri?: URI): void;

  onItemDoubleClick(event: MouseEvent, item: ServerNode | ServerEntity, type: TreeNodeType, activeUri?: URI): void;

  onContextMenu(ev: MouseEvent, node: ServerNode | ServerEntity, type: TreeNodeType, activeUri?: URI): void;

  onTwistierClick(ev: MouseEvent, item: ServerNode): void;
}

const FileTreeView = memo(
  ({
    isReady,
    isLoading,
    height,
    model,
    filterMode,
    treeIndent,
    iconTheme,
    onTreeReady,
    onItemClick,
    onItemDoubleClick,
    onContextMenu,
    onTwistierClick,
    beforeFilterValueChange,
    customSearch,
  }: FileTreeViewProps) => {
    const filetreeService = useInjectable<ConnectTreeService>(IConnectTreeServiceToken);
    const { decorationService, locationToCurrentFile } = filetreeService;
    const connectTreeModelService = useInjectable<ConnectTreeModelService>(ConnectTreeModelService);

    // 直接渲染节点不建议通过 Inline 的方式进行渲染
    // 否则每次更新时均会带来比较大的重绘成本
    // 参考：https://github.com/bvaughn/react-window/issues/413#issuecomment-848597993
    const renderFileTreeNode = useCallback(
      (props: INodeRendererWrapProps) => {
        //console.log('file-tree main', props.item , props.item instanceof PromptHandle)
        return (
          <ConnectTreeNodeView
            item={props.item}
            itemType={props.itemType}
            template={(props as any).template}
            decorationService={decorationService}
            //labelService={labelService}
            dndService={connectTreeModelService.dndService}
            decorations={connectTreeModelService.decorations.getDecorations(props.item as any)}
            onClick={onItemClick}
            onDoubleClick={onItemDoubleClick}
            onTwistierClick={onTwistierClick}
            onContextMenu={onContextMenu}
            defaultLeftPadding={treeIndent.baseIndent}
            leftPadding={treeIndent.indent}
            hasPrompt={props.hasPrompt}
            hasFolderIcons={iconTheme.hasFolderIcons}
            hasFileIcons={iconTheme.hasFileIcons}
            hidesExplorerArrows={iconTheme.hidesExplorerArrows}
          />
        );
      },
      [model, treeIndent, iconTheme],
    );

    if (isReady) {
      if (isLoading) {
        return <ProgressBar loading />;
      } else if (model) {
        return (
          <>
            <FilterableRecycleTree
              height={height}
              itemHeight={FILE_TREE_NODE_HEIGHT}
              onReady={onTreeReady}
              model={model}
              filterEnabled={filterMode}
              beforeFilterValueChange={beforeFilterValueChange}
              filterAfterClear={locationToCurrentFile}
              filterAutoFocus={true}
              leaveBottomBlank={true}
              customSearch={customSearch}
            >
              {renderFileTreeNode}
            </FilterableRecycleTree>
          </>
        );
      } else {
        return <WelcomeView viewId='server-recent' />;
      }
    } else {
      return <ProgressBar loading />;
    }
  },
);

FileTreeView.displayName = 'FileTreeView';
