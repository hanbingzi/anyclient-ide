import { Autowired, Injectable } from '@opensumi/di';
import axios from 'axios';
import { AppConstants } from '../../../common/constants';
import * as macaddress from 'macaddress';
import { IProductVersionDao, IProductVersionDaoToken } from '../../local-store-db/common';
import { IVersionResult } from '../common';

const adminAxiosService = axios.create({
  baseURL: AppConstants.AdminUrl, //process.env.VUE_APP_BASE_API, // api的base_url
  timeout: 1000 * 60 * 3, // 请求超时时间
  headers: {
    "Content-Type'": 'application/json',
  },
});

// 请求拦截器
adminAxiosService.interceptors.request.use(
  (config) => {
    // 可以在这里添加请求头等信息
    // 例如：config.headers['Authorization'] = 'Bearer your-token';
    return config;
  },
  (error) => {
    // 请求错误处理
    console.log(error); // for debug
    Promise.reject(error);
  },
);

// 响应拦截器
adminAxiosService.interceptors.response.use(
  (response) => {
    // 对响应数据做处理，例如只返回data部分
    return response;
  },
  (error) => {
    // 对响应错误做处理
    console.log('err' + error); // for debug
    return Promise.reject(error);
  },
);

@Injectable()
export class AdminClientService {
  @Autowired(IProductVersionDaoToken)
  private productVersionDao: IProductVersionDao;



  private productRequestUrl: string = 'prod/';

  public login() {
    console.log('-------------------login-------------------->');
  }

  public async onStart() {
    console.log('-------------------start-------------------->');
    const mac = await new Promise<string>((resolve, reject) => {
      macaddress.one((err, addr) => {
        if (err) reject(err);
        else resolve(addr);
      });
    });
    //{
    //     "userId": "",
    //     "productName": "AnyClient",
    //     "version": "1.0.1",
    //     "platform": "mac",
    //     "arch": "x86",
    //     "mac": "42:c2:0d:79:8b:c5"
    // }
    const log = {
      userId: '',
      productName: AppConstants.AppName,
      version: AppConstants.Version,
      platform: process.platform,
      arch: process.arch,
      mac,
    };

    console.log(log);
    const response = await adminAxiosService.post(this.productRequestUrl + 'logrun/start', log);
    console.log('--------------------end------------------->');
  }

  /**
   *
   */
  public async onDestroy() {
    //{
    //     "userId": "",
    //     "mac": "42:c2:0d:79:8b:c5"
    // }
    const mac = await new Promise<string>((resolve, reject) => {
      macaddress.one((err, addr) => {
        if (err) reject(err);
        else resolve(addr);
      });
    });
    const log = {
      userId: '',
      mac,
    };
    const response = await adminAxiosService.post(this.productRequestUrl + 'logrun/close', log);

    console.log('--------------------destroy------------------->');
  }

  public async checkUpdate(): Promise<IVersionResult> {
    const response = await adminAxiosService.get(
      this.productRequestUrl + 'product/latest-version/' + AppConstants.AppName,
    );
    console.log('--------------------checkUpdate------------------->response:', response.data);
    if (response.data && response.data.code === 200) {
      const latestVersion = response.data.data;
      //查询是否跳过
      const expire = await this.productVersionDao.checkVersionExpire(latestVersion);
      return { expire, latestVersion };
    }
    return { expire: false };
  }
}
