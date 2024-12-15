import { AppConstants } from '../../../common/constants';
import  Datastore from 'nedb';
import NeDBOpenHelper from './NeDBOpenHelper';
import { removeNullValues } from '../../base/utils/object-util';

interface BaseParam {
  [key: string]: any;
}

export abstract class BaseDao<T> {
  private _db: Datastore;

  abstract get collection(): string;

  abstract get primaryKey(): string;

  //abstract getColumnsSql(alias?: string): string;

  get db(): Datastore {
    if (this._db) {
      return this._db;
    }
    return (this._db = NeDBOpenHelper.getInstance(AppConstants.AppStoragePath));
  }

  get collectionParam() {
    return { collection: this.collection };
  }

  insert(param: BaseParam): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!param) {
        return;
      }
      this.db.insert({ ...param, ...this.collectionParam }, (err, newDoc) => {
        if (err) {
          console.error('Error inserting document:', err);
        } else {
          console.log('insert:', newDoc);
        }
        resolve();
      });
    });
  }

  _delete(param: BaseParam): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!param) {
        resolve(false);
      }
      const removeQuery = { ...this.collectionParam, ...param }; // 根据文档的 _id 进行删除
      this.db.remove(removeQuery, {}, (err, numRemoved) => {
        if (err) {
          resolve(false);
          console.error('Error removing document:', err);
        } else {
          resolve(true);
        }
      });
    });
  }
  _deleteById(id: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!id) {
        resolve(false);
      }
      const removeQuery = { ...this.collectionParam, [this.primaryKey]: id }; // 根据文档的 _id 进行删除
      this.db.remove(removeQuery, {}, (err, numRemoved) => {
        if (err) {
          resolve(false);
          console.error('Error removing document:', err);
        } else {
          resolve(true);
        }
      });
    });
  }

  _deleteByIds(ids: string[]): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!ids || ids.length === 0) {
        resolve(false);
      }
      // 删除多个文档
      const removeQuery = { ...this.collectionParam, [this.primaryKey]: { $in: ids } };
      this.db.remove(removeQuery, { multi: true }, (err, numRemoved) => {
        if (err) {
          console.error('Error removing documents:', err);
          resolve(false);
        } else {
          console.log('_deleteByIds:', numRemoved);
          resolve(true);
        }
      });
    });
  }

  _updateById(id: string, values: BaseParam): Promise<void> {
    return new Promise((resolve) => {
      const updateQuery = { ...this.collectionParam, [this.primaryKey]: id };
      const updateData = { $set: removeNullValues(values) }; // 要更新的字段和值
      this.db.update(updateQuery, updateData, {}, (err, numReplaced) => {
        if (err) {
          console.error('Error updating document:', err);
        } else {
          console.log('_updateById:', numReplaced);
        }
        resolve();
      });
    });
  }

  /**
   *  根据ID查询一条数据
   * @param id  要查询的文档的ID
   */
  _findById(id: string): Promise<T> {
    return new Promise<T>((resolve) => {
      if (!id) {
        return {} as T;
      }
      const query = { ...this.collectionParam, [this.primaryKey]: id }; // 根据文档的ID进行查询
      this.db.findOne(query, (err, doc) => {
        if (err) {
          console.error('Error querying data:', err);
          resolve({} as T);
        } else {
          console.log('_findById:', doc);
          resolve(doc);
        }
      });
    });
  }

  _findByIds(ids: string[]): Promise<T[]> {
    return new Promise<T[]>((resolve) => {
      //const documentIds = ['id1', 'id2', 'id3']; // 要查询的文档的ID数组
      const query = { ...this.collectionParam, [this.primaryKey]: { $in: ids } }; // 使用$in运算符匹配多个ID值
      this.db.find(query, (err, docs) => {
        if (err) {
          console.error('Error querying data:', err);
          resolve([]);
        } else {
          console.log('_findByIds:', docs);
          resolve(docs);
        }
      });
    });
  }

  _countByWhereParam(whereParam: Partial<T>): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // 根据条件统计文档数量
      this.db.count({ ...this.collectionParam, ...whereParam }, (err, count) => {
        if (err) {
          console.error('Error counting documents:', err);
          resolve(0);
        } else {
          console.log('Count:', count);
          resolve(count);
        }
      });
    });
  }

  _findByWhereParam(whereParam: BaseParam): Promise<T[]> {
    return new Promise<T[]>((resolve) => {
      this.db.find({ ...this.collectionParam, ...whereParam }, (err, docs) => {
        if (err) {
          console.error('Error querying documents:', err);
          resolve([]);
        } else {
          console.log('_findByWhereParam:', docs);
          resolve(docs);
        }
      });
    });
  }
  _findAndSort(whereParam: BaseParam, sortParam: { [key: string]: number }): Promise<T[]> {
    return new Promise<T[]>((resolve) => {
      this.db
        .find({ ...this.collectionParam, ...whereParam })
        .sort(sortParam)
        .exec((err, docs) => {
          if (err) {
            console.error('Error querying data:', err);
            resolve([]);
          } else {
            console.log('_findAndSort:', docs);
            resolve(docs);
          }
        });
    });
  }

  _findOneByWhereParam(whereParam: BaseParam): Promise<T> {
    return new Promise<T>((resolve) => {
      this.db.find({ ...this.collectionParam, ...whereParam }, (err, docs) => {
        if (err) {
          console.error('Error querying documents:', err);
          resolve({} as T);
        } else {
          console.log('_findOneByWhereParam:', docs);
          resolve(docs[0]);
        }
      });
    });
  }
}

export default BaseDao;
