import { Command } from '@opensumi/ide-core-common';
import { ServerCommandIds as CommandIds } from '../../command/menu.command';
import { COMMON_COMMANDS } from './common.menu';

export namespace ELASTICSEARCH_COMMANDS {
  export const esServer: Command[][] = [
    [CommandIds.newQuery],
    [CommandIds.refresh],
    COMMON_COMMANDS.connect,
    [CommandIds.editServer],
    //[CommandIds.runRedisFile],
    //[CommandIds.cmdView],
  ];



}
