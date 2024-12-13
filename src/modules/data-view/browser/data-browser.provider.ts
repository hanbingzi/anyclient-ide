import { Autowired, Injectable } from '@opensumi/di';
import { URI } from '@opensumi/ide-core-browser';
import { IResource, IResourceProvider } from '@opensumi/ide-editor';
import { IconType, IIconService } from '@opensumi/ide-theme';
import { AllNodeType, ServerType } from '../../base/types/server-node.types';
import { ServerIconFinder } from '../../base/config/server-icon.config';
import { OpenOption, OpenViewParam } from '../../base/param/open-view.param';
import { IServerService, IServerServiceToken, ServerInfo } from '../../local-store-db/common';
import { IConnectTreeServiceToken } from '../../open-recent';
import { ConnectTreeService } from '../../open-recent/browser/connect-tree.service';
import { DATA_BROWSER_ID } from './data-browser.contribute';
import { ServerTypeClass } from '../../base/config/server.config';

@Injectable()
export class DataBrowserResourceProvider implements IResourceProvider {
  @Autowired(IIconService)
  public readonly iconService: IIconService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IConnectTreeServiceToken)
  private readonly connectTreeService: ConnectTreeService;

  scheme = DATA_BROWSER_ID;

  async provideResource(uri: URI): Promise<IResource<OpenViewParam>> {
    const { nodeName, nodeValue, serverId, serverType, db, dbName, schema, nodeType, option, path, extra } =
      uri.getParsedQuery();
    // console.log('provideResource:', nodeName, serverId, db, dbName, server, nodeType, option, path);
    // const originalUri = new URI(original);
    // const modifiedUri = new URI(modified);
    const icon = this.iconService.fromIcon(
      '',
      ServerIconFinder.getServerIconBase64(serverType as ServerType, nodeType as AllNodeType),
      IconType.Base64,
    )!;
    // this.modifiedToResource.set(modifiedUri.toString(), uri);
    const breadCrumb = this.connectTreeService.getBreadCrumb(path);
    const title = this.getTitle(
      option as OpenOption,
      serverType as ServerType,
      nodeType as AllNodeType,
      nodeName,
      dbName,
      db,
    );
    const server: ServerInfo = await this.serverService.findById(serverId,true);
    //只有事先命名的，才需要添加此菜单--tables，
    if (option === 'create' && nodeType === 'tables') {
      breadCrumb.push({ name: nodeName, serverType: serverType as ServerType, nodeType: nodeType as AllNodeType });
    }
    return {
      name: title,
      uri,
      icon,
      metadata: {
        server,
        nodeName,
        nodeValue,
        serverId,
        serverType: serverType as ServerType,
        db,
        schema,
        //server: server as ServerType,
        nodeType: nodeType as AllNodeType,
        option: option as OpenOption,
        path,
        breadCrumb,
        extra,
      },
    };
  }

  // async shouldCloseResource(resource, openedResources): Promise<boolean> {
  // const { modified } = resource.uri.getParsedQuery();
  // const modifiedUri = new URI(modified);
  // const modifiedResource = await this.resourceService.getResource(modifiedUri);
  // if (modifiedResource) {
  //     return await this.resourceService.shouldCloseResource(modifiedResource, openedResources);
  // }
  //     return true;
  // }

  public getTitle(
    option: OpenOption,
    serverType: ServerType,
    nodeType: AllNodeType,
    nodeName: string,
    dbName: string,
    db: string | number,
  ): string {
    //console.log('getTitle', option, serverType, nodeType, nodeName, dbName);
    const dbNameTitle = dbName ? `@${dbName}` : db ? `@${db}` : '';
    let optionName = '';
    if (option === 'create') {
      if (serverType === 'Kafka' && (nodeType === 'topics' || nodeType === 'topic')) {
        optionName = '新建topic';
      } else if (ServerTypeClass.Relational.includes(serverType)) {
        if (nodeType === 'server') {
          optionName = '新建库';
        } else if (nodeType === 'schema') {
          optionName = '新建Schema';
        } else if (nodeType === 'table') {
          optionName = '新建表';
        }
      } else if (serverType === 'Redis' || serverType==='Etcd') {
        return `${dbNameTitle}(新建Key)`;
      }
    } else if (option === 'edit') {
      if (ServerTypeClass.Relational.includes(serverType)) {
        if (nodeType === 'table') {
          optionName = '编辑表';
        }
      }
    }
    if (optionName !== '') {
      optionName = `(${optionName})`;
    }
    return `${nodeName}${dbNameTitle}${optionName}`;
  }
}
