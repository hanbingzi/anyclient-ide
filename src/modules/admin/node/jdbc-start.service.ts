import { Injectable } from '@opensumi/di';
import { CommonResult } from '../../base/types/common-result.types';
import { exec ,spawn} from 'child_process';
import { AppConstants } from '../../../common/constants';
import { AppUtil } from '../../base/utils/app-util';
import { promisify } from 'util';
import * as path from 'path';


const jdbcDriverName = 'anyclient-jdbc-driver.jar';

@Injectable()
export class JdbcStartService {
  public static jarProcess;
  //@Autowired(INodeLogger)
  //private readonly logger: INodeLogger;

  //start
  public async start(): Promise<CommonResult> {

    let appResourcePath = AppUtil.getExecRootPath();
    let jdbcServerPath = path.join(appResourcePath,'jdbc',jdbcDriverName);
    if (AppConstants.Electron  || process.env.NODE_ENV === 'development') {
      //需要防止之前的进程还在开启状态，先检测，如果程序还活着，杀死在启动
      // await this.kill();
      // exec 这种方式在 windows中启动不起来程序，显示无权限
      // exec(`java -jar ${jdbcServerPath}`, (error, stdout) => {
      //   if (error) {
      //     console.log('start jdbc driver error------------>');
      //     console.log(error);
      //   }
      // });
      JdbcStartService.jarProcess = spawn('java', ['-jar', jdbcServerPath])
      JdbcStartService.jarProcess.stdout.on('data', (data) => {
        //console.log(`JAR stdout: ${data}`);
      });
    }
    return {
      success: true,
      data: [jdbcServerPath, process.cwd(), path.resolve('./'), __dirname, __filename, process.env.NODE_ENV],
    };
  }

  //end&kill
  public async kill() {
    // const filterCmd = platform() === 'win32' ? 'findstr' : 'grep';
    // exec(`jps|${filterCmd} anyclient-jdbc-driver`, (err, stdout) => {
    //   const pid = stdout?.match(/\d+/)?.[0];
    //   if (pid) {
    //     console.log('-------------------jdbc kill-------------------->');
    //     process.kill(Number.parseInt(pid));
    //   }
    // });
    if(JdbcStartService.jarProcess){
      process.kill(JdbcStartService.jarProcess.pid)
      // JdbcStartService.jarProcess.kill();
    }

  }

  public async checkJDK():Promise<boolean>{
    const execAsync = promisify(exec);
    try{
      const { stdout: javaVersion } = await execAsync('java -version');
      return true
    }catch (e) {
      console.log('jdk-->',e);
      return false;
    }

  }


}
