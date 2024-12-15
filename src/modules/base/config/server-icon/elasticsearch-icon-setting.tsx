import React from 'react';
import { INodeIcon } from '../server-icon.config';
import { Elasticsearch } from '../../../icons/server';
import { ICON_RESOURCE_PATH } from '../../icon';
import {
  Cluster,
  Cluster_base64,
  Elasticsearch_base64,
  Es_index_base64,
  IndexIcon,
  Indexs,
  Status,
  Status_base64,
} from '../../../icons/node';

export const ElasticsearchIconSetting: INodeIcon = {
  icon: <Elasticsearch />,
  iconPath: ICON_RESOURCE_PATH.Elasticsearch,
  base64: Elasticsearch_base64,
  children: {
    status: {
      hasFolderIcon: false,
      icon: <Status />,
      base64: Status_base64,
    },
    cluster: { hasFolderIcon: false, icon: <Cluster />, base64: Cluster_base64 },
    indexs: { hasFolderIcon: false, icon: <Indexs />, base64: Cluster_base64 },
    index: { hasFolderIcon: false, icon: <IndexIcon />, base64: Es_index_base64 },

  },
};

