import { Autowired, Injectable } from '@opensumi/di';
import { observable } from 'mobx';
import { IWorkspaceService } from '@opensumi/ide-workspace';

export const ISelectWorkspaceService = Symbol('ISelectWorkspaceService');

export interface ISelectWorkspaceService {
  /**
   * 窗口是否课件
   */
  isVisible(): boolean;

  getRecentWorkspaces(): string[];

  /**
   * 打开窗口
   */
  open();

  /**
   * 关闭窗口
   */
  hide();
}

@Injectable()
export class SelectWorkspaceService implements ISelectWorkspaceService {
  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @observable
  protected visible = false;

  @observable
  protected recentWorkspaces: string[] = [];

  isVisible(): boolean {
    return this.visible;
  }

  getRecentWorkspaces(): string[] {
    return this.recentWorkspaces;
  }

  async open() {
    this.visible = true;
    this.recentWorkspaces = await this.workspaceService.getMostRecentlyUsedWorkspaces();
  }

  hide() {
    this.visible = false;
  }

  // async recentWorkspaces():Promise<string[]>{
  //  const workspaces =  await this.workspaceService.getMostRecentlyUsedWorkspaces();
  //console.log('workspaces--->',workspaces)
  //  return workspaces;
  // }
}
