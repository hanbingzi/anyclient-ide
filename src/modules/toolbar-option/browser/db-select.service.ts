import { Autowired, Injectable } from '@opensumi/di';
import { Emitter, URI } from '@opensumi/ide-core-browser';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { FileSuffixArray, FileSuffixType } from '../../base/types/server-node.types';
import { DbCacheNodeService } from '../../codelens-command/browser/db-cache-node.service';
import { IDbCacheNodeServiceToken } from '../../codelens-command/common';
import { DbNode, ServerNode } from '../../base/model/cache-node.model';
import { extname } from '@opensumi/ide-utils/lib/path';
import { ServerHasDb, ServerHasSchema } from '../../base/config/server.config';
import { isEmpty } from '../../base/utils/object-util';
import { IWorkspaceService } from '@opensumi/ide-workspace';

@Injectable()
export class DbSelectService {
  @Autowired(WorkbenchEditorService)
  private readonly editorService: WorkbenchEditorService;
  //
  // @Autowired(AppConfig)
  // private readonly appConfig: AppConfig;

  @Autowired(IWorkspaceService)
  private readonly workspaceService: IWorkspaceService;

  @Autowired(IDbCacheNodeServiceToken)
  private readonly dbCacheNodeService: DbCacheNodeService;

  public static cacheOpenFileSelected: Map<string, { server: ServerNode; db?: DbNode; schema?: DbNode }> = new Map();

  /**
   * 当前打开的文件后缀
   */
  public currentFileSuffix: FileSuffixType;
  public currentActiveFileFullPath: string;

  private readonly onServerNodesChangeEmitter = new Emitter<ServerNode[]>();
  private readonly onDbNodesChangeEmitter = new Emitter<DbNode[]>();
  private readonly onSchemaNodesChangeEmitter = new Emitter<DbNode[]>();
  private readonly onSelectedServerNodeChangeEmitter = new Emitter<ServerNode | null>();
  private readonly onSelectedDbNodeChangeEmitter = new Emitter<DbNode | null>();
  private readonly onSelectedSchemaNodeChangeEmitter = new Emitter<DbNode | null>();

  private _suffix:FileSuffixType;
  private _serverNodes: ServerNode[] = [];
  private _dbNodes: DbNode[] = [];

  private _schemaNodes: DbNode[] = [];
  /**
   * 当前页面选中的
   * @private
   */
  private _selectedServerNode: ServerNode | null;
  private _selectedDbNode: DbNode | null;

  private _selectedSchemaNode: DbNode | null;

  get onServerNodesChange() {
    return this.onServerNodesChangeEmitter.event;
  }

  get onDbNodesChange() {
    return this.onDbNodesChangeEmitter.event;
  }

  get onSchemaNodesChange() {
    return this.onSchemaNodesChangeEmitter.event;
  }

  get onSelectedServerNodeChange() {
    return this.onSelectedServerNodeChangeEmitter.event;
  }

  get onSelectedDbNodeChange() {
    return this.onSelectedDbNodeChangeEmitter.event;
  }

  get onSelectedSchemaNodeChange() {
    return this.onSelectedSchemaNodeChangeEmitter.event;
  }

  get serverNodes() {
    return this._serverNodes;
  }

  get dbNodes() {
    return this._dbNodes;
  }

  get schemaNodes() {
    return this._schemaNodes;
  }

  get selectedServerNode() {
    return this._selectedServerNode;
  }

  get selectedDbNode() {
    return this._selectedDbNode;
  }

  get selectedSchemaNode() {
    return this._selectedSchemaNode;
  }
  get suffix(){
    return this._suffix;
  }

  setListener() {
    this.editorService.onActiveResourceChange((resource) => {
      //console.log(`-------->${resource?.uri}`)
      this.onActiveFileChange();
    });
  }

  updateServerNodes(serverNodes: ServerNode[]) {
    this._serverNodes = serverNodes;
    this.onServerNodesChangeEmitter.fire(serverNodes);
  }

  updateDbNodes(dbNodes: DbNode[]) {
    this._dbNodes = dbNodes;
    this.onDbNodesChangeEmitter.fire(dbNodes);
  }

  updateSchemaNodes(schemaNodes: DbNode[]) {
    this._schemaNodes = schemaNodes;
    this.onSchemaNodesChangeEmitter.fire(schemaNodes);
  }

  updateSelectedServer(selectedServerNode: ServerNode | null) {
    this._selectedServerNode = selectedServerNode;
    this.onSelectedServerNodeChangeEmitter.fire(selectedServerNode);
  }

  updateSelectedDb(selectedDbNode: DbNode | null) {
    this._selectedDbNode = selectedDbNode;
    this.onSelectedDbNodeChangeEmitter.fire(selectedDbNode);
  }

  updateSelectedSchema(selectedSchemaNode: DbNode | null) {
    this._selectedSchemaNode = selectedSchemaNode;
    this.onSelectedSchemaNodeChangeEmitter.fire(selectedSchemaNode);
  }

  /**
   * 每打开一个文件，，
   * 如果之前用户对此文件有选择的服务和库，那么使用用户之前已经设置好的服务和库，
   * 如果没有分析分析文件的相对路径
   * 如果文件的第一级路径等同于服务名称，那么自动选择服务
   * 如果文件的第二级路径等同于库名称，那么直接选择库
   */
  async onActiveFileChange() {
    //const {appConfig} = this;
    const currentResource = this.editorService.currentResource;
    if (!currentResource || !currentResource.uri) {
      //当前没有正在打开的文件，所以需要清空当前的选择server和db、
      this.updateServerNodes([]);
      this.updateDbNodes([]);
      this.updateSelectedServer(null);
      this.updateSelectedDb(null);
      return;
    }

    //当前工作目录
    //let workspaceDir = appConfig.workspaceDir ? appConfig.workspaceDir : '';
    let workspaceDir = this.workspaceService.workspace?.uri
      ? new URI(this.workspaceService.workspace?.uri).path.toString()
      : '';
    const activeEditorFile = currentResource?.name ? currentResource?.name : '';
    const activeFileFullPath = currentResource?.uri.path.toString();
    //window是 'c:/DevData\\MyDevGithub\\workspace';
    //workspaceDir = workspaceDir.replaceAll('\\','/');
    const reg = new RegExp(`/?${workspaceDir}/`);
    let activeRelative = activeFileFullPath?.replace(reg, '');
    this.currentActiveFileFullPath = activeFileFullPath;
    //1.打开文件的后缀 2.工作文件的一级目录和二级目录
    //文档后缀
    const activeExtname1 = activeEditorFile ? extname(activeEditorFile) : '';
    const activeExtname = activeExtname1.replace('.', '');
    //console.log('workspaceDir:',workspaceDir,currentResource.uri.path.name,currentResource.uri.path.base,currentResource.uri.path.toString())
    //console.log('activeEditorFile:', activeEditorFile, ';activeExtname:', activeExtname, ';activeRelative:', activeRelative)
    if (!FileSuffixArray.includes(activeExtname)) {
      return;
    }
    this._suffix = activeExtname  as FileSuffixType;
    await this.setCurrentFileSuffix(activeExtname as FileSuffixType);
    // 用户之前对此文件是否有选择的库，如果有，加载之前的，没有，按当前文件目录加载服务和库
    if (
      DbSelectService.cacheOpenFileSelected.has(activeFileFullPath) &&
      this.serverNodes &&
      this.serverNodes.length > 0
    ) {
      //console.log('--->1使用用户存储的点击')
      const { server, db, schema } = DbSelectService.cacheOpenFileSelected.get(activeFileFullPath)!;
      await this.setSelectServer(server);
      if (db) {
        await this.setSelectDb(db);
        if (schema) {
          await this.setSelectSchema(schema);
        }
      }
      return;
    }
    if (activeRelative.endsWith(activeExtname)) {
      activeRelative = activeRelative.substring(0, activeRelative.length - (activeExtname.length + 1));
    }
    const activeFolder: string[] = activeRelative.split('/');
    if (this.serverNodes && this.serverNodes.length > 0 && activeFolder && activeFolder.length >= 1) {
      const activeServerName: string = activeFolder[0];
      const shouldActiveServer = this.serverNodes.filter((item) => item.name === activeServerName);
      if (shouldActiveServer.length > 0) {
        // console.log('--->2')
        await this.setSelectServer(shouldActiveServer[0]);
      }
      if (this.dbNodes && this.dbNodes.length > 0 && activeFolder.length >= 2) {
        //console.log('--->3')
        let activeDbName = activeFolder[1];
        //保证能识别文件
        activeDbName = activeDbName.toLowerCase();
        const shouldActiveDb = this.dbNodes.filter(
          (item) => item.name.toLowerCase() === activeDbName || item.value === activeDbName,
        );
        console.log('activeDbName:', activeDbName, ';set activeDb,', shouldActiveDb[0]);
        if (shouldActiveDb.length > 0) {
          //console.log('--->4')
          await this.setSelectDb(shouldActiveDb[0]);
          if (activeFolder.length >= 3) {
            let activeSchemaName = activeFolder[2];
            activeSchemaName = activeSchemaName.toLowerCase();
            const shouldActiveSchema = this.schemaNodes.filter((item) => item.name.toLowerCase() === activeSchemaName);
            //console.log('--->5',activeSchemaName,'shouldActiveSchema:',shouldActiveSchema[0]);
            shouldActiveSchema.length > 0 && (await this.setSelectSchema(shouldActiveSchema[0]));
          }
        }
      }
    }
  }

  public async setCurrentFileSuffix(suffix: FileSuffixType) {
    this.currentFileSuffix = suffix;
    const serverNodes = await this.dbCacheNodeService.getWorkspaceCacheServer(suffix);
    this.updateServerNodes(serverNodes);
  }

  public async setSelectServerByUser(selectedServerName: string) {
    if (!selectedServerName) {
      this.updateSelectedServer(null);
      this.updateDbNodes([]);
      this.updateSelectedDb(null);
      return;
    }
    //跟当前的选择是同一个，不做处理
    if (this.selectedServerNode && this.selectedServerNode.name === selectedServerName) return;
    const filterServer = this.serverNodes.filter((item) => item.name === selectedServerName);
    if (filterServer.length > 0) {
      const selectedServer = filterServer[0];
      await this.setSelectServer(selectedServer);
      //基本逻辑：
      //存储用户的选择，方便下次调用,如果之前有，直接覆盖
      DbSelectService.cacheOpenFileSelected.set(this.currentActiveFileFullPath, { server: selectedServer });
    }
  }

  public async setSelectServer(selectedServer: ServerNode) {
    this.updateSelectedServer(selectedServer);
    this.updateSelectedDb(null);
    this.updateSelectedSchema(null);
    if (ServerHasDb.includes(selectedServer.serverType)) {
      //加载服务下的db
      const dbNodes = await this.dbCacheNodeService.getServerCacheDb(selectedServer);
      this.updateDbNodes(dbNodes);
    }
  }

  public setSelectDbByUser(selectDbValue: string | number) {
    //console.log('setSelectDbByUser->', selectDbValue)
    if (isEmpty(selectDbValue)) {
      this.updateSelectedDb(null);
      return;
    }
    if (this.selectedDbNode && selectDbValue === this.selectedDbNode.name) return;
    const filterDb = this.dbNodes.filter((item) => item.value === selectDbValue);
    const selectedDb = filterDb[0];
    this.setSelectDb(selectedDb);
    //存储用户的选择，方便下次切换文件直接更改
    if (DbSelectService.cacheOpenFileSelected.has(this.currentActiveFileFullPath)) {
      const currentSelected = DbSelectService.cacheOpenFileSelected.get(this.currentActiveFileFullPath)!;
      DbSelectService.cacheOpenFileSelected.set(this.currentActiveFileFullPath, { ...currentSelected, db: selectedDb });
    } else {
      DbSelectService.cacheOpenFileSelected.set(this.currentActiveFileFullPath, {
        server: this.selectedServerNode!,
        db: selectedDb,
      });
    }
  }

  public async setSelectDb(selectedDb: DbNode) {
    this.updateSelectedDb(selectedDb);
    this.updateSelectedSchema(null);
    if (ServerHasSchema.includes(this.selectedServerNode!.serverType)) {
      //加载服务下的db
      const schemaNodes = await this.dbCacheNodeService.getServerCacheSchema(this.selectedServerNode!, selectedDb);
      //console.log('setSelectDb返回来的schema', schemaNodes)
      this.updateSchemaNodes(schemaNodes);
    }
  }

  public async setSelectSchema(selectedSchema: DbNode) {
    this.updateSelectedSchema(selectedSchema);
  }

  public setSelectedSchemaByUser(selectSchemaName: string) {
    if (!selectSchemaName) {
      this.updateSelectedSchema(null);
      return;
    }
    if (this.selectedSchemaNode && selectSchemaName === this.selectedSchemaNode.name) return;
    const filterSchema = this.schemaNodes.filter((item) => item.name === selectSchemaName);
    const selectedSchema = filterSchema[0];
    this.updateSelectedSchema(selectedSchema);
    //存储用户的选择，方便下次切换文件直接更改
    if (DbSelectService.cacheOpenFileSelected.has(this.currentActiveFileFullPath)) {
      const currentSelected = DbSelectService.cacheOpenFileSelected.get(this.currentActiveFileFullPath)!;
      DbSelectService.cacheOpenFileSelected.set(this.currentActiveFileFullPath, {
        ...currentSelected,
        schema: selectedSchema,
      });
    } else {
      DbSelectService.cacheOpenFileSelected.set(this.currentActiveFileFullPath, {
        server: this.selectedServerNode!,
        db: this.selectedDbNode!,
        schema: selectedSchema,
      });
    }
  }

  //
  // @OnEvent(EditorDocumentModelCreationEvent)
  // private async editorDocumentModelCreationHandler(e: EditorDocumentModelCreationEvent) {
  //   if (e.payload.uri.scheme !== 'file') {
  //     return;
  //   }
  //   console.log('打开的文件名称:', e.payload.uri)
  // }
  //
  // @OnEvent(EditorDocumentModelRemovalEvent)
  // private async editorDocumentModelRemovalHandler(e: EditorDocumentModelRemovalEvent) {
  //   if (e.payload.codeUri.scheme !== 'file') {
  //     return;
  //   }
  //   console.log('关闭的文件名称:', e.payload.codeUri)
  // }
}
