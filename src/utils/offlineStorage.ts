// Offline Storage & Background Sync Engine for Café POS
// Uses localStorage & IndexedDB for persistent caching and queueing

import {
  ApprovalRequest,
  AuditLog,
  CafeSettings,
  Expense,
  Ingredient,
  Product,
  Purchase,
  Sale,
  Shift,
  Supplier,
  User,
} from '../types.js';

export interface QueuedSyncItem {
  id: string;
  type: 'CHECKOUT_SALE' | 'CREATE_EXPENSE' | 'STOCK_PURCHASE' | 'INVENTORY_ADJUST' | 'VOID_SALE' | 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'UPDATE_SETTINGS';
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  description: string;
}

const STORAGE_KEYS = {
  PRODUCTS: 'cafe_pos_cached_products',
  INGREDIENTS: 'cafe_pos_cached_ingredients',
  SALES: 'cafe_pos_cached_sales',
  EXPENSES: 'cafe_pos_cached_expenses',
  PURCHASES: 'cafe_pos_cached_purchases',
  SUPPLIERS: 'cafe_pos_cached_suppliers',
  USERS: 'cafe_pos_cached_users',
  SHIFTS: 'cafe_pos_cached_shifts',
  CURRENT_SHIFT: 'cafe_pos_cached_current_shift',
  APPROVALS: 'cafe_pos_cached_approvals',
  AUDIT_LOGS: 'cafe_pos_cached_audit_logs',
  SETTINGS: 'cafe_pos_cached_settings',
  SYNC_QUEUE: 'cafe_pos_sync_queue',
  LAST_SYNC_TIME: 'cafe_pos_last_sync_time',
  OFFLINE_STATUS: 'cafe_pos_offline_status',
};

export class OfflineStorageManager {
  // Save cache helper
  static saveCache<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage quota or storage error for key:', key, e);
    }
  }

  // Load cache helper
  static loadCache<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn('Failed to parse cached item for key:', key, e);
    }
    return defaultValue;
  }

  // Cache snapshots
  static cacheProducts(products: Product[]) {
    this.saveCache(STORAGE_KEYS.PRODUCTS, products);
  }
  static getCachedProducts(): Product[] {
    return this.loadCache<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  static cacheIngredients(ingredients: Ingredient[]) {
    this.saveCache(STORAGE_KEYS.INGREDIENTS, ingredients);
  }
  static getCachedIngredients(): Ingredient[] {
    return this.loadCache<Ingredient[]>(STORAGE_KEYS.INGREDIENTS, []);
  }

  static cacheSales(sales: Sale[]) {
    this.saveCache(STORAGE_KEYS.SALES, sales);
  }
  static getCachedSales(): Sale[] {
    return this.loadCache<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  static cacheExpenses(expenses: Expense[]) {
    this.saveCache(STORAGE_KEYS.EXPENSES, expenses);
  }
  static getCachedExpenses(): Expense[] {
    return this.loadCache<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  static cachePurchases(purchases: Purchase[]) {
    this.saveCache(STORAGE_KEYS.PURCHASES, purchases);
  }
  static getCachedPurchases(): Purchase[] {
    return this.loadCache<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  static cacheSuppliers(suppliers: Supplier[]) {
    this.saveCache(STORAGE_KEYS.SUPPLIERS, suppliers);
  }
  static getCachedSuppliers(): Supplier[] {
    return this.loadCache<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  }

  static cacheUsers(users: User[]) {
    this.saveCache(STORAGE_KEYS.USERS, users);
  }
  static getCachedUsers(): User[] {
    return this.loadCache<User[]>(STORAGE_KEYS.USERS, []);
  }

  static cacheShifts(shifts: Shift[]) {
    this.saveCache(STORAGE_KEYS.SHIFTS, shifts);
  }
  static getCachedShifts(): Shift[] {
    return this.loadCache<Shift[]>(STORAGE_KEYS.SHIFTS, []);
  }

  static cacheCurrentShift(shift: Shift | null) {
    this.saveCache(STORAGE_KEYS.CURRENT_SHIFT, shift);
  }
  static getCachedCurrentShift(): Shift | null {
    return this.loadCache<Shift | null>(STORAGE_KEYS.CURRENT_SHIFT, null);
  }

  static cacheSettings(settings: CafeSettings) {
    this.saveCache(STORAGE_KEYS.SETTINGS, settings);
  }
  static getCachedSettings(): CafeSettings | null {
    return this.loadCache<CafeSettings | null>(STORAGE_KEYS.SETTINGS, null);
  }

  static cacheAuditLogs(logs: AuditLog[]) {
    this.saveCache(STORAGE_KEYS.AUDIT_LOGS, logs);
  }
  static getCachedAuditLogs(): AuditLog[] {
    return this.loadCache<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  // Sync Queue Methods
  static getSyncQueue(): QueuedSyncItem[] {
    return this.loadCache<QueuedSyncItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  static addToSyncQueue(item: Omit<QueuedSyncItem, 'id' | 'createdAt' | 'retryCount'>): QueuedSyncItem {
    const queue = this.getSyncQueue();
    const newItem: QueuedSyncItem = {
      ...item,
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newItem);
    this.saveCache(STORAGE_KEYS.SYNC_QUEUE, queue);
    return newItem;
  }

  static removeFromSyncQueue(id: string): void {
    const queue = this.getSyncQueue().filter((q) => q.id !== id);
    this.saveCache(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  static updateQueueItemError(id: string, errorMsg: string): void {
    const queue = this.getSyncQueue().map((q) => {
      if (q.id === id) {
        return {
          ...q,
          retryCount: q.retryCount + 1,
          lastError: errorMsg,
        };
      }
      return q;
    });
    this.saveCache(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  static clearSyncQueue(): void {
    this.saveCache(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  static setLastSyncTime(timeStr: string) {
    this.saveCache(STORAGE_KEYS.LAST_SYNC_TIME, timeStr);
  }

  static getLastSyncTime(): string | null {
    return this.loadCache<string | null>(STORAGE_KEYS.LAST_SYNC_TIME, null);
  }
}
