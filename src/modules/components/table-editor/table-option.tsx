import React, { useCallback } from 'react';
import styles from './table-option.module.less';
import cls from 'classnames';
import { DataOptionProps } from './table-editor.types';
import debounceUtil from '../../base/utils/debounce-util';
import { Icon } from '@opensumi/ide-core-browser/lib/components';
import { Input } from '@opensumi/ide-components';

export const TableOption = (props: DataOptionProps) => {
  const {
    //按钮展示
    search,
    add,
    remove,
    save,
    revert,
    cancel,
    refresh,
    filter,
    upRow,
    downRow,
    //控制按钮开启关闭
    enableRemove,
    enableSave,
    enableRevert,
    enableCancel,
    enableUpRow,
    enableDownRow,
    enableFilterSearch,
    //按钮操作
    setSearchWord,
    optionView,
    onAdd,
    onRemove,
    onSave,
    onRevert,
    onCancel,
    onFilter,
    onRefresh,
    onUpRow,
    onDownRow,
    onFilterSearch,
  } = props;
  const location = optionView?.location;
  const customView = optionView?.view;

  const debounceCalcValue = useCallback(
    debounceUtil((keyword: string) => {
      setSearchWord(keyword);
    }, 600),
    [],
  );

  const handleSearchChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = ev.target.value;
      console.log(ev.target.value);

      debounceCalcValue(inputValue);
    },
    [search],
  );

  const renderSearch = useCallback(() => {
    return search ? (
      <div className={cls(styles['opt-item'])}>
        <Input
          placeholder={'搜索'}
          addonAfter={<Icon icon={'search'} className={cls('kt-clickable-icon')} />}
          size={'small'}
          //   value={searchWord}
          onChange={(ev) => handleSearchChange(ev)}
        />
      </div>
    ) : null;
  }, [search]);

  const renderAdd = useCallback(() => {
    return add ? (
      <div className={styles['opt-item-icon']} onClick={()=>onAdd()}>
        {/*<VscAdd/>*/}
        <Icon
          tooltip={'新增'}
          disabled={false}
          icon={'plus'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('icon', 'kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [add, onAdd]);

  const renderRemove = useCallback(() => {
    return remove ? (
      <div className={styles['opt-item-icon']}>
        {/*<VscRemove/>*/}
        <Icon
          tooltip={'删除'}
          disabled={!enableRemove}
          icon={'minus'}
          // onClick={loading || disabled ? noop : onRemove}
          onClick={()=>onRemove()}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [remove, enableRemove, onRemove]);

  const renderSave = useCallback(() => {
    return save ? (
      <div className={styles['opt-item-icon']} onClick={onSave}>
        {/*<VscCheck/>*/}
        <Icon
          tooltip={'保存'}
          disabled={!enableSave}
          icon={'check'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [save, enableSave, onSave]);

  const renderRevert = useCallback(() => {
    return save ? (
      <div className={styles['opt-item-icon']} onClick={onRevert}>
        {/*<VscDiscard/>*/}
        <Icon
          tooltip={'撤销更改'}
          disabled={!enableRevert}
          icon={'rollback'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [revert, onRevert, enableRevert]);

  const renderCancel = useCallback(() => {
    return cancel ? (
      <div className={styles['opt-item-icon']} onClick={onCancel}>
        {/*<VscDiscard/>*/}
        <Icon
          tooltip={'取消'}
          disabled={!enableCancel}
          icon={'close'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('icon', 'kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [cancel, onCancel, enableCancel]);

  const renderRefresh = useCallback(() => {
    return refresh ? (
      <div className={styles['opt-item-icon']} onClick={onRefresh}>
        {/*<VscRefresh/>*/}
        <Icon
          tooltip={'刷新'}
          disabled={false}
          icon={'sync'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [refresh, onRefresh]);

  const renderFilter = useCallback(() => {
    return filter ? (
      <div className={styles['opt-item-icon']} onClick={onFilter}>
        {/*<VscFilter/>*/}
        <Icon
          tooltip={'过滤'}
          disabled={false}
          icon={'filter'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [filter, enableFilterSearch]);

  const renderFilterSearch = useCallback(() => {
    return filter ? (
      <div className={styles['opt-item-icon']} onClick={onFilterSearch}>
        {/*<VscFilter/>*/}
        <Icon
          tooltip={'search'}
          disabled={!enableFilterSearch}
          icon={'search'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [filter, enableFilterSearch, onFilterSearch]);

  const renderUpRow = useCallback(() => {
    return upRow ? (
      <div className={styles['opt-item-icon']} onClick={onUpRow}>
        {/*<VscArrowUp/>*/}
        <Icon
          tooltip={'上移'}
          disabled={false}
          icon={'arrowup'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [upRow, onUpRow]);

  const renderDownRow = useCallback(() => {
    return downRow ? (
      <div className={styles['opt-item-icon']} onClick={onDownRow}>
        {/*<VscArrowDown/>*/}

        <Icon
          tooltip={'下移'}
          disabled={false}
          icon={'arrowdown'}
          //  onClick={loading || disabled ? noop : onClick}
          className={cls('kt-clickable-icon', styles['file_icon'])}
        />
      </div>
    ) : null;
  }, [downRow, onDownRow]);

  return (
    <div className={styles['data-opt-container']}>
      {location === 'start' ? customView : null}
      {renderSearch()}
      {location === 'afterSearch' ? customView : null}
      {renderAdd()}
      {renderRemove()}
      {renderSave()}
      {renderRevert()}
      {renderCancel()}
      {renderRefresh()}
      {renderFilter()}
      {renderFilterSearch()}
      {renderUpRow()}
      {renderDownRow()}
      {location === 'end' ? customView : null}
    </div>
  );
};
