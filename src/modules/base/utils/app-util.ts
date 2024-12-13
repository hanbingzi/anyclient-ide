import * as path from 'path';

const MacInstallPath = '/Applications/AnyClient.app/Contents';

export class AppUtil {
  public static getExecRootPath() {
    // let jdbcServerPath = path.join(appInstallPath, '/Resources/' + jdbcStorePath, jdbcDriverName);
    if (process.env.NODE_ENV === 'development') {
      console.log('JdbcStartService - development-');
      return path.join(process.cwd(), 'resources');
    } else {
      const isMac = process.platform === 'darwin';
      if(isMac){
        //process.cwd()在mac上获取的路径不对，所以改用 mac电脑安装的固定目录
        return path.join(MacInstallPath,'Resources/resources')
      }else{
        return path.join(process.cwd(),'resources/resources')
      }
    }
  }
}
