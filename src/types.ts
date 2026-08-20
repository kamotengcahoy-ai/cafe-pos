export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  active?: boolean;
  pin?: string;
  createdAt?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  currentStock: number; // in unit
  unit: string; // 'kg', 'g', 'L', 'ml', 'pcs', 'bottle', 'can'
  costPerUnit: number; // ₱ per unit
  reorderLevel: number;
  lastRestocked?: string;
  supplierId?: string;
}

export interface RecipeItem {
  ingredientId: string;
  ingredientName?: string;
  amount: number; // in ingredient's recipe unit (e.g. 18 for g, 150 for ml)
  unit: string;
  cost?: number; // calculated
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required?: boolean;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  category: 'Coffee' | 'Non-Coffee' | 'Waffles' | 'Sandwiches' | 'Rice Meals' | 'Snacks' | 'Desserts' | 'Add-ons' | string;
  sellingPrice: number;
  cost: number; // Calculated from recipe or specified
  profit: number; // sellingPrice - cost
  profitMargin: number; // ((sellingPrice - cost) / sellingPrice) * 100
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK';
  imageUrl?: string;
  recipe: RecipeItem[];
  modifierGroups?: ModifierGroup[];
  description?: string;
}

export interface CartItemModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  id: string; // unique item instance id in cart
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  modifiers: CartItemModifier[];
  itemTotal: number;
  notes?: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer';
export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type OrderType = 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
export type DeliveryPlatform = 'IN_HOUSE' | 'GRAB_FOOD' | 'FOODPANDA' | 'LALAMOVE' | 'CUSTOM';

export interface SaleItem {
  productId: string;
  productName: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  modifiers?: CartItemModifier[];
  itemTotal: number;
  itemCost?: number;
  recipeSnapshot?: RecipeItem[];
}

export interface Sale {
  id: string;
  receiptNumber: string;
  shiftId?: string;
  cashierId: string;
  cashierName: string;
  orderType?: OrderType;
  deliveryFee?: number;
  deliveryPlatform?: DeliveryPlatform;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: SaleItem[];
  subtotal: number;
  discountType?: 'NONE' | 'SENIOR_PWD' | 'STUDENT' | 'CUSTOM' | 'PROMO';
  discountAmount: number;
  discountPercentage?: number;
  total: number;
  totalCost: number; // COGS for this sale
  netProfit: number; // total - totalCost
  paymentMethod: PaymentMethod;
  amountTendered: number;
  change: number;
  paymentReference?: string;
  status: SaleStatus;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  cashSales: number;
  gcashSales: number;
  mayaSales: number;
  bankSales: number;
  totalSales: number;
  expectedCash: number; // startingCash + cashSales
  actualCash?: number;
  discrepancy?: number; // actualCash - expectedCash
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  discrepancyApprovedBy?: string;
}

export type ExpenseCategory =
  | 'Ingredients'
  | 'Electricity'
  | 'Water'
  | 'LPG'
  | 'LPG Gas'
  | 'Packaging'
  | 'Transportation'
  | 'Repairs'
  | 'Repairs & Maintenance'
  | 'Equipment'
  | 'Rent'
  | 'Raw Ingredients'
  | 'Staff Meal & Welfare'
  | 'Cleaning Supplies'
  | 'Marketing & Promo'
  | 'Permits & Licenses'
  | 'Miscellaneous'
  | string;

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  addedBy?: string;
  addedByName?: string;
  recordedBy?: string;
  approvedBy?: string;
  receiptNumber?: string;
}

export interface PurchaseOrder {
  id: string;
  createdAt?: string;
  date?: string;
  supplierId: string;
  supplierName: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  invoiceNumber?: string;
  notes?: string;
  receivedBy: string;
  receivedByName?: string;
}

export type Purchase = PurchaseOrder;

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  suppliedItems?: string[];
}

export type ActionType =
  | 'DELETE_PRODUCT'
  | 'DELETE_TRANSACTION'
  | 'VOID_TRANSACTION'
  | 'REFUND_TRANSACTION'
  | 'CHANGE_COMPLETED_ORDER'
  | 'PRICE_CHANGE'
  | 'DISCOUNT_LIMIT'
  | 'INVENTORY_ADJUSTMENT'
  | 'DELETE_INVENTORY'
  | 'RECIPE_CHANGE'
  | 'PRODUCT_COST_CHANGE'
  | 'DELETE_EXPENSE'
  | 'EDIT_EXPENSE'
  | 'PERMISSION_CHANGE'
  | 'USER_MANAGEMENT'
  | 'PAYMENT_RECORD_CHANGE'
  | 'SHIFT_DISCREPANCY'
  | 'SYSTEM_SETTINGS'
  | 'SETTINGS_UPDATE'
  | string;

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: string;
  action?: ActionType;
  actionType?: ActionType;
  actionTitle?: string;
  requestedBy?: string;
  requestedByName: string;
  requestedByRole: UserRole;
  itemAffected: string;
  targetId?: string;
  oldValue: string;
  newValue: string;
  reason: string;
  payload?: any;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedByName?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  performedByName?: string;
  performedByRole?: UserRole;
  action: string;
  itemAffected?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  approvalStatus?: string;
  authorizedByName?: string;
  approvingOwner?: string;
  authorizationMethod?: string;
}

export interface SystemSettings {
  cafeName: string;
  branchName: string;
  address: string;
  contactNumber: string;
  taxIdentificationNumber: string;
  currency?: string;
  receiptHeader?: string;
  receiptFooter: string;
  currencySymbol?: string;
  maxStaffDiscountPercent: number; // e.g. 10%
  defaultDeliveryFee?: number;
  lowStockThresholdNotification?: boolean;
}

export type CafeSettings = SystemSettings;
