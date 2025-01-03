// import * as Datastore from 'nedb';
//ide
import Datastore from 'nedb';

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

//nedb
class NeDBOpenHelper {
  private static readonly dbName = 'localServer.db';
  private static db: Datastore;

  public static getInstance(storePath: string): Datastore {
    console.log('getInstance--------------------------------------------------storePath:', storePath);
    if (this.db) {
      return this.db;
    }
    //此处有bug,
    const dbDirectoryPath = path.join(os.homedir(), storePath);
    const dbPath = path.join(dbDirectoryPath, NeDBOpenHelper.dbName);
    console.log('----------->path:', dbDirectoryPath, dbPath);
    let dirExists = fs.existsSync(dbDirectoryPath);
    if (!dirExists) {
      fs.mkdirSync(dbDirectoryPath);
    }
    this.db = new Datastore({ filename: dbPath, autoload: true });
    return this.db;
  }
}

export default NeDBOpenHelper;
