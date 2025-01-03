import { getIcon } from '@opensumi/ide-core-browser';
import { Command, localize } from '@opensumi/ide-core-common';

export enum CommandIds {
  ServerRefreshAll = 'serverTree.refreshAll',
  ServerCollapseAll = 'serverTree.collapseAll',
  ServerExpandAll = 'serverTree.expandAll',
  ServerFilterOpen = 'serverTree.FilterOpen',
  ServerFilterClose = 'serverTree.FilterClose',
  ServerShow = 'serverTree.show',
  ServerNext = 'serverTree.FilterNext',
  ServerPrev = 'serverTree.FilterPrev',
  ServerExpand = 'serverTree.FilterExpand',
  ServerCollapse = 'serverTree.FilterCollapse',

  ConnectRefreshAll = 'connectTree.refreshAll',
  ConnectCollapseAll = 'connectTree.collapseAll',
  ConnectExpandAll = 'connectTree.expandAll',
  ConnectFilterToggle = 'connectTree.FilterToggle',
  ConnectFilterOpen = 'connectTree.FilterOpen',
  ConnectFilterClose = 'connectTree.FilterClose',
  ConnectShow = 'connectTree.show',
  ConnectNext = 'connectTree.FilterNext',
  ConnectPrev = 'connectTree.FilterPrev',
  ConnectExpand = 'connectTree.FilterExpand',
  ConnectCollapse = 'connectTree.FilterCollapse',

  NewServer = 'serverTree.newServer',
  DeleteServer = 'serverTree.deleteServer',
  EditServer = 'serverTree.editServer',

  NewConnect = 'serverTree.newConnect',
  DeleteConnect = 'serverTree.deleteConnect',
  CloseConnect = 'serverTree.closeConnect',
  RefreshConnect = 'serverTree.refreshConnect',

  CmdView = 'serverTree.cmdView',
  RunSqlFile = 'serverTree.runSqlFile',

  Create = 'serverTree.create',
  CreateDic = 'serverTree.createDic',
  Refresh = 'serverTree.refresh',
  Copy = 'serverTree.copy',
  Cut = 'serverTree.cut',
  Paste = 'serverTree.paste',
  Delete = 'serverTree.delete',
  Edit = 'serverTree.edit',
  Rename = 'serverTree.rename',

  newQuery = 'newQuery',
  filterQuery = 'filterQuery',
  ClearTable = 'serverTree.clearTable',
  CopyTable = 'serverTree.copyTable',
}

// 数据库，mysql、postgre、oracle、sqlserver、sqlite
export namespace ServerCommandIds {
  // 打开到workspace editor
  // 展示服务详情
  export const openServerInfo: Command = { label: 'open', id: 'open-server-info' };

  export const openDataView: Command = { label: 'open', id: 'open-data-view' };
  // 展示表格数据，
  // export const openTableView: Command = {label: 'open', id: 'open-table-view'};
  // // 编辑表格
  // export const openTableEdit: Command = {label: 'open', id: 'open-table-edit'};
  // // 打开普通的数据
  // export const openValueView: Command = {label: 'open', id: 'open-value-view'};

  // 所有服务列表工具栏
  export const serverRefreshAll: Command = {
    label: '刷新所有服务',
    id: CommandIds.ServerRefreshAll,
    iconClass: getIcon('refresh'),
  };
  export const serverCollapseAll: Command = {
    label: '全部折叠',
    id: CommandIds.ServerCollapseAll,
    iconClass: getIcon('collapse-all'),
  };
  export const serverExpandAll: Command = {
    label: '全部展开',
    id: CommandIds.ServerExpandAll,
    iconClass: getIcon('expand-all'),
  };
  export const serverFilterOpen: Command = {
    label: '查找过滤',
    id: CommandIds.ServerFilterOpen,
    iconClass: getIcon('retrieval'),
  };
  export const serverFilterClose: Command = { label: '关闭过滤', id: CommandIds.ServerFilterClose };
  export const serverShow: Command = { label: '展示详情', id: CommandIds.ServerShow };
  export const serverNext: Command = { label: '下', id: CommandIds.ServerNext };
  export const serverPrev: Command = { label: '上', id: CommandIds.ServerPrev };
  export const serverExpand: Command = { label: '展开', id: CommandIds.ServerExpand };
  export const serverCollapse: Command = { label: '折叠', id: CommandIds.ServerCollapse };

  // 最近打开连接列表工具栏
  export const connectRefreshAll: Command = {
    label: '刷新所有',
    id: CommandIds.ConnectRefreshAll,
    iconClass: getIcon('refresh'),
  };
  export const connectCollapseAll: Command = {
    label: '全部折叠',
    id: CommandIds.ConnectCollapseAll,
    iconClass: getIcon('collapse-all'),
  };
  export const connectFilterToggle: Command = {
    label: '查找过滤',
    id: CommandIds.ConnectFilterToggle,
    iconClass: getIcon('retrieval'),
  };

  // 连接服务，节点会非常多，所以不提供展开所有
  export const connectFilterOpen: Command = {
    label: '查找过滤',
    id: CommandIds.ConnectFilterOpen,
    iconClass: getIcon('retrieval'),
  };
  export const connectFilterClose: Command = { label: '关闭过滤', id: CommandIds.ConnectFilterClose };
  export const connectShow: Command = { label: '展示详情', id: CommandIds.ConnectShow };
  export const connectNext: Command = { label: '下', id: CommandIds.ConnectNext };
  export const connectPrev: Command = { label: '上', id: CommandIds.ConnectPrev };
  export const connectExpand: Command = { label: '展开', id: CommandIds.ConnectExpand };
  export const connectCollapse: Command = { label: '折叠', id: CommandIds.ConnectCollapse };

  export const newServer: Command = {
    label: 'server.new',
    id: CommandIds.NewServer,
    iconClass: getIcon('plus')//'new-file'),
  };

  export const deleteServer: Command = { label: 'server.delete', id: CommandIds.DeleteServer };
  export const editServer: Command = { label: 'server.edit', id: CommandIds.EditServer };

  export const newConnect: Command = { label: '新建连接', id: CommandIds.NewConnect, iconClass: getIcon('new-file') };
  export const deleteConnect: Command = { label: '从当前空间移除', id: CommandIds.DeleteConnect };

  export const closeConnect: Command = { label: '关闭连接', id: CommandIds.CloseConnect };
  export const refreshConnect: Command = { label: '刷新连接', id: CommandIds.RefreshConnect };
  // export const editConnect: Command = {label: '编辑连接', id: CommandIds.EditConnect}
  export const cmdView: Command = { label: '命令界面', id: CommandIds.CmdView };
  // export const runSqlFile: Command = {label: '运行sql文件', id: CommandIds.RunSqlFile}

  //通用
  export const create: Command = { label: '新建', id: CommandIds.Create };
  export const createDic: Command = { label: '新建目录', id: CommandIds.CreateDic };
  export const refresh: Command = { label: '刷新', id: CommandIds.Refresh };

  export const copy: Command = { label: '复制', id: CommandIds.Copy };
  export const cut: Command = { label: 'Cut', id: CommandIds.Cut };
  export const paste: Command = { label: 'Paste', id: CommandIds.Paste };
  export const _delete: Command = { label: '删除', id: CommandIds.Delete };
  export const edit: Command = { label: '编辑', id: CommandIds.Edit };
  export const rename: Command = { label: '重命名', id: CommandIds.Rename };
  export const cutCopyPaste: Command[] = [copy, cut, paste, _delete];
  //
  export const newQuery: Command = { label: '新建查询', id: CommandIds.newQuery };

  export const filterSearch: Command = { label: '条件过滤查询', id: CommandIds.filterQuery };

  // db
  //export const createDb :Command = {label:'新建库',id:'create_db'};
  export const editDb: Command = { label: '编辑库', id: 'edit_db' };
  export const createSchema: Command = { label: '新建Schema', id: 'create_schema' };
  export const editSchema: Command = { label: '编辑Schema', id: 'edit_schema' };
  export const sqlStructureBackup: Command = { label: '备份表结构', id: 'sql_structure_backup' };
  export const sqlStructureAndDataBackup: Command = { label: '备份表结构和表数据', id: 'sql_structure_data_backup' };
  export const runSqlFile: Command = { label: '执行sql脚本', id: 'run_sql_file' };
  export const runRedisFile: Command = { label: '执行Redis脚本', id: 'run_redis_file' };

  // table
  export const clearTable: Command = { label: '清空表数据', id: CommandIds.ClearTable };
  export const copyTable: Command = { label: '复制表创建SQL', id: CommandIds.CopyTable };
  export const createTable: Command = { label: '新建表', id: 'db_create_table' };
  export const copyTableInsertSql: Command = { label: '复制插入语句', id: 'copy_table_insert_sql' };
  export const copyTableDeleteSql: Command = { label: '复制删除语句', id: 'copy_table_delete_sql' };
  export const copyTableUpdateSql: Command = { label: '复制更新语句', id: 'copy_table_update_sql' };
  export const copyTableSelectSql: Command = { label: '复制查询语句', id: 'copy_table_select_sql' };
  export const tableSelect: Command = { label: '查询', id: 'table_select' };
  // view
  export const copyViewCreateSql: Command = { label: '复制视图创建SQL', id: 'copy_view_create_sql' };


  // key 命令



  export const keyDeleteCmd: Command = { label: '生成删除命令', id: 'key_delete_cmd' };
  export const keyUpdateCmd: Command = { label: '生成更新命令', id: 'key_update_cmd' };
  export const keySearchCmd: Command = { label: '生成查询命令', id: 'key_search_cmd' };
  export const keyExpireCmd: Command = { label: '生成key过期命令', id: 'key_expire_cmd' };
  // key 操作
  export const keySearch: Command = { label: '查询', id: 'key_search' };

  //----------------------------------通用----------------------------------------------------------------
  export const redisKeySearchCmd: Command = { label: '复制模糊查询命令', id: 'redis_key_search_cmd' };
  export const redisKeyGetCmd: Command = { label: '复制Key查询命令', id: 'redis_key_get_cmd' };
  //hash list set使用
  export const redisKeyGetAllCmd: Command = { label: '复制Key查询所有命令', id: 'redis_key_get_all_cmd' };

  // export const redisKeyGetRangeCmd: Command = { label: '复制Key查询指定范围命令', id: 'redis_key_get_range_cmd' };
  export const redisKeyGetLengthCmd: Command = { label: '复制Key查询长度命令', id: 'redis_key_get_length_cmd' };
  export const redisKeyDeleteCmd: Command = { label: '复制Key删除命令', id: 'redis_key_delete_cmd' };
  //list hash set 使用
  export const redisKeyDeleteItemCmd: Command = { label: '复制Key删除指定元素命令', id: 'redis_key_del_item_cmd' };
  export const redisKeyExistsItemCmd: Command = { label: '复制Key是否存在命令', id: 'redis_key_exists_item_cmd' };
  export const redisKeySetCmd: Command = { label: '复制Key新增命令', id: 'redis_str_key_set_cmd' };
  export const redisKeyTtlCmd: Command = { label: '复制获取Key续期时间命令', id: 'redis_key_ttl_cmd' };
  export const redisKeyExpireCmd: Command = { label: '复制设置Key过期时间命令', id: 'redis_set_key_expire_cmd' };

  //----------------------------------分类----------------------------------------------------------------
  export const redisKeyUpdateCmd: Command = { label: '复制Key更改命令', id: 'redis_key_update_cmd' };

  export const redisListKeyLPushCmd: Command = { label: '复制List插入头部命令', id: 'redis_list_key_lpush_cmd' };
  export const redisListKeyRPushCmd: Command = { label: '复制List插入尾部命令', id: 'redis_list_key_rpush_cmd' };
  export const redisHashKeySetCmd: Command = { label: '复制Hash新增命令', id: 'redis_hash_key_set_cmd' };
  export const redisSetKeySetCmd: Command = { label: '复制Set新增命令', id: 'redis_set_key_set_cmd' };
  export const redisZSetKeySetCmd: Command = { label: '复制ZSet新增命令', id: 'redis_zset_key_set_cmd' };


  export const redisHashKeyGetKeysCmd: Command = { label: '复制Hash获取Keys命令', id: 'redis_hash_key_get_keys_cmd' };
  export const redisHashKeyGetValuesCmd: Command = { label: '复制Hash获取Values命令', id: 'redis_hash_key_get_vals_cmd' };


  export const redisKeyAddCmdMenu:Command[]=[redisKeySetCmd,redisHashKeySetCmd,redisListKeyLPushCmd,redisListKeyRPushCmd,redisSetKeySetCmd,redisZSetKeySetCmd];

  // export const zkNodeAdd: Command = { label: '新增节点', id: 'zk_node_add_cmd' };

  export const topicCreate: Command = { label: '新建topic', id: 'topic_create' };

  export const topicAddMessage: Command = { label: '添加消息', id: 'topic_add_message' };
}
