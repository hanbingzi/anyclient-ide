import styles from './index.module.less';
import cls from 'classnames';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { Icon } from '@opensumi/ide-components';
import { useInjectable } from '@opensumi/ide-core-browser';
import { IPreviewControllerServiceToken } from '../common';
import { PreviewControllerService } from './preview-controller.service';
import { SearchPreviewPosition } from '../../base/types/layout.types';

export const Portrait = () => {
  const previewControllerService = useInjectable<PreviewControllerService>(IPreviewControllerServiceToken);

  const previewHandle = useCallback((position: SearchPreviewPosition) => {
    previewControllerService.controlPreviewPosition(position);
  }, []);

  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  return (
    <div className={styles['toolbar-right']}>
      <div className={cls(styles['toolbar-icon'])}>
        <Icon
          icon={'dock-down'}
          onClick={() => {
            previewHandle(SearchPreviewPosition.BOTTOM);
          }}
        />
      </div>
      <div className={cls(styles['toolbar-icon'])}>
        <Icon
          icon={'dock-right'}
          onClick={() => {
            previewHandle(SearchPreviewPosition.RIGHT);
          }}
        />
      </div>
      <div className={cls(styles['toolbar-icon'])}>
        <a href={'https://github.com/hanbingzi/anyclient-ide'} target={'_blank'}>
          <Icon
            icon={'github-fill'}
          />
        </a>
      </div>
      {/*<div className={cls(styles['toolbar-icon'] )}>*/}
      {/*  <IconSvg icon={<Wechat/>} size={"large"} shadow={false}/>*/}
      {/*</div>*/}
      <div className={cls(styles['toolbar-item-box'])}>
        <div className={styles['head-portrait']}
             onMouseEnter={handleMouseEnter}
             onMouseLeave={handleMouseLeave}>
        </div>
      </div>
      {isHovered ?
        <div
          className={styles['popup-content']}

        >
          <p>捐献作者</p>
          <p>开源创作不易，请多支持.</p>
          <div className={styles['pay-content']}>
          </div>
        </div>
        : null}

    </div>
  );
};
