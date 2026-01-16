
import { Roll, StockFilm } from '../types';

const DB_NAME = 'FilmArchiveDB';
const STORE_NAME = 'rolls';
const STOCK_STORE_NAME = 'stock';
const DB_VERSION = 2; // 升级版本号以创建新的 ObjectStore

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建胶卷仓库
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      
      // 创建冰箱库存仓库
      if (!db.objectStoreNames.contains(STOCK_STORE_NAME)) {
        db.createObjectStore(STOCK_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// 胶卷相关操作
export const saveRollToDB = async (roll: Roll): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(roll);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllRollsFromDB = async (): Promise<Roll[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteRollFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// 冰箱库存相关操作
export const saveStockToDB = async (stock: StockFilm[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STOCK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STOCK_STORE_NAME);
    
    // 先清空旧数据，再写入新数组（保持顺序）
    store.clear();
    stock.forEach(item => store.put(item));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllStockFromDB = async (): Promise<StockFilm[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STOCK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(STOCK_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
