import { Autowired, Injectable } from '@opensumi/di';
import { IResource, IResourceProvider } from '@opensumi/ide-editor';
import { URI } from '@opensumi/ide-core-browser';
import { ServerInfo } from '../../../local-store-db/common';
import { IconType, IIconService } from '@opensumi/ide-theme';
import { ServerIconFinder } from '../../../base/config/server-icon.config';
import { IServerService, IServerServiceToken } from '../../../local-store-db/common';

@Injectable()
export class ServerInfoResourceProvider implements IResourceProvider {
  // @Autowired()
  // private labelService: LabelService;

  // @Autowired(ResourceService)
  // private resourceService: ResourceService;

  @Autowired(IServerServiceToken)
  private readonly serverService: IServerService;

  @Autowired(IIconService)
  public readonly iconService: IIconService;

  scheme = 'serverInfo';

  async provideResource(uri: URI): Promise<IResource<{ serverInfo: ServerInfo }>> {
    console.log('--->ServerInfoResourceProvider');
    const { id } = uri.getParsedQuery();
    const serverInfo = await this.serverService.findById(id);
    //const originalUri = new URI(original);
    //const modifiedUri = new URI(modified);
    //const icon = await this.labelService.getIcon(originalUri);
    //this.modifiedToResource.set(modifiedUri.toString(), uri);
    // console.log('--provider-->',id,serverInfo)
    const icon = this.iconService.fromIcon(
      '',
      ServerIconFinder.getServerIconBase64(serverInfo.serverType!),
      IconType.Base64,
    )!;
    return {
      name: serverInfo.serverName!,
      uri,
      icon,
      metadata: {
        serverInfo,
      },
    };
  }

  //async shouldCloseResource(resource, openedResources): Promise<boolean> {
  // const { modified } = resource.uri.getParsedQuery();
  // const modifiedUri = new URI(modified);
  // const modifiedResource = await this.resourceService.getResource(modifiedUri);
  // if (modifiedResource) {
  //     return await this.resourceService.shouldCloseResource(modifiedResource, openedResources);
  // }
  //     return true;
  // }
}
