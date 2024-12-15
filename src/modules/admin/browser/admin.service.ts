import { Autowired, Injectable } from '@opensumi/di';
import { IAdminClientServicePath } from '../common';
import { AdminClientService } from '../node/admin-client.service';
import { localize } from '@opensumi/ide-core-common';
import { IMessageService } from '@opensumi/ide-overlay';
import { IProductVersionServiceToken } from '../../local-store-db/common';
import { ProductVersionService } from '../../local-store-db/browser/product-version.service';
import { AppConstants } from '../../../common/constants';

@Injectable()
export class AdminService {
  @Autowired(IAdminClientServicePath)
  private readonly adminClientService: AdminClientService;

  @Autowired(IProductVersionServiceToken)
  private productVersionService: ProductVersionService;

  @Autowired(IMessageService)
  protected readonly messages: IMessageService;

  public async onStart() {
    setTimeout(() => {
      //console.log('--------admin start--------');
      //this.adminClientService.login();
      //this.adminClientService.onStart();
    }, 3000);
  }

  public async onClose() {
   // this.adminClientService.onDestroy();
  }

  public async checkUpdate() {
    if (AppConstants.Electron || process.env.NODE_ENV === 'development') {
      setTimeout(async () => {
        const checkResult = await this.adminClientService.checkUpdate();
        console.log('checkResult->', checkResult);
        if (checkResult.expire) {
          const ignore = localize('ignore.version');
          const ok = localize('ButtonOK');
          const result = await this.messages.info('发现新的版本，是否前往官网下载', [ignore, ok]);
          if (result === ok) {
            //console.log('打开官网');
          } else if (result === ignore) {
            //console.log('ignore');
            this.productVersionService.ignoreVersion(checkResult.latestVersion);
          }
        }
      }, 3000);
    }
  }
}
