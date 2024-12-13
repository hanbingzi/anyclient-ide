import { INodeIcon } from '../server-icon.config';
import { Kafka } from '../../../icons/server';
import { ICON_RESOURCE_PATH } from '../../icon';
import {
  Broker,
  Broker_base64,
  Folder,
  Folder_base64,
  FolderOpened,
  Group,
  Group_base64,
  Kafka_base64,
  Status,
  Status_base64,
  Topic,
  Topic_base64,
} from '../../../icons/node';
import React from 'react';


export const KafkaIconSetting: INodeIcon = {
  icon: <Kafka />,
  iconPath: ICON_RESOURCE_PATH.Kafka,
  base64: Kafka_base64,
  children: {
    status: {
      hasFolderIcon: false,
      icon: <Status />,
      base64: Status_base64,
    },
    kafkaBrokers: {
      hasFolderIcon: false,
      icon: <Broker />,
    },
    kafkaBroker: {
      hasFolderIcon: false,
      icon: <Broker />,
      base64: Broker_base64,
    },
    topics: {
      hasFolderIcon: true,
      icon: <Folder />,
      openIcon: <FolderOpened />,
      closeIcon: <Folder />,
      base64: Folder_base64,
    },
    topic: {
      hasFolderIcon: false,
      icon: <Topic />,
      base64: Topic_base64,
    },
    groups: {
      hasFolderIcon: false,
      icon: <Group />,
    },
    group: {
      hasFolderIcon: false,
      icon: <Group />,
      base64: Group_base64,
    },
  },
};
