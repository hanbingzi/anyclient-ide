import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@opensumi/ide-components';
import { LabelInput } from '../../../components/form';
import { IQueryResult, TopicCreateParam } from '../../../server-client/common';
import { AlertView } from '../../../components/alert/alert.view';
import styles from './index.module.less';
import { useInjectable } from '@opensumi/ide-core-browser';
import { TopicViewService } from './topic-view.service';
import { WindowsTitle } from '../../../components/title';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import { IBaseState } from '../../common/data-browser.types';

export const TopicCreateView = ({ openUri, nodeName, nodePath, serverId, serverType, nodeType }: IBaseState) => {
  const [topicParam, setTopicParam] = useState<TopicCreateParam>({ topic: '', numPartitions: 1, replicationFactor: 1 });
  const [result, setResult] = useState<IQueryResult | null>();
  const topicViewService = useInjectable<TopicViewService>(TopicViewService);

  useEffect(() => {
    topicViewService.init(openUri, nodeName, nodePath, serverId, nodeType);
  }, []);

  const handleSave = useCallback(
    async (closeTab: boolean = false) => {
      // console.log('handleSave:',topicParam)
      if (!topicParam.topic) {
        return;
      }
      const result = await topicViewService.saveTopic(topicParam, closeTab);
      setResult(result);
    },
    [topicParam, topicViewService],
  );

  return (
    <div className={styles['input-container']}>
      <WindowsTitle title={'topic创建'} icon={ServerIconFinder.getServerIcon(serverType, 'topic')} />
      <LabelInput
        label={'Topic'}
        value={topicParam.topic}
        required={true}
        message={'连接名不能为空'}
        style={{ marginTop: '22px' }}
        onValueChange={(value) => {
          result && setResult(null);
          setTopicParam({ ...topicParam, topic: value });
        }}
      />
      <LabelInput
        label={'Partitions'}
        value={String(topicParam.numPartitions)}
        type={'number'}
        style={{ marginTop: '22px' }}
        onValueChange={(value) => {
          result && setResult(null);
          setTopicParam({ ...topicParam, numPartitions: Number(value) });
        }}
      />
      <LabelInput
        label={'Replication'}
        value={String(topicParam.replicationFactor)}
        type={'number'}
        style={{ marginTop: '22px' }}
        onValueChange={(value) => {
          result && setResult(null);
          setTopicParam({ ...topicParam, replicationFactor: Number(value) });
        }}
      />

      <div className={styles['opt-message']}>
        {result ? (
          result.success ? (
            <AlertView message={'topic创建成功'} type={'success'} />
          ) : (
            <AlertView message={result.message} type={'error'} />
          )
        ) : null}
      </div>

      <div className={styles['opt-button']}>
        <Button type={'primary'} onClick={() => handleSave()}>
          保存
        </Button>
        <Button type={'primary'} style={{ marginLeft: '10px' }} onClick={() => handleSave(true)}>
          保存成功后关闭窗口
        </Button>
      </div>
    </div>
  );
};
