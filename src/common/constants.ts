
export const AppConstants ={
  AppName : 'AnyClient',
  AppStoragePath : '.anyclient',
  SEARCH_PREVIEW_KEY : 'search-preview',
  Version: '1.2.3',
  Electron: true, //如果是electron，此处需要配置true
  AdminUrl:'https://api.anyclient.cn',
  //AdminUrl:'http://api.anyclient.cn',
  //AdminUrl:'http://localhost:8090',
  //AdminUrl: 'http://111.67.201.184:8090',
  JdbcUrl: 'http://localhost:7123',

}
export const Constants = {
  ELECTRON_MAIN_API_NAME: 'opensumi-main-api',
  ELECTRON_NODE_SERVICE_NAME: 'opensumi-electron-node',
  ELECTRON_NODE_SERVICE_PATH: 'opensumi-electron-node-service-path',
  DATA_FOLDER: process.env.DATA_FOLDER || AppConstants.AppStoragePath,

  DEFAULT_BACKGROUND: 'rgb(32, 34, 36)',
};

export const Commands = {
  OPEN_DEVTOOLS_MAIN: 'opensumi.help.openDevtools.main',
  OPEN_DEVTOOLS_NODE: 'opensumi.help.openDevtools.node',
  OPEN_DEVTOOLS_EXTENSION: 'opensumi.help.openDevtools.extension',
};

export const ExtensionCommands = {
  OPEN_DEVTOOLS: 'extension.opensumi.openDevtools',
};
