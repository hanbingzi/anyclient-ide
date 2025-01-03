import React from 'react';

import { observer } from 'mobx-react-lite';
import { IServerEditService } from '../common';
import { useInjectable } from '@opensumi/ide-core-browser';

import { ConfigProvider } from 'antd';
//import '@opensumi/antd-theme/lib/index.css';
import ServerEditView from './server-edit.view';
import { Overlay } from '@opensumi/ide-components';
import ServerSelectView from './server-select.view';
import { localize } from '@opensumi/ide-core-common';

const ServerInfoView = observer(() => {
  const serverEditService = useInjectable<IServerEditService>(IServerEditService);

  return (
    // @ts-ignore
    //serverEditService.isVisible()
    <Overlay
      title={localize('server.new')}
      visible={serverEditService.isVisible()}
      onClose={() => {
        serverEditService.hide();
      }}
      afterClose={() => {
        serverEditService.reset();
      }}
      // centered
      width={696}
    >
      <ConfigProvider prefixCls='sumi_antd'>
        {serverEditService.pageState === 'select' ? <ServerSelectView /> : <ServerEditView />}
      </ConfigProvider>
    </Overlay>
  );
});

export default ServerInfoView;
