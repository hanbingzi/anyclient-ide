import { CommandContribution, CommandRegistry, Domain } from '@opensumi/ide-core-common';
import {
  EsCompletionCommand,
  RunBatchRedisCommand,
  RunBatchSqlCommand,
  RunEsBatchCommand,
  RunEsCommand,
  RunRedisCommand,
  RunSqlCommand,
  SqlCompletionCommand,
} from '../../base/command/code.command';
import { ICompleteNode, ICompleteQueryParam } from './complete-query.types';
import { BaseNode } from '../../base/model/cache-node.model';
import { Autowired } from '@opensumi/di';
import { IDbCacheNodeServiceToken } from '../common';
import { DbCacheNodeService } from './db-cache-node.service';
import { QuerySqlExplorerService } from '../../query-explorer/browser/query-sql-explorer.service';
import { IQuerySqlExplorerServiceToken } from '../../query-explorer/common';
import { WorkbenchEditorService } from '@opensumi/ide-editor';
import { ISqlServerApiToken } from '../../server-client/common';
import { SqlServerApiService } from '../../server-client/browser/sql-server-api.service';

@Domain(CommandContribution)
export class CodelensCommandContribution implements CommandContribution {
  @Autowired(WorkbenchEditorService)
  private readonly editorService: WorkbenchEditorService;

  @Autowired(IDbCacheNodeServiceToken)
  private readonly dbCacheNodeService: DbCacheNodeService;

  @Autowired(IQuerySqlExplorerServiceToken)
  private readonly querySqlExplorerService: QuerySqlExplorerService;

  @Autowired(ISqlServerApiToken)
  private sqlServerApiService: SqlServerApiService;

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(SqlCompletionCommand, {
      execute: async (query: ICompleteQueryParam): Promise<ICompleteNode[]> => {
        const { nodeTypes, schema, tables } = query;
        let completeNodes: ICompleteNode[] = [];
        for (let model of nodeTypes) {
          let queryNodes: BaseNode[] | undefined;
          switch (model) {
            case 'db':
              //查询服务下的所有db
              queryNodes = await this.dbCacheNodeService.getSqlDbsForCompleteCommand();
              break;
            case 'tables':
            //查询db下的所有table
            case 'views':
            //查询db下的所有view
            case 'functions':
            //查询db下的所有function
            case 'procedures':
            //查询db下的所有procedure
            case 'triggers':
              queryNodes = await this.dbCacheNodeService.getSqlDbSubItemsForCompleteCommand(model, schema);
              break;
            case 'columns':
              queryNodes = await this.dbCacheNodeService.getSqlColumnsForCompleteCommand(schema, tables);
              //table有，查询table下的column
              //table参数没有，查询schema（指数据库的db）下的所有表的column
              break;
          }
          if (queryNodes && queryNodes.length > 0) {
            const modelCompleteNodes: ICompleteNode[] = queryNodes.map((item) => ({
              name: item.name,
              description: item.description,
              nodeType: item.nodeType,
            }));
            completeNodes = completeNodes.concat(modelCompleteNodes);
          }
        }
        return completeNodes;
      },

    });

    commands.registerCommand(EsCompletionCommand, {
      execute: async (query: string): Promise<string[]> => {
        let queryNodes: BaseNode[] = await this.dbCacheNodeService.getSqlDbsForCompleteCommand();
        if (queryNodes && queryNodes.length > 0) {
          return queryNodes.map(item=>item.name);
        }
        return [];
      },
    });

    commands.registerCommand(RunSqlCommand, {
      execute: async (sql: string) => {
        console.log('测试执行的sql：----->', sql);
        this.querySqlExplorerService.runSql(sql, false);
      },
    });
    commands.registerCommand(RunBatchSqlCommand, {
      execute: async (sql: string) => {
        // this.querySqlExplorerService.runSql(sql);
        console.log('测试执行的多条sql：----->', sql);
        this.querySqlExplorerService.runSql(sql, true);
      },
    });

    commands.registerCommand(RunRedisCommand, {
      execute: async (command: string) => {
        console.log('测试执行的command：----->', command);
        this.querySqlExplorerService.runRedisCommand(command, false);
      },
    });
    commands.registerCommand(RunBatchRedisCommand, {
      execute: async (command: string) => {
        // this.querySqlExplorerService.runSql(sql);
        console.log('测试执行的多条command：----->', command);
        this.querySqlExplorerService.runRedisCommand(command, true);
      },
    });

    commands.registerCommand(RunEsCommand, {
      execute: async (command: string[]) => {
        console.log('测试执行的command：----->', command);
        this.querySqlExplorerService.runEsCommand(command, null, false);
      },
    });
    commands.registerCommand(RunEsBatchCommand, {
      execute: async (command: string) => {
        // this.querySqlExplorerService.runSql(sql);
        console.log('测试执行的多条command：----->', command);
        this.querySqlExplorerService.runEsCommand(null, command, true);
      },
    });


  }

  // registerMenus(menuRegistry: IMenuRegistry): void {
  //   menuRegistry.registerMenuItem(MenuId.EditorContext, {
  //     command: {id: RunSelectedSqlCommand.id, label: RunSelectedSqlCommand.label!},
  //     order: -5,
  //     group:'run-sql',
  //     when: 'editorLangId == sql'
  //   });
  //
  //   menuRegistry.registerMenuItem(MenuId.EditorContext, {
  //     command: {id: RunAllSqlCommand.id, label: RunAllSqlCommand.label!},
  //     order: -5,
  //     group:'run-sql',
  //     when: 'editorLangId == sql'
  //   });
  // }
}
