import { Autowired, Injectable } from '@opensumi/di';
import { ITodoServiceClient, ITodoClientPath } from '../common';
import { IDialogService, IMessageService } from '@opensumi/ide-overlay';
import { localize } from '@opensumi/ide-core-common';

@Injectable()
export class TodoService {
  @Autowired(ITodoClientPath)
  private todoClient: ITodoServiceClient;



  @Autowired(IDialogService)
  private readonly dialogService: IDialogService;

  public async test() {
    console.log('============test====================');
    //this.dialogService.info('',)

    //console.log('----<',result)
  }

  public async query() {
    //console.log('能开始调用');
  }
}
