import { Injectable, Provider } from '@opensumi/di';
import { BrowserModule } from '@opensumi/ide-core-browser';
import { ToolbarOptionContribution } from './toolbar.contribution';
import { ToolbarSlotContribution } from './toolbar.contribution';
import { DbSelectService } from './db-select.service';
import { IDbSelectServiceToken, IPreviewControllerServiceToken } from '../common';
import { PreviewControllerService } from './preview-controller.service';

@Injectable()
export class ToolbarOptionModule extends BrowserModule {
  providers: Provider[] = [
    ToolbarOptionContribution,
    //electron里面需要注掉
    //ToolbarSlotContribution,
    {
      token: IDbSelectServiceToken,
      useClass: DbSelectService,
    },
    {
      token: IPreviewControllerServiceToken,
      useClass: PreviewControllerService,
    },
  ];
}
