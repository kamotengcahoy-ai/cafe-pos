import express, { Request, Response } from 'express';
import { db, hashSecret } from './db.js';
import {
  ActionType,
  ApprovalRequest,
  Expense,
  Ingredient,
  PaymentMethod,
  Product,
  Purchase,
  Sale,
  Shift,
  Supplier,
  User,
} from '../src/types.js';

export const apiRouter = express.Router();

// ----------------------------------------------------
// AUTH & USER ENDPOINTS
// ----------------------------------------------------

// List all active public users for quick POS login / switch
apiRouter.get('/users', (req: Request, res: Response) => {
  const users = db.getPublicUsers();
  res.json({ users });
});

// Verify Owner PIN for authorization
apiRouter.post('/auth/verify-owner-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ valid: false, message: 'PIN is required.' });
  }

  const isValid = db.verifyOwnerPin(String(pin));
  if (isValid) {
    return res.json({ valid: true, message: 'Owner authorization confirmed.' });
  } else {
    return res.status(401).json({ valid: false, message: 'Invalid Owner Authorization PIN.' });
  }
});

// Update Owner PIN (requires old PIN verification)
const handleOwnerPinUpdate = (req: Request, res: Response) => {
  const { currentPin, newPin, userId, userName, operatorId, operatorName } = req.body;
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Both current and new PIN are required.' });
  }
  if (String(newPin).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
  }

  if (!db.verifyOwnerPin(String(currentPin))) {
    return res.status(401).json({ error: 'Current PIN is incorrect.' });
  }

  const newHash = hashSecret(String(newPin));
  db.getData().ownerPinHash = newHash;

  // Also update owner users pin
  db.getData().users.forEach((u) => {
    if (u.role === 'OWNER') {
      u.pinHash = newHash;
    }
  });

  db.logAudit({
    userId: userId || operatorId || 'u-1',
    userName: userName || operatorName || 'Owner',
    userRole: 'OWNER',
    action: 'Change Owner PIN',
    itemAffected: 'System Security Settings',
    oldValue: '••••••',
    newValue: '•••••• (Updated)',
    reason: 'Security credential rotation',
    approvalStatus: 'DIRECT_OWNER',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, message: 'Owner PIN updated successfully.' });
};

apiRouter.post('/settings/update-owner-pin', handleOwnerPinUpdate);
apiRouter.post('/settings/change-owner-pin', handleOwnerPinUpdate);

// Create or update employee
apiRouter.post('/users', (req: Request, res: Response) => {
  const { ownerPin, operatorId, operatorName, user } = req.body;
  const isOwnerAction = req.body.operatorRole === 'OWNER';

  if (!isOwnerAction && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization PIN required to manage employees.' });
  }

  const data = db.getData();
  const existingIndex = data.users.findIndex((u) => u.id === user.id);

  if (existingIndex >= 0) {
    const oldUser = data.users[existingIndex];
    data.users[existingIndex] = {
      ...oldUser,
      ...user,
      pinHash: user.pin ? hashSecret(user.pin) : oldUser.pinHash,
    };
    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: isOwnerAction ? 'OWNER' : 'MANAGER',
      action: 'Update Employee',
      itemAffected: user.name,
      oldValue: `${oldUser.role} (${oldUser.active ? 'Active' : 'Inactive'})`,
      newValue: `${user.role} (${user.active ? 'Active' : 'Inactive'})`,
      reason: 'Employee account modification',
      approvalStatus: isOwnerAction ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwnerAction ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  } else {
    const newUser = {
      id: `u-${Date.now()}`,
      name: user.name,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, ''),
      role: user.role || 'CASHIER',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      pinHash: hashSecret(user.pin || '123456'),
      passwordHash: hashSecret(user.password || 'password123'),
    };
    data.users.push(newUser);
    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: isOwnerAction ? 'OWNER' : 'MANAGER',
      action: 'Create Employee',
      itemAffected: newUser.name,
      oldValue: 'None',
      newValue: `Role: ${newUser.role}`,
      reason: 'New employee onboarding',
      approvalStatus: isOwnerAction ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwnerAction ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  }

  db.persist();
  res.json({ success: true, users: db.getPublicUsers() });
});

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json({ settings: db.getData().settings });
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const { settings, ownerPin, operatorRole, operatorName, operatorId } = req.body;
  if (operatorRole !== 'OWNER' && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required to change settings.' });
  }

  db.getData().settings = { ...db.getData().settings, ...settings };
  db.logAudit({
    userId: operatorId || 'u-1',
    userName: operatorName || 'Owner',
    userRole: 'OWNER',
    action: 'Update System Settings',
    itemAffected: 'Café General Configuration',
    oldValue: 'Previous Configuration',
    newValue: JSON.stringify(settings),
    reason: 'Store profile update',
    approvalStatus: 'DIRECT_OWNER',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, settings: db.getData().settings });
});

// ----------------------------------------------------
// PRODUCTS & RECIPES
// ----------------------------------------------------
apiRouter.get('/products', (req: Request, res: Response) => {
  res.json({ products: db.getData().products });
});

// Update or Create Product
apiRouter.post('/products', (req: Request, res: Response) => {
  const { product, ownerPin, operatorRole, operatorName, operatorId, reason } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required to modify products or prices.' });
  }

  const data = db.getData();
  const index = data.products.findIndex((p) => p.id === product.id);

  if (index >= 0) {
    const oldProduct = data.products[index];
    data.products[index] = { ...oldProduct, ...product };

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: oldProduct.sellingPrice !== product.sellingPrice ? 'Price Change' : 'Product Update',
      itemAffected: product.name,
      oldValue: `₱${oldProduct.sellingPrice} (Cost: ₱${oldProduct.cost})`,
      newValue: `₱${product.sellingPrice} (Cost: ₱${product.cost})`,
      reason: reason || 'Product menu maintenance',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  } else {
    const newProduct: Product = {
      id: product.id || `prod-${Date.now()}`,
      name: product.name,
      category: product.category || 'Coffee',
      sellingPrice: Number(product.sellingPrice),
      cost: Number(product.cost) || 0,
      profit: 0,
      profitMargin: 0,
      status: product.status || 'AVAILABLE',
      imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
      description: product.description || '',
      recipe: product.recipe || [],
      modifierGroups: product.modifierGroups || [],
    };
    data.products.push(newProduct);

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: 'Create Product',
      itemAffected: newProduct.name,
      oldValue: 'None',
      newValue: `Price: ₱${newProduct.sellingPrice}`,
      reason: reason || 'New menu offering',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  }

  db.updateProductCosts();
  res.json({ success: true, products: db.getData().products });
});

// Delete Product (Restricted)
apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { ownerPin, operatorRole, operatorName, operatorId, reason } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required to delete product.' });
  }

  const data = db.getData();
  const prod = data.products.find((p) => p.id === id);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  data.products = data.products.filter((p) => p.id !== id);

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: operatorRole,
    action: 'Delete Product',
    itemAffected: prod.name,
    oldValue: `Active Product (₱${prod.sellingPrice})`,
    newValue: 'Deleted from catalog',
    reason: reason || 'Menu discontinuation',
    approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
    approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, products: data.products });
});

// ----------------------------------------------------
// INVENTORY & INGREDIENTS
// ----------------------------------------------------
apiRouter.get('/ingredients', (req: Request, res: Response) => {
  res.json({ ingredients: db.getData().ingredients });
});

// Add / Edit Ingredient
apiRouter.post('/ingredients', (req: Request, res: Response) => {
  const { ingredient, ownerPin, operatorRole, operatorName, operatorId, reason } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required to modify ingredient specifications.' });
  }

  const data = db.getData();
  const index = data.ingredients.findIndex((i) => i.id === ingredient.id);

  if (index >= 0) {
    const oldIng = data.ingredients[index];
    data.ingredients[index] = { ...oldIng, ...ingredient };

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: 'Update Ingredient',
      itemAffected: ingredient.name,
      oldValue: `Stock: ${oldIng.currentStock} ${oldIng.unit}, Cost: ₱${oldIng.costPerUnit}`,
      newValue: `Stock: ${ingredient.currentStock} ${ingredient.unit}, Cost: ₱${ingredient.costPerUnit}`,
      reason: reason || 'Inventory master data update',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  } else {
    const newIng: Ingredient = {
      id: ingredient.id || `ing-${Date.now()}`,
      name: ingredient.name,
      category: ingredient.category || 'Pantry',
      currentStock: Number(ingredient.currentStock) || 0,
      unit: ingredient.unit || 'pcs',
      costPerUnit: Number(ingredient.costPerUnit) || 0,
      reorderLevel: Number(ingredient.reorderLevel) || 5,
      lastRestocked: new Date().toISOString(),
      supplierId: ingredient.supplierId,
    };
    data.ingredients.push(newIng);

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: 'Create Ingredient',
      itemAffected: newIng.name,
      oldValue: 'None',
      newValue: `Stock: ${newIng.currentStock} ${newIng.unit}`,
      reason: reason || 'New inventory item registration',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  }

  db.updateProductCosts();
  res.json({ success: true, ingredients: db.getData().ingredients });
});

// Manual Inventory Stock Adjustment (e.g. Spoilage, Physical Count) - REQUIRES OWNER APPROVAL
apiRouter.post('/inventory/adjust', (req: Request, res: Response) => {
  const { ingredientId, newQuantity, reason, ownerPin, operatorRole, operatorName, operatorId } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required for manual inventory adjustments.' });
  }

  const ing = db.getData().ingredients.find((i) => i.id === ingredientId);
  if (!ing) return res.status(404).json({ error: 'Ingredient not found.' });

  const oldStock = ing.currentStock;
  ing.currentStock = Number(newQuantity);

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: operatorRole,
    action: 'Inventory Adjustment',
    itemAffected: ing.name,
    oldValue: `${oldStock} ${ing.unit}`,
    newValue: `${ing.currentStock} ${ing.unit}`,
    reason: reason || 'Physical inventory audit / spoilage',
    approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
    approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, ingredients: db.getData().ingredients });
});

// ----------------------------------------------------
// PURCHASES / STOCK IN
// ----------------------------------------------------
apiRouter.get('/purchases', (req: Request, res: Response) => {
  res.json({ purchases: db.getData().purchases, suppliers: db.getData().suppliers });
});

apiRouter.post('/purchases', (req: Request, res: Response) => {
  const { purchase, operatorName, operatorId } = req.body;

  const data = db.getData();
  const ing = data.ingredients.find((i) => i.id === purchase.ingredientId);
  if (!ing) return res.status(404).json({ error: 'Ingredient not found.' });

  const addedQty = Number(purchase.quantity);
  const unitCost = Number(purchase.unitCost);
  const totalCost = Number(purchase.totalCost) || addedQty * unitCost;

  const newPurchase: Purchase = {
    id: `pur-${Date.now()}`,
    date: purchase.date || new Date().toISOString(),
    supplierId: purchase.supplierId || 'sup-1',
    supplierName: purchase.supplierName || 'Direct Supplier',
    ingredientId: ing.id,
    ingredientName: ing.name,
    quantity: addedQty,
    unit: ing.unit,
    unitCost: unitCost,
    totalCost: totalCost,
    invoiceNumber: purchase.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    receivedBy: operatorId,
    receivedByName: operatorName,
  };

  data.purchases.unshift(newPurchase);

  // Increase stock and update cost per unit if provided
  const oldStock = ing.currentStock;
  ing.currentStock = Math.round((ing.currentStock + addedQty) * 1000) / 1000;
  if (unitCost > 0) {
    ing.costPerUnit = unitCost;
  }
  ing.lastRestocked = new Date().toISOString();

  // Also log expense for ingredients
  const newExpense: Expense = {
    id: `exp-pur-${Date.now()}`,
    date: newPurchase.date.split('T')[0],
    category: 'Ingredients',
    description: `Stock Purchase: ${addedQty} ${ing.unit} ${ing.name} (${newPurchase.supplierName})`,
    amount: totalCost,
    addedBy: operatorId,
    addedByName: operatorName,
    receiptNumber: newPurchase.invoiceNumber,
  };
  data.expenses.unshift(newExpense);

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: 'CASHIER',
    action: 'Stock Receiving',
    itemAffected: ing.name,
    oldValue: `${oldStock} ${ing.unit}`,
    newValue: `${ing.currentStock} ${ing.unit} (+${addedQty} ${ing.unit})`,
    reason: `Purchased: ${newPurchase.invoiceNumber} (₱${totalCost})`,
    approvalStatus: 'STAFF_ACTION',
    authorizationMethod: 'PIN',
  });

  db.updateProductCosts();
  res.json({ success: true, purchases: data.purchases, ingredients: data.ingredients });
});

// ----------------------------------------------------
// EXPENSES
// ----------------------------------------------------
apiRouter.get('/expenses', (req: Request, res: Response) => {
  res.json({ expenses: db.getData().expenses });
});

apiRouter.post('/expenses', (req: Request, res: Response) => {
  const { expense, operatorName, operatorId, operatorRole, ownerPin } = req.body;
  const isOwner = operatorRole === 'OWNER';

  const data = db.getData();
  const index = data.expenses.findIndex((e) => e.id === expense.id);

  if (index >= 0) {
    // Edit existing expense requires owner approval
    if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
      return res.status(403).json({ error: 'Owner authorization required to edit expense records.' });
    }
    const oldExp = data.expenses[index];
    data.expenses[index] = { ...oldExp, ...expense };

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: 'Edit Expense',
      itemAffected: expense.description,
      oldValue: `₱${oldExp.amount} (${oldExp.category})`,
      newValue: `₱${expense.amount} (${expense.category})`,
      reason: 'Expense record update',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
      approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
      authorizationMethod: 'PIN',
    });
  } else {
    const newExpense: Expense = {
      id: expense.id || `exp-${Date.now()}`,
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || 'Miscellaneous',
      description: expense.description,
      amount: Number(expense.amount),
      addedBy: operatorId,
      addedByName: operatorName,
      receiptNumber: expense.receiptNumber,
      approvedBy: isOwner ? operatorName : undefined,
    };
    data.expenses.unshift(newExpense);

    db.logAudit({
      userId: operatorId,
      userName: operatorName,
      userRole: operatorRole,
      action: 'Add Expense',
      itemAffected: `${newExpense.category}: ${newExpense.description}`,
      oldValue: 'None',
      newValue: `₱${newExpense.amount}`,
      reason: 'Operating expense entry',
      approvalStatus: isOwner ? 'DIRECT_OWNER' : 'STAFF_ACTION',
      authorizationMethod: 'DIRECT_SESSION',
    });
  }

  db.persist();
  res.json({ success: true, expenses: data.expenses });
});

// Delete expense requires owner authorization
apiRouter.delete('/expenses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { ownerPin, operatorRole, operatorName, operatorId, reason } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner authorization required to delete expense.' });
  }

  const data = db.getData();
  const exp = data.expenses.find((e) => e.id === id);
  if (!exp) return res.status(404).json({ error: 'Expense not found.' });

  data.expenses = data.expenses.filter((e) => e.id !== id);

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: operatorRole,
    action: 'Delete Expense',
    itemAffected: exp.description,
    oldValue: `₱${exp.amount} (${exp.category})`,
    newValue: 'Deleted from ledger',
    reason: reason || 'Expense record deletion',
    approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
    approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, expenses: data.expenses });
});

// ----------------------------------------------------
// POS SALES & CHECKOUT
// ----------------------------------------------------
apiRouter.get('/sales', (req: Request, res: Response) => {
  res.json({ sales: db.getData().sales });
});

apiRouter.post('/sales/checkout', (req: Request, res: Response) => {
  const { sale } = req.body;
  const data = db.getData();

  const receiptCount = data.sales.length + 1001;
  const receiptNumber = `RCP-${new Date().getFullYear()}-${receiptCount}`;

  // Calculate COGS from product costs
  let totalCost = 0;
  sale.items.forEach((item: any) => {
    const prod = data.products.find((p) => p.id === item.productId);
    const itemCost = prod ? prod.cost : 0;
    totalCost += itemCost * item.quantity;
  });

  const netProfit = Math.round((sale.total - totalCost) * 100) / 100;

  const newSale: Sale = {
    id: `sal-${Date.now()}`,
    receiptNumber,
    shiftId: sale.shiftId,
    cashierId: sale.cashierId,
    cashierName: sale.cashierName,
    orderType: sale.orderType || 'DINE_IN',
    deliveryFee: Number(sale.deliveryFee) || 0,
    deliveryPlatform: sale.deliveryPlatform,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    deliveryAddress: sale.deliveryAddress,
    items: sale.items,
    subtotal: Number(sale.subtotal),
    discountType: sale.discountType || 'NONE',
    discountAmount: Number(sale.discountAmount) || 0,
    discountPercentage: sale.discountPercentage,
    total: Number(sale.total),
    totalCost: Math.round(totalCost * 100) / 100,
    netProfit: netProfit,
    paymentMethod: sale.paymentMethod as PaymentMethod,
    amountTendered: Number(sale.amountTendered),
    change: Number(sale.change) || 0,
    paymentReference: sale.paymentReference,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  // Add sale
  data.sales.unshift(newSale);

  // Automatically deduct ingredient inventory
  db.deductIngredientsForSale(sale.items);

  // Update current shift sales
  if (sale.shiftId) {
    const shift = data.shifts.find((s) => s.id === sale.shiftId && s.status === 'OPEN');
    if (shift) {
      shift.totalSales += newSale.total;
      if (newSale.paymentMethod === 'Cash') {
        shift.cashSales += newSale.total;
        shift.expectedCash += newSale.total;
      } else if (newSale.paymentMethod === 'GCash') {
        shift.gcashSales += newSale.total;
      } else if (newSale.paymentMethod === 'Maya') {
        shift.mayaSales += newSale.total;
      } else {
        shift.bankSales += newSale.total;
      }
    }
  }

  db.logAudit({
    userId: sale.cashierId,
    userName: sale.cashierName,
    userRole: 'CASHIER',
    action: 'Completed Sale',
    itemAffected: receiptNumber,
    oldValue: 'Pending Order',
    newValue: `₱${newSale.total} (${newSale.paymentMethod})`,
    reason: `${sale.items.length} items ordered`,
    approvalStatus: 'STAFF_ACTION',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, sale: newSale, ingredients: data.ingredients });
});

// Void Transaction (Strictly requires Owner Authorization)
apiRouter.post('/sales/void', (req: Request, res: Response) => {
  const { saleId, reason, ownerPin, operatorRole, operatorName, operatorId } = req.body;
  const isOwner = operatorRole === 'OWNER';

  if (!isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({ error: 'Owner Authorization PIN is strictly required to void a transaction.' });
  }

  const data = db.getData();
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) return res.status(404).json({ error: 'Transaction record not found.' });
  if (sale.status === 'VOIDED') return res.status(400).json({ error: 'Transaction is already voided.' });

  const oldTotal = sale.total;
  sale.status = 'VOIDED';
  sale.voidReason = reason || 'Customer cancellation';
  sale.voidedBy = operatorName;
  sale.voidedAt = new Date().toISOString();

  // Restore inventory items
  db.restoreIngredientsForSale(sale.items);

  // Deduct from open shift if same shift
  if (sale.shiftId) {
    const shift = data.shifts.find((s) => s.id === sale.shiftId && s.status === 'OPEN');
    if (shift) {
      shift.totalSales = Math.max(0, shift.totalSales - oldTotal);
      if (sale.paymentMethod === 'Cash') {
        shift.cashSales = Math.max(0, shift.cashSales - oldTotal);
        shift.expectedCash = Math.max(0, shift.expectedCash - oldTotal);
      } else if (sale.paymentMethod === 'GCash') {
        shift.gcashSales = Math.max(0, shift.gcashSales - oldTotal);
      } else if (sale.paymentMethod === 'Maya') {
        shift.mayaSales = Math.max(0, shift.mayaSales - oldTotal);
      } else {
        shift.bankSales = Math.max(0, shift.bankSales - oldTotal);
      }
    }
  }

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: operatorRole,
    action: 'Void Transaction',
    itemAffected: sale.receiptNumber,
    oldValue: `₱${oldTotal} (Completed)`,
    newValue: '₱0 (Voided)',
    reason: reason || 'Void transaction',
    approvalStatus: isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER',
    approvingOwner: isOwner ? operatorName : 'Authorized by PIN',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, sale, ingredients: data.ingredients, sales: data.sales });
});

// ----------------------------------------------------
// CASHIER SHIFTS & CASH DRAWER
// ----------------------------------------------------
apiRouter.get('/shifts/current', (req: Request, res: Response) => {
  const { cashierId } = req.query;
  const data = db.getData();
  const openShift = data.shifts.find(
    (s) => s.status === 'OPEN' && (!cashierId || s.cashierId === cashierId || s.cashierId === 'u-3')
  );
  res.json({ shift: openShift || null });
});

apiRouter.get('/shifts', (req: Request, res: Response) => {
  res.json({ shifts: db.getData().shifts });
});

// Open Shift
apiRouter.post('/shifts/open', (req: Request, res: Response) => {
  const { cashierId, cashierName, startingCash } = req.body;
  const data = db.getData();

  // Close any existing open shift for this cashier
  data.shifts.forEach((s) => {
    if (s.cashierId === cashierId && s.status === 'OPEN') {
      s.status = 'CLOSED';
      s.endTime = new Date().toISOString();
    }
  });

  const floatAmount = Number(startingCash) || 0;
  const newShift: Shift = {
    id: `sh-${Date.now()}`,
    cashierId,
    cashierName,
    startTime: new Date().toISOString(),
    startingCash: floatAmount,
    cashSales: 0,
    gcashSales: 0,
    mayaSales: 0,
    bankSales: 0,
    totalSales: 0,
    expectedCash: floatAmount,
    status: 'OPEN',
  };

  data.shifts.unshift(newShift);

  db.logAudit({
    userId: cashierId,
    userName: cashierName,
    userRole: 'CASHIER',
    action: 'Open Shift',
    itemAffected: 'Cash Drawer Float',
    oldValue: '₱0',
    newValue: `Starting Float: ₱${floatAmount}`,
    reason: 'Shift opening',
    approvalStatus: 'STAFF_ACTION',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, shift: newShift });
});

// Close Shift
apiRouter.post('/shifts/close', (req: Request, res: Response) => {
  const { shiftId, actualCash, notes, ownerPin, operatorRole, operatorName, operatorId } = req.body;
  const data = db.getData();
  const shift = data.shifts.find((s) => s.id === shiftId);

  if (!shift) return res.status(404).json({ error: 'Shift not found.' });

  const countedCash = Number(actualCash);
  const discrepancy = countedCash - shift.expectedCash;

  // If significant discrepancy (> ₱100 difference), require owner PIN
  const hasSignificantDiscrepancy = Math.abs(discrepancy) > 100;
  const isOwner = operatorRole === 'OWNER';

  if (hasSignificantDiscrepancy && !isOwner && !db.verifyOwnerPin(ownerPin)) {
    return res.status(403).json({
      error: `Shift has a cash discrepancy of ₱${Math.abs(discrepancy).toFixed(2)} (${discrepancy < 0 ? 'Shortage' : 'Overage'}). Owner authorization PIN is required to close this shift.`,
      requiresOwnerApproval: true,
      discrepancy,
    });
  }

  shift.status = 'CLOSED';
  shift.endTime = new Date().toISOString();
  shift.actualCash = countedCash;
  shift.discrepancy = discrepancy;
  shift.notes = notes;
  if (hasSignificantDiscrepancy) {
    shift.discrepancyApprovedBy = isOwner ? operatorName : 'Authorized by Owner PIN';
  }

  db.logAudit({
    userId: operatorId,
    userName: operatorName,
    userRole: operatorRole,
    action: 'Close Shift',
    itemAffected: `Shift #${shift.id}`,
    oldValue: `Expected Cash: ₱${shift.expectedCash}`,
    newValue: `Counted: ₱${countedCash} (Diff: ${discrepancy >= 0 ? '+' : ''}₱${discrepancy})`,
    reason: notes || (discrepancy !== 0 ? `Cash discrepancy noted` : 'Normal shift closing'),
    approvalStatus: hasSignificantDiscrepancy ? (isOwner ? 'DIRECT_OWNER' : 'APPROVED_BY_OWNER') : 'STAFF_ACTION',
    approvingOwner: hasSignificantDiscrepancy ? (isOwner ? operatorName : 'Authorized by PIN') : undefined,
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, shift });
});

// ----------------------------------------------------
// OWNER APPROVAL REQUEST SYSTEM
// ----------------------------------------------------
apiRouter.get('/approvals', (req: Request, res: Response) => {
  res.json({ approvalRequests: db.getData().approvalRequests });
});

// Staff submits a request for owner approval
apiRouter.post('/approvals/request', (req: Request, res: Response) => {
  const { action, actionTitle, requestedBy, requestedByName, requestedByRole, itemAffected, targetId, oldValue, newValue, reason, payload } =
    req.body;

  const newRequest: ApprovalRequest = {
    id: `appr-${Date.now()}`,
    action: action as ActionType,
    actionTitle: actionTitle || action,
    requestedBy,
    requestedByName,
    requestedByRole: requestedByRole || 'CASHIER',
    itemAffected,
    targetId,
    oldValue: String(oldValue),
    newValue: String(newValue),
    reason: reason || 'Staff requested authorization',
    payload: payload || {},
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  db.getData().approvalRequests.unshift(newRequest);

  db.logAudit({
    userId: requestedBy,
    userName: requestedByName,
    userRole: requestedByRole,
    action: `Submitted Approval Request: ${newRequest.actionTitle}`,
    itemAffected: itemAffected,
    oldValue: String(oldValue),
    newValue: String(newValue),
    reason: reason || 'Staff submitted request for owner review',
    approvalStatus: 'STAFF_ACTION',
    authorizationMethod: 'PIN',
  });

  db.persist();
  res.json({ success: true, request: newRequest });
});

// Owner resolves (Approves or Rejects) request with PIN
apiRouter.post('/approvals/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, ownerPin, ownerId, ownerName, rejectionReason } = req.body;

  if (!db.verifyOwnerPin(ownerPin)) {
    return res.status(401).json({ error: 'Invalid Owner Authorization PIN.' });
  }

  const data = db.getData();
  const request = data.approvalRequests.find((r) => r.id === id);
  if (!request) return res.status(404).json({ error: 'Approval request not found.' });

  if (decision === 'APPROVED') {
    request.status = 'APPROVED';
    request.approvedBy = ownerId || 'u-1';
    request.approvedByName = ownerName || 'Carlo Mendoza';
    request.resolvedAt = new Date().toISOString();

    // Execute requested payload actions automatically
    if (request.action === 'PRICE_CHANGE' && request.payload?.productId) {
      const prod = data.products.find((p) => p.id === request.payload.productId);
      if (prod) {
        prod.sellingPrice = Number(request.payload.newPrice);
        db.updateProductCosts();
      }
    } else if (request.action === 'VOID_TRANSACTION' && request.payload?.saleId) {
      const sale = data.sales.find((s) => s.id === request.payload.saleId);
      if (sale && sale.status !== 'VOIDED') {
        sale.status = 'VOIDED';
        sale.voidReason = request.reason;
        sale.voidedBy = request.requestedByName;
        sale.voidedAt = new Date().toISOString();
        db.restoreIngredientsForSale(sale.items);
      }
    } else if (request.action === 'INVENTORY_ADJUSTMENT' && request.payload?.ingredientId) {
      const ing = data.ingredients.find((i) => i.id === request.payload.ingredientId);
      if (ing) {
        ing.currentStock = Number(request.payload.newQuantity);
      }
    }

    db.logAudit({
      userId: request.requestedBy,
      userName: request.requestedByName,
      userRole: request.requestedByRole,
      action: `Approved: ${request.actionTitle}`,
      itemAffected: request.itemAffected,
      oldValue: request.oldValue,
      newValue: request.newValue,
      reason: request.reason,
      approvalStatus: 'APPROVED_BY_OWNER',
      approvingOwner: request.approvedByName,
      authorizationMethod: 'PIN',
    });
  } else {
    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason || 'Declined by Owner';
    request.resolvedAt = new Date().toISOString();

    db.logAudit({
      userId: request.requestedBy,
      userName: request.requestedByName,
      userRole: request.requestedByRole,
      action: `Rejected: ${request.actionTitle}`,
      itemAffected: request.itemAffected,
      oldValue: request.oldValue,
      newValue: 'Request Rejected',
      reason: rejectionReason || 'Owner declined request',
      approvalStatus: 'REJECTED',
      approvingOwner: ownerName || 'Carlo Mendoza',
      authorizationMethod: 'PIN',
    });
  }

  db.persist();
  res.json({ success: true, request, approvalRequests: data.approvalRequests });
});

// ----------------------------------------------------
// AUDIT LOGS (Immutable permanent records)
// ----------------------------------------------------
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  res.json({ auditLogs: db.getData().auditLogs });
});

// ----------------------------------------------------
// REPORTS & ANALYTICS DASHBOARD
// ----------------------------------------------------
apiRouter.get('/reports/summary', (req: Request, res: Response) => {
  const data = db.getData();
  const sales = data.sales.filter((s) => s.status === 'COMPLETED');
  const expenses = data.expenses;

  // Today's summary
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));

  const todayGross = todaySales.reduce((acc, s) => acc + s.subtotal, 0);
  const todayDiscounts = todaySales.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
  const todayNetSales = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todayCOGS = todaySales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const todayGrossProfit = todayNetSales - todayCOGS;
  const todayExpenseTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpenseTotal;

  // Payment Breakdown
  const paymentBreakdown = {
    Cash: todaySales.filter((s) => s.paymentMethod === 'Cash').reduce((acc, s) => acc + s.total, 0),
    GCash: todaySales.filter((s) => s.paymentMethod === 'GCash').reduce((acc, s) => acc + s.total, 0),
    Maya: todaySales.filter((s) => s.paymentMethod === 'Maya').reduce((acc, s) => acc + s.total, 0),
    'Bank Transfer': todaySales.filter((s) => s.paymentMethod === 'Bank Transfer').reduce((acc, s) => acc + s.total, 0),
  };

  // Best sellers aggregation
  const productCountMap: { [prodId: string]: { name: string; quantity: number; revenue: number } } = {};
  sales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productCountMap[item.productId]) {
        productCountMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productCountMap[item.productId].quantity += item.quantity;
      productCountMap[item.productId].revenue += item.itemTotal;
    });
  });

  const bestSellers = Object.values(productCountMap).sort((a, b) => b.quantity - a.quantity);

  // Low stock alert items
  const lowStockItems = data.ingredients.filter((i) => i.currentStock <= i.reorderLevel);

  // Pending approval count
  const pendingApprovalsCount = data.approvalRequests.filter((r) => r.status === 'PENDING').length;

  res.json({
    summary: {
      todayGross,
      todayDiscounts,
      todayNetSales,
      todayOrdersCount: todaySales.length,
      todayAvgOrderValue: todaySales.length > 0 ? Math.round((todayNetSales / todaySales.length) * 100) / 100 : 0,
      todayCOGS,
      todayGrossProfit,
      todayExpenseTotal,
      todayNetProfit,
      paymentBreakdown,
      bestSellers,
      lowStockItems,
      pendingApprovalsCount,
    },
  });
});
