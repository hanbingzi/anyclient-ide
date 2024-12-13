import React, { useCallback, useEffect, useState } from 'react';
import { Button, Select } from '@opensumi/ide-components';
import { useInjectable } from '@opensumi/ide-core-browser';
import { LabelInput, LabelItem } from '../../../components/form';
import { IQueryResult } from '../../../server-client/common';
import { AlertView } from '../../../components/alert/alert.view';
import { TopicViewService } from './topic-view.service';
import { WindowsTitle } from '../../../components/title';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import styles from './index.module.less';
import { DateTimePicker } from '../../../components/date-picker';
import moment from 'moment';
import { DateUtil } from '../../../base/utils/date-util';
import { IBaseState } from '../../common/data-browser.types';

export const TopicAddMessageView = ({ openUri, nodeName, nodePath, serverId, serverType, nodeType }: IBaseState) => {
  const [result, setResult] = useState<IQueryResult | null>();
  const [key, setKey] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<moment.Moment>(moment(new Date(), DateUtil.DATETIME_STR));
  const [partition, setPartition] = useState<string>('0');
  const [partitionOption, setPartitionOption] = useState<string[]>([]);
  const [isSubmit, setIsSubmit] = useState<boolean>(false);

  const topicViewService = useInjectable<TopicViewService>(TopicViewService);

  useEffect(() => {
    topicViewService.init(openUri, nodeName, nodePath, serverId, nodeType);
    ensureIsReady();
  }, [topicViewService]);

  const ensureIsReady = useCallback(async () => {
    await topicViewService.whenReady;
    //加载partition；
    const queryPartitions = await topicViewService.getTopicPartition();
    const partitionOption = queryPartitions.map((value) => String(value.partitionId));
    setPartitionOption(partitionOption);
  }, [topicViewService]);

  const handleSave = useCallback(
    async (closeTab: boolean = false) => {
      //console.log('handleSave:',currentDate.format(DateUtil.DATETIME_STR))
      setIsSubmit(true);
      if (!value) {
        return;
      }
      const result = await topicViewService.addMessage(
        {
          key,
          value,
          partition: Number(partition),
          //timestamp: currentDate ? currentDate : ''
        },
        closeTab,
      );
      if (!closeTab) {
        setIsSubmit(false);
        setResult(result);
        if (result.success && !closeTab) {
          setKey('');
          setValue('');
          //setCurrentDate('')
        }
      }
    },
    [key, value, currentDate, partition, topicViewService],
  );

  return (
    <div className={styles['input-container']}>
      <WindowsTitle title={'topic创建'} icon={ServerIconFinder.getServerIcon(serverType, 'topic')} />
      <LabelInput
        label={'Key'}
        value={key}
        onValueChange={(value) => {
          result && setResult(null);
          setKey(value);
        }}
      />
      <LabelInput
        label={'Value'}
        value={value}
        onValueChange={(value) => {
          result && setResult(null);
          setValue(value);
        }}
      />
      <LabelItem label={'Timestamp'}>
        <DateTimePicker
          onChange={(date, dateString) => setCurrentDate(date!)}
          //showTime={true}
          //defaultValue={currentDate}
          value={currentDate}
        />
      </LabelItem>

      <LabelItem label={'Partition'}>
        <Select
          options={partitionOption}
          onChange={(value) => {
            setPartition(value);
          }}
          value={partition}
          size={'default'}
        />
      </LabelItem>

      <div className={styles['opt-message']}>
        {result ? (
          result.success ? (
            <AlertView message={'message新增成功'} type={'success'} />
          ) : (
            <AlertView message={result.message} type={'error'} />
          )
        ) : null}
      </div>

      <div className={styles['opt-button']}>
        <Button type={'primary'} onClick={() => handleSave()} disabled={isSubmit}>
          保存
        </Button>
        <Button type={'primary'} style={{ marginLeft: '10px' }} disabled={isSubmit} onClick={() => handleSave(true)}>
          保存成功后关闭窗口
        </Button>
      </div>
    </div>
  );
};
