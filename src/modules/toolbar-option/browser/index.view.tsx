import * as React from 'react';
import styles from './index.module.less';
import { DbSelect } from './db-select.view';
import { Portrait } from './portrait.view';
import cls from 'classnames';
import { Button, getIcon } from '@opensumi/ide-components';
import { CommandService, localize } from '@opensumi/ide-core-common';
import { useInjectable } from '@opensumi/ide-core-browser';
import { useCallback } from 'react';
import { ServerCommandIds } from '../../base/command/menu.command';

export const ToolBarView = () => {
  const commandService = useInjectable<CommandService>(CommandService);
  const handleServerNew = () => {
    commandService.executeCommand(ServerCommandIds.newServer.id);
  };
  const handleQueryNew = () => {
    commandService.executeCommand(ServerCommandIds.newQuery.id);
  };

  return (
    <div className={styles['toolbar-container']}>
      {/*electron要放开*/}
      <div className={styles['toolbar-left']}>
        <div className={cls(styles['toolbar-item'], styles['toolbar-item-button'])} onClick={handleServerNew}>
          <Button iconClass={getIcon('plus')} size={'small'}>
            {localize('server.new')}
          </Button>
        </div>
        {/*<div className={cls(styles['toolbar-item'], styles['toolbar-item-button'])}>*/}
        {/*  <Button iconClass={getIcon('search')} size={'small'} onClick={handleQueryNew}>*/}
        {/*    {localize('query.new')}*/}
        {/*  </Button>*/}
        {/*</div>*/}
      </div>
      <DbSelect />
      <Portrait />
    </div>
  );
};

export const TestAction = () => {
  return <div>11111</div>;
};
