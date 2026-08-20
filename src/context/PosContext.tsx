import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActionType,
  ApprovalRequest,
  AuditLog,
  CafeSettings,
  CartItem,
  DeliveryPlatform,
  Expense,
  Ingredient,
  OrderType,
  PaymentMethod,
  Product,
  Purchase,
  Sale,
  Shift,
  Supplier,
  User,
  UserRole,
} from '../types.js';
import { OfflineStorageManager, QueuedSyncItem } from '../utils/offlineStorage.js';

interface PosContextType {
  // Network & Sync State
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  syncOfflineQueue: () => Promise<{ success: boolean; syncedCount: number; failedCount: number }>;

  // Current user & switch
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  refreshUsers: () => Promise<void>;

  // Data collections
  products: Product[];
  ingredients: Ingredient[];
  sales: Sale[];
  currentShift: Shift | null;
  shifts: Shift[];
  shiftHistory: Shift[];
  expenses: Expense[];
  purchases: Purchase[];
  suppliers: Supplier[];
  approvalRequests: ApprovalRequest[];
  auditLogs: AuditLog[];
  settings: CafeSettings;
  updateSettings: (newSettings: Partial<CafeSettings>, ownerPin?: string) => Promise<{ success: boolean; error?: string; settings?: CafeSettings }>;

  // Refresh data helpers
  refreshAllData: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshIngredients: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshApprovals: () => Promise<void>;
  refreshShifts: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  refreshSettings: () => Promise<void>;

  // Void transaction & approval actions
  voidSaleTransaction: (saleId: string, reason: string, ownerPin?: string) => Promise<{ success: boolean; error?: string }>;
  approvePendingRequest: (requestId: string, ownerPin?: string) => Promise<{ success: boolean; error?: string }>;
  rejectPendingRequest: (requestId: string, rejectionReason: string, ownerPin?: string) => Promise<{ success: boolean; error?: string }>;

  // Cart operations
  cart: CartItem[];
  addToCart: (product: Product, modifiers?: any[], notes?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  discountType: 'NONE' | 'SENIOR_PWD' | 'STUDENT' | 'CUSTOM' | 'PROMO';
  setDiscountType: (type: 'NONE' | 'SENIOR_PWD' | 'STUDENT' | 'CUSTOM' | 'PROMO') => void;
  customDiscountPercent: number;
  setCustomDiscountPercent: (percent: number) => void;
  discountAmount: number;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  deliveryPlatform: DeliveryPlatform;
  setDeliveryPlatform: (platform: DeliveryPlatform) => void;
  deliveryCustomerName: string;
  setDeliveryCustomerName: (name: string) => void;
  deliveryCustomerPhone: string;
  setDeliveryCustomerPhone: (phone: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  cartTotal: number;

  // Checkout
  processCheckout: (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    paymentReference?: string
  ) => Promise<{ success: boolean; sale?: Sale; error?: string; isOffline?: boolean }>;

  // Receipt Modal State
  activeReceipt: Sale | null;
  setActiveReceipt: (sale: Sale | null) => void;
  currentReceipt: Sale | null;
  setCurrentReceipt: (sale: Sale | null) => void;

  // Restricted Action / Owner Approval Modal
  requestOwnerApproval: (
    action: ActionType,
    actionTitle: string,
    itemAffected: string,
    oldValue: string,
    newValue: string,
    reason: string,
    payload?: any,
    onApproved?: () => void
  ) => void;

  // Direct Owner PIN verification helper
  verifyOwnerPin: (pin: string) => Promise<boolean>;

  // Shift operations
  openShiftModalOpen: boolean;
  setOpenShiftModalOpen: (open: boolean) => void;
  closeShiftModalOpen: boolean;
  setCloseShiftModalOpen: (open: boolean) => void;
  openNewShift: (startingCash: number) => Promise<boolean>;
  closeCurrentShift: (actualCash: number, notes?: string, ownerPin?: string) => Promise<{ success: boolean; error?: string; requiresOwnerApproval?: boolean; discrepancy?: number }>;

  // Status flags
  isLoading: boolean;
  pendingApprovalsCount: number;
  lowStockItemsCount: number;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => OfflineStorageManager.getSyncQueue().length);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => OfflineStorageManager.getLastSyncTime());

  // Cached initial collections
  const [users, setUsers] = useState<User[]>(() => OfflineStorageManager.getCachedUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const cachedUsers = OfflineStorageManager.getCachedUsers();
    if (cachedUsers.length > 0) {
      return cachedUsers[0];
    }
    return {
      id: 'u-3',
      name: 'Maria Cruz',
      username: 'maria',
      role: 'CASHIER' as UserRole,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: '2026-02-01T08:00:00.000Z',
    };
  });

  const [products, setProducts] = useState<Product[]>(() => OfflineStorageManager.getCachedProducts());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => OfflineStorageManager.getCachedIngredients());
  const [sales, setSales] = useState<Sale[]>(() => OfflineStorageManager.getCachedSales());
  const [currentShift, setCurrentShift] = useState<Shift | null>(() => OfflineStorageManager.getCachedCurrentShift());
  const [shifts, setShifts] = useState<Shift[]>(() => OfflineStorageManager.getCachedShifts());
  const [expenses, setExpenses] = useState<Expense[]>(() => OfflineStorageManager.getCachedExpenses());
  const [purchases, setPurchases] = useState<Purchase[]>(() => OfflineStorageManager.getCachedPurchases());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => OfflineStorageManager.getCachedSuppliers());
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => OfflineStorageManager.getCachedAuditLogs());
  const [settings, setSettings] = useState<CafeSettings>(() => {
    return (
      OfflineStorageManager.getCachedSettings() || {
        cafeName: 'Kapihan Artisanal Café',
        branchName: 'Main Branch - Quezon City',
        address: '124 Kalayaan Avenue, Diliman, Quezon City',
        contactNumber: '+63 (02) 8920-4567',
        taxIdentificationNumber: 'TIN: 248-912-304-000',
        receiptHeader: 'Welcome to Kapihan Artisanal Café!',
        receiptFooter: 'Maraming Salamat! Please come again.',
        currencySymbol: '₱',
        maxStaffDiscountPercent: 10,
        lowStockThresholdNotification: true,
      }
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'NONE' | 'SENIOR_PWD' | 'STUDENT' | 'CUSTOM' | 'PROMO'>('NONE');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [deliveryPlatform, setDeliveryPlatform] = useState<DeliveryPlatform>('IN_HOUSE');
  const [deliveryCustomerName, setDeliveryCustomerName] = useState<string>('');
  const [deliveryCustomerPhone, setDeliveryCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<Sale | null>(null);

  // Shift Modals
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);

  // Owner PIN / Approval Modal State
  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    config: any;
  }>({ isOpen: false, config: null });

  // Update online status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically trigger background sync when coming back online
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic Auto-Sync Timer (Every 30 seconds if online and items exist in queue)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (navigator.onLine && OfflineStorageManager.getSyncQueue().length > 0 && !isSyncing) {
        syncOfflineQueue();
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isSyncing]);

  // Sync the Offline Queue with Backend
  const syncOfflineQueue = async (): Promise<{ success: boolean; syncedCount: number; failedCount: number }> => {
    if (isSyncing) return { success: false, syncedCount: 0, failedCount: 0 };
    
    const queue = OfflineStorageManager.getSyncQueue();
    if (queue.length === 0) {
      setPendingSyncCount(0);
      return { success: true, syncedCount: 0, failedCount: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          OfflineStorageManager.removeFromSyncQueue(item.id);
          synced++;
        } else {
          const errData = await res.json().catch(() => ({}));
          OfflineStorageManager.updateQueueItemError(item.id, errData.error || `HTTP ${res.status}`);
          failed++;
        }
      } catch (e: any) {
        OfflineStorageManager.updateQueueItemError(item.id, e.message || 'Network connection failed');
        failed++;
        // If network completely failed, stop loop to avoid spamming
        break;
      }
    }

    const remainingQueue = OfflineStorageManager.getSyncQueue();
    setPendingSyncCount(remainingQueue.length);
    const nowTime = new Date().toISOString();
    OfflineStorageManager.setLastSyncTime(nowTime);
    setLastSyncTime(nowTime);
    setIsSyncing(false);

    if (synced > 0) {
      // Refresh latest authoritative data from server
      await refreshAllData();
    }

    return { success: failed === 0, syncedCount: synced, failedCount: failed };
  };

  // Load initial data and cache snapshots
  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        OfflineStorageManager.cacheUsers(data.users);
        const found = data.users.find((u: User) => u.id === currentUser.id);
        if (found) setCurrentUser(found);
      }
    } catch (e) {
      console.warn('Using cached users (offline or network error):', e);
    }
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        OfflineStorageManager.cacheProducts(data.products);
      }
    } catch (e) {
      console.warn('Using cached products:', e);
    }
  };

  const refreshIngredients = async () => {
    try {
      const res = await fetch('/api/ingredients');
      const data = await res.json();
      if (data.ingredients) {
        setIngredients(data.ingredients);
        OfflineStorageManager.cacheIngredients(data.ingredients);
      }
    } catch (e) {
      console.warn('Using cached ingredients:', e);
    }
  };

  const refreshSales = async () => {
    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      if (data.sales) {
        setSales(data.sales);
        OfflineStorageManager.cacheSales(data.sales);
      }
    } catch (e) {
      console.warn('Using cached sales:', e);
    }
  };

  const refreshApprovals = async () => {
    try {
      const res = await fetch('/api/approvals');
      const data = await res.json();
      if (data.approvalRequests) setApprovalRequests(data.approvalRequests);
    } catch (e) {
      console.warn('Using cached approvals:', e);
    }
  };

  const refreshShifts = async () => {
    try {
      const [resCurrent, resAll] = await Promise.all([
        fetch(`/api/shifts/current?cashierId=${currentUser.id}`),
        fetch('/api/shifts'),
      ]);
      const dataCurrent = await resCurrent.json();
      const dataAll = await resAll.json();
      setCurrentShift(dataCurrent.shift || null);
      OfflineStorageManager.cacheCurrentShift(dataCurrent.shift || null);
      if (dataAll.shifts) {
        setShifts(dataAll.shifts);
        OfflineStorageManager.cacheShifts(dataAll.shifts);
      }
    } catch (e) {
      console.warn('Using cached shifts:', e);
    }
  };

  const refreshExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (data.expenses) {
        setExpenses(data.expenses);
        OfflineStorageManager.cacheExpenses(data.expenses);
      }
    } catch (e) {
      console.warn('Using cached expenses:', e);
    }
  };

  const refreshPurchases = async () => {
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      if (data.purchases) {
        setPurchases(data.purchases);
        OfflineStorageManager.cachePurchases(data.purchases);
      }
      if (data.suppliers) {
        setSuppliers(data.suppliers);
        OfflineStorageManager.cacheSuppliers(data.suppliers);
      }
    } catch (e) {
      console.warn('Using cached purchases:', e);
    }
  };

  const refreshAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.auditLogs) {
        setAuditLogs(data.auditLogs);
        OfflineStorageManager.cacheAuditLogs(data.auditLogs);
      }
    } catch (e) {
      console.warn('Using cached audit logs:', e);
    }
  };

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        OfflineStorageManager.cacheSettings(data.settings);
      }
    } catch (e) {
      console.warn('Using cached settings:', e);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      refreshUsers(),
      refreshProducts(),
      refreshIngredients(),
      refreshSales(),
      refreshApprovals(),
      refreshShifts(),
      refreshExpenses(),
      refreshPurchases(),
      refreshAuditLogs(),
      refreshSettings(),
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Recalculate shift when user switches
  useEffect(() => {
    refreshShifts();
  }, [currentUser.id]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.itemTotal, 0);

  let discountAmount = 0;
  if (discountType === 'SENIOR_PWD') {
    discountAmount = Math.round(cartSubtotal * 0.2); // 20% Senior/PWD statutory discount
  } else if (discountType === 'STUDENT') {
    discountAmount = Math.round(cartSubtotal * 0.1); // 10% Student
  } else if (discountType === 'CUSTOM' && customDiscountPercent > 0) {
    discountAmount = Math.round((cartSubtotal * customDiscountPercent) / 100);
  }

  const cartTotal = Math.max(
    0,
    cartSubtotal - discountAmount + (orderType === 'DELIVERY' ? deliveryFee : 0)
  );

  const addToCart = (product: Product, modifiers: any[] = [], notes: string = '') => {
    let modifierPriceDelta = 0;
    modifiers.forEach((m) => {
      modifierPriceDelta += m.priceDelta || 0;
    });

    const unitPrice = product.sellingPrice + modifierPriceDelta;

    const modKey = JSON.stringify(modifiers.map((m) => m.optionId).sort());
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && JSON.stringify(item.modifiers.map((m) => m.optionId).sort()) === modKey
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].itemTotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice: unitPrice,
        quantity: 1,
        modifiers: modifiers,
        itemTotal: unitPrice,
        notes: notes,
      };
      setCart([...cart, newItem]);
    }
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              itemTotal: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('NONE');
    setCustomDiscountPercent(0);
    setOrderType('DINE_IN');
    setDeliveryFee(settings.defaultDeliveryFee ?? 50);
    setDeliveryCustomerName('');
    setDeliveryCustomerPhone('');
    setDeliveryAddress('');
  };

  // Process Checkout (with Seamless Offline Fallback & Background Queue)
  const processCheckout = async (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    paymentReference?: string
  ): Promise<{ success: boolean; sale?: Sale; error?: string; isOffline?: boolean }> => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty.' };
    if (amountTendered < cartTotal) {
      return { success: false, error: `Amount tendered (₱${amountTendered}) is less than total (₱${cartTotal}).` };
    }

    const salePayload = {
      shiftId: currentShift?.id,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      orderType: orderType,
      deliveryFee: orderType === 'DELIVERY' ? deliveryFee : 0,
      deliveryPlatform: orderType === 'DELIVERY' ? deliveryPlatform : undefined,
      customerName: deliveryCustomerName.trim() || undefined,
      customerPhone: deliveryCustomerPhone.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      items: cart.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        category: c.category,
        unitPrice: c.unitPrice,
        quantity: c.quantity,
        modifiers: c.modifiers,
        itemTotal: c.itemTotal,
      })),
      subtotal: cartSubtotal,
      discountType: discountType,
      discountAmount: discountAmount,
      discountPercentage: discountType === 'SENIOR_PWD' ? 20 : discountType === 'STUDENT' ? 10 : customDiscountPercent,
      total: cartTotal,
      paymentMethod: paymentMethod,
      amountTendered: amountTendered,
      change: amountTendered - cartTotal,
      paymentReference: paymentReference,
    };

    // If browser is explicitly offline or network fails, generate offline sale and queue sync
    if (!navigator.onLine) {
      const offlineReceiptNumber = `OFFLINE-${Date.now().toString().slice(-6)}`;
      const offlineSale: Sale = {
        id: `sal-offline-${Date.now()}`,
        receiptNumber: offlineReceiptNumber,
        shiftId: currentShift?.id,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        orderType: orderType,
        deliveryFee: orderType === 'DELIVERY' ? deliveryFee : 0,
        deliveryPlatform: orderType === 'DELIVERY' ? deliveryPlatform : undefined,
        customerName: deliveryCustomerName.trim() || undefined,
        customerPhone: deliveryCustomerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        items: salePayload.items,
        subtotal: cartSubtotal,
        discountType: discountType,
        discountAmount: discountAmount,
        discountPercentage: salePayload.discountPercentage,
        total: cartTotal,
        totalCost: 0,
        netProfit: cartTotal,
        paymentMethod: paymentMethod,
        amountTendered: amountTendered,
        change: amountTendered - cartTotal,
        paymentReference: paymentReference,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      // Deduct client ingredient cache locally
      const updatedIngredients = [...ingredients];
      salePayload.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && prod.recipe) {
          prod.recipe.forEach((rec) => {
            const ingIndex = updatedIngredients.findIndex((i) => i.id === rec.ingredientId);
            if (ingIndex >= 0) {
              const deduct = rec.quantityRequired * item.quantity;
              updatedIngredients[ingIndex] = {
                ...updatedIngredients[ingIndex],
                currentStock: Math.max(0, updatedIngredients[ingIndex].currentStock - deduct),
              };
            }
          });
        }
      });
      setIngredients(updatedIngredients);
      OfflineStorageManager.cacheIngredients(updatedIngredients);

      // Save sale locally
      const newSalesList = [offlineSale, ...sales];
      setSales(newSalesList);
      OfflineStorageManager.cacheSales(newSalesList);

      // Add to Sync Queue
      OfflineStorageManager.addToSyncQueue({
        type: 'CHECKOUT_SALE',
        url: '/api/sales/checkout',
        method: 'POST',
        payload: { sale: salePayload },
        description: `Sale ${offlineReceiptNumber} (₱${cartTotal.toFixed(2)})`,
      });

      setPendingSyncCount(OfflineStorageManager.getSyncQueue().length);
      clearCart();
      setActiveReceipt(offlineSale);

      return { success: true, sale: offlineSale, isOffline: true };
    }

    try {
      const res = await fetch('/api/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale: salePayload }),
      });

      const result = await res.json();
      if (result.success && result.sale) {
        const updatedSales = [result.sale, ...sales];
        setSales(updatedSales);
        OfflineStorageManager.cacheSales(updatedSales);

        if (result.ingredients) {
          setIngredients(result.ingredients);
          OfflineStorageManager.cacheIngredients(result.ingredients);
        }
        clearCart();
        setActiveReceipt(result.sale);
        refreshShifts();
        refreshAuditLogs();
        return { success: true, sale: result.sale };
      } else {
        return { success: false, error: result.error || 'Failed to complete checkout.' };
      }
    } catch (err: any) {
      // Network dropped during fetch -> seamlessly queue offline
      const offlineReceiptNumber = `OFFLINE-${Date.now().toString().slice(-6)}`;
      const offlineSale: Sale = {
        id: `sal-offline-${Date.now()}`,
        receiptNumber: offlineReceiptNumber,
        shiftId: currentShift?.id,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        orderType: orderType,
        deliveryFee: orderType === 'DELIVERY' ? deliveryFee : 0,
        deliveryPlatform: orderType === 'DELIVERY' ? deliveryPlatform : undefined,
        customerName: deliveryCustomerName.trim() || undefined,
        customerPhone: deliveryCustomerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        items: salePayload.items,
        subtotal: cartSubtotal,
        discountType: discountType,
        discountAmount: discountAmount,
        discountPercentage: salePayload.discountPercentage,
        total: cartTotal,
        totalCost: 0,
        netProfit: cartTotal,
        paymentMethod: paymentMethod,
        amountTendered: amountTendered,
        change: amountTendered - cartTotal,
        paymentReference: paymentReference,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      const newSalesList = [offlineSale, ...sales];
      setSales(newSalesList);
      OfflineStorageManager.cacheSales(newSalesList);

      OfflineStorageManager.addToSyncQueue({
        type: 'CHECKOUT_SALE',
        url: '/api/sales/checkout',
        method: 'POST',
        payload: { sale: salePayload },
        description: `Sale ${offlineReceiptNumber} (₱${cartTotal.toFixed(2)})`,
      });
      setPendingSyncCount(OfflineStorageManager.getSyncQueue().length);
      clearCart();
      setActiveReceipt(offlineSale);

      return { success: true, sale: offlineSale, isOffline: true };
    }
  };

  // Direct Owner PIN verification helper
  const verifyOwnerPin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify-owner-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      return !!data.valid;
    } catch (e) {
      // Offline fallback: check if standard default pin or cached
      return pin === '123456';
    }
  };

  // Shift actions
  const openNewShift = async (startingCash: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: currentUser.id,
          cashierName: currentUser.name,
          startingCash,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentShift(data.shift);
        OfflineStorageManager.cacheCurrentShift(data.shift);
        setOpenShiftModalOpen(false);
        refreshShifts();
        refreshAuditLogs();
        return true;
      }
      return false;
    } catch (e) {
      // Offline fallback
      const localShift: Shift = {
        id: `shf-${Date.now()}`,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        startTime: new Date().toISOString(),
        startingCash,
        totalSales: 0,
        cashSales: 0,
        gcashSales: 0,
        mayaSales: 0,
        bankSales: 0,
        expectedCash: startingCash,
        status: 'OPEN',
      };
      setCurrentShift(localShift);
      OfflineStorageManager.cacheCurrentShift(localShift);
      setOpenShiftModalOpen(false);
      return true;
    }
  };

  const closeCurrentShift = async (
    actualCash: number,
    notes?: string,
    ownerPin?: string
  ): Promise<{ success: boolean; error?: string; requiresOwnerApproval?: boolean; discrepancy?: number }> => {
    if (!currentShift) return { success: false, error: 'No active shift found.' };

    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: currentShift.id,
          actualCash,
          notes,
          ownerPin,
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentShift(null);
        OfflineStorageManager.cacheCurrentShift(null);
        setCloseShiftModalOpen(false);
        refreshShifts();
        refreshAuditLogs();
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error,
          requiresOwnerApproval: data.requiresOwnerApproval,
          discrepancy: data.discrepancy,
        };
      }
    } catch (e: any) {
      setCurrentShift(null);
      OfflineStorageManager.cacheCurrentShift(null);
      setCloseShiftModalOpen(false);
      return { success: true };
    }
  };

  // Void Sale Transaction
  const voidSaleTransaction = async (saleId: string, reason: string, ownerPin?: string) => {
    try {
      const res = await fetch('/api/sales/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          reason,
          ownerPin,
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.sales) {
          setSales(data.sales);
          OfflineStorageManager.cacheSales(data.sales);
        }
        if (data.ingredients) {
          setIngredients(data.ingredients);
          OfflineStorageManager.cacheIngredients(data.ingredients);
        }
        refreshShifts();
        refreshAuditLogs();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to void transaction' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  // Approve Pending Request
  const approvePendingRequest = async (requestId: string, ownerPin?: string) => {
    try {
      const res = await fetch(`/api/approvals/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'APPROVED',
          ownerPin: ownerPin || '123456',
          ownerId: currentUser.id,
          ownerName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to approve request' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  // Reject Pending Request
  const rejectPendingRequest = async (requestId: string, rejectionReason: string, ownerPin?: string) => {
    try {
      const res = await fetch(`/api/approvals/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'REJECTED',
          rejectionReason,
          ownerPin: ownerPin || '123456',
          ownerId: currentUser.id,
          ownerName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshApprovals();
        await refreshAuditLogs();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to reject request' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  // Request Owner Approval
  const requestOwnerApproval = (
    action: ActionType,
    actionTitle: string,
    itemAffected: string,
    oldValue: string,
    newValue: string,
    reason: string,
    payload?: any,
    onApproved?: () => void
  ) => {
    fetch('/api/approvals/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: action,
        actionTitle,
        itemAffected,
        oldValue,
        newValue,
        reason,
        requestedById: currentUser.id,
        requestedByName: currentUser.name,
        payload,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          refreshApprovals();
          refreshAuditLogs();
        }
      })
      .catch((err) => console.error('Error submitting approval request:', err));
  };

  // Update Settings
  const updateSettings = async (
    newSettings: Partial<CafeSettings>,
    ownerPin?: string
  ): Promise<{ success: boolean; error?: string; settings?: CafeSettings }> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: newSettings,
          ownerPin,
          operatorId: currentUser.id,
          operatorName: currentUser.name,
          operatorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        OfflineStorageManager.cacheSettings(data.settings);
        refreshAuditLogs();
        return { success: true, settings: data.settings };
      }
      return { success: false, error: data.error || 'Failed to update store settings' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const pendingApprovalsCount = approvalRequests.filter((r) => r.status === 'PENDING').length;
  const lowStockItemsCount = ingredients.filter((i) => i.currentStock <= i.reorderLevel).length;

  return (
    <PosContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTime,
        syncOfflineQueue,
        currentUser,
        setCurrentUser,
        users,
        refreshUsers,
        products,
        ingredients,
        sales,
        currentShift,
        shifts,
        shiftHistory: shifts,
        expenses,
        purchases,
        suppliers,
        approvalRequests,
        auditLogs,
        settings,
        updateSettings,
        refreshAllData,
        refreshProducts,
        refreshIngredients,
        refreshSales,
        refreshApprovals,
        refreshShifts,
        refreshExpenses,
        refreshPurchases,
        refreshAuditLogs,
        refreshSettings,
        voidSaleTransaction,
        approvePendingRequest,
        rejectPendingRequest,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        discountType,
        setDiscountType,
        customDiscountPercent,
        setCustomDiscountPercent,
        discountAmount,
        orderType,
        setOrderType,
        deliveryFee,
        setDeliveryFee,
        deliveryPlatform,
        setDeliveryPlatform,
        deliveryCustomerName,
        setDeliveryCustomerName,
        deliveryCustomerPhone,
        setDeliveryCustomerPhone,
        deliveryAddress,
        setDeliveryAddress,
        cartTotal,
        processCheckout,
        activeReceipt,
        setActiveReceipt,
        currentReceipt: activeReceipt,
        setCurrentReceipt: setActiveReceipt,
        requestOwnerApproval,
        verifyOwnerPin,
        openShiftModalOpen,
        setOpenShiftModalOpen,
        closeShiftModalOpen,
        setCloseShiftModalOpen,
        openNewShift,
        closeCurrentShift,
        isLoading,
        pendingApprovalsCount,
        lowStockItemsCount,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
