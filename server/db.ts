import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cafe_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Password/PIN hashing with SHA-256 and constant salt
export function hashSecret(secret: string): string {
  const salt = 'cafe_pos_secure_salt_2026';
  return crypto.createHash('sha256').update(secret + salt).digest('hex');
}

interface StoredUser extends User {
  pinHash: string;
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  ownerPinHash: string; // The owner authorization PIN hash (default: 123456)
  settings: CafeSettings;
  ingredients: Ingredient[];
  products: Product[];
  sales: Sale[];
  shifts: Shift[];
  expenses: Expense[];
  purchases: Purchase[];
  suppliers: Supplier[];
  approvalRequests: ApprovalRequest[];
  auditLogs: AuditLog[];
}

// Seed initial realistic Café data
function createSeedData(): DatabaseSchema {
  const defaultOwnerPin = '123456';
  const ownerPinHash = hashSecret(defaultOwnerPin);

  const users: StoredUser[] = [
    {
      id: 'u-1',
      name: 'Carlo Mendoza',
      username: 'owner',
      role: 'OWNER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: '2026-01-01T08:00:00.000Z',
      pinHash: ownerPinHash,
      passwordHash: hashSecret('owner123'),
    },
    {
      id: 'u-2',
      name: 'Elena Santos',
      username: 'manager',
      role: 'MANAGER',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: '2026-01-15T08:00:00.000Z',
      pinHash: hashSecret('222222'),
      passwordHash: hashSecret('manager123'),
    },
    {
      id: 'u-3',
      name: 'Maria Cruz',
      username: 'maria',
      role: 'CASHIER',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: '2026-02-01T08:00:00.000Z',
      pinHash: hashSecret('333333'),
      passwordHash: hashSecret('cashier123'),
    },
    {
      id: 'u-4',
      name: 'John Reyes',
      username: 'john',
      role: 'CASHIER',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      active: true,
      createdAt: '2026-02-10T08:00:00.000Z',
      pinHash: hashSecret('444444'),
      passwordHash: hashSecret('cashier123'),
    },
  ];

  const settings: CafeSettings = {
    cafeName: 'Kapihan Artisanal Café',
    branchName: 'Main Branch - Quezon City',
    address: '124 Kalayaan Avenue, Diliman, Quezon City, Metro Manila',
    contactNumber: '+63 (02) 8920-4567 / 0917-889-CAFE',
    taxIdentificationNumber: 'TIN: 248-912-304-000',
    receiptHeader: 'Welcome to Kapihan Artisanal Café!\nHandcrafted with Local Benguet & Bukidnon Beans',
    receiptFooter: 'Maraming Salamat! Please come again.\nFollow us on IG & FB: @kapihancafe',
    currencySymbol: '₱',
    maxStaffDiscountPercent: 10,
    lowStockThresholdNotification: true,
  };

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Highland Beans Trading Co.',
      contactPerson: 'Benjie Ramos',
      phone: '0917-123-4567',
      email: 'sales@highlandbeans.ph',
      suppliedItems: ['Benguet Arabica Beans', 'Robusta Blend'],
    },
    {
      id: 'sup-2',
      name: 'Dairy Gold Farms',
      contactPerson: 'Grace Flores',
      phone: '0918-987-6543',
      email: 'orders@dairygold.com.ph',
      suppliedItems: ['Fresh Whole Milk', 'Oat Milk', 'Butter', 'Cheddar Cheese'],
    },
    {
      id: 'sup-3',
      name: 'Barista Flavors PH Inc.',
      contactPerson: 'Marco Gomez',
      phone: '0922-456-7890',
      email: 'marco@baristaflavors.ph',
      suppliedItems: ['Hazelnut Syrup', 'Caramel Syrup', 'Vanilla Syrup', 'Dark Chocolate Sauce'],
    },
    {
      id: 'sup-4',
      name: 'EcoPack Packaging Supplies',
      contactPerson: 'Jenny Lim',
      phone: '0915-333-2211',
      email: 'jenny@ecopack.ph',
      suppliedItems: ['16oz Cold Cups', '16oz Hot Paper Cups', 'Cup Lids', 'Kraft Paper Bags', 'Biodegradable Straws'],
    },
  ];

  const ingredients: Ingredient[] = [
    {
      id: 'ing-1',
      name: 'Arabica Coffee Beans',
      category: 'Coffee',
      currentStock: 4.2, // 4.2 kg left
      unit: 'kg',
      costPerUnit: 850, // ₱850 per kg
      reorderLevel: 2.0, // Reorder at 2 kg
      lastRestocked: '2026-08-15T10:00:00.000Z',
      supplierId: 'sup-1',
    },
    {
      id: 'ing-2',
      name: 'Fresh Whole Milk',
      category: 'Dairy',
      currentStock: 6.5, // 6.5 L left
      unit: 'L',
      costPerUnit: 90, // ₱90 per L
      reorderLevel: 8.0, // Alert! (6.5 < 8)
      lastRestocked: '2026-08-18T09:30:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-3',
      name: 'Oat Milk (Barista Edition)',
      category: 'Dairy Alternative',
      currentStock: 4.0,
      unit: 'L',
      costPerUnit: 180,
      reorderLevel: 3.0,
      lastRestocked: '2026-08-16T14:00:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-4',
      name: 'Hazelnut Syrup',
      category: 'Syrups',
      currentStock: 1.8, // 1.8 bottles
      unit: 'bottle', // 750ml bottle
      costPerUnit: 420,
      reorderLevel: 1.0,
      lastRestocked: '2026-08-10T11:00:00.000Z',
      supplierId: 'sup-3',
    },
    {
      id: 'ing-5',
      name: 'Salted Caramel Syrup',
      category: 'Syrups',
      currentStock: 0.8, // Low stock alert!
      unit: 'bottle',
      costPerUnit: 440,
      reorderLevel: 1.0,
      lastRestocked: '2026-08-10T11:00:00.000Z',
      supplierId: 'sup-3',
    },
    {
      id: 'ing-6',
      name: 'Dark Chocolate Sauce',
      category: 'Sauces',
      currentStock: 2.5,
      unit: 'bottle',
      costPerUnit: 480,
      reorderLevel: 1.0,
      lastRestocked: '2026-08-12T10:00:00.000Z',
      supplierId: 'sup-3',
    },
    {
      id: 'ing-7',
      name: 'Matcha Powder (Ceremonial)',
      category: 'Powders',
      currentStock: 0.9,
      unit: 'kg',
      costPerUnit: 1400,
      reorderLevel: 0.5,
      lastRestocked: '2026-08-05T09:00:00.000Z',
      supplierId: 'sup-3',
    },
    {
      id: 'ing-8',
      name: '16oz Cold Drink Cups',
      category: 'Packaging',
      currentStock: 180, // pcs
      unit: 'pcs',
      costPerUnit: 3.5,
      reorderLevel: 100,
      lastRestocked: '2026-08-14T11:00:00.000Z',
      supplierId: 'sup-4',
    },
    {
      id: 'ing-9',
      name: '16oz Hot Paper Cups',
      category: 'Packaging',
      currentStock: 220,
      unit: 'pcs',
      costPerUnit: 4.0,
      reorderLevel: 80,
      lastRestocked: '2026-08-14T11:00:00.000Z',
      supplierId: 'sup-4',
    },
    {
      id: 'ing-10',
      name: 'Dome Lids & Flat Lids',
      category: 'Packaging',
      currentStock: 350,
      unit: 'pcs',
      costPerUnit: 1.2,
      reorderLevel: 100,
      lastRestocked: '2026-08-14T11:00:00.000Z',
      supplierId: 'sup-4',
    },
    {
      id: 'ing-11',
      name: 'Paper Straws',
      category: 'Packaging',
      currentStock: 400,
      unit: 'pcs',
      costPerUnit: 0.5,
      reorderLevel: 150,
      lastRestocked: '2026-08-14T11:00:00.000Z',
      supplierId: 'sup-4',
    },
    {
      id: 'ing-12',
      name: 'Belgian Waffle Batter Mix',
      category: 'Bakery',
      currentStock: 8.5,
      unit: 'kg',
      costPerUnit: 160,
      reorderLevel: 4.0,
      lastRestocked: '2026-08-17T13:00:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-13',
      name: 'Beef Burger Patties (120g)',
      category: 'Meat',
      currentStock: 34,
      unit: 'pcs',
      costPerUnit: 32,
      reorderLevel: 15,
      lastRestocked: '2026-08-18T10:00:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-14',
      name: 'Cheddar Cheese Slices',
      category: 'Dairy',
      currentStock: 65,
      unit: 'pcs',
      costPerUnit: 7.5,
      reorderLevel: 25,
      lastRestocked: '2026-08-18T10:00:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-15',
      name: 'Jasmine Rice',
      category: 'Grains',
      currentStock: 18.0,
      unit: 'kg',
      costPerUnit: 52,
      reorderLevel: 10.0,
      lastRestocked: '2026-08-15T15:00:00.000Z',
      supplierId: 'sup-1',
    },
    {
      id: 'ing-16',
      name: 'Marinated Pork Tocino / Tapa',
      category: 'Meat',
      currentStock: 6.2,
      unit: 'kg',
      costPerUnit: 320,
      reorderLevel: 3.0,
      lastRestocked: '2026-08-17T11:00:00.000Z',
      supplierId: 'sup-2',
    },
    {
      id: 'ing-17',
      name: 'Fresh Eggs',
      category: 'Poultry',
      currentStock: 72,
      unit: 'pcs',
      costPerUnit: 8.5,
      reorderLevel: 30,
      lastRestocked: '2026-08-18T10:00:00.000Z',
      supplierId: 'sup-2',
    },
  ];

  // Helper to compute cost of recipe
  function computeRecipeCost(recipe: { ingredientId: string; amount: number; unit: string }[]): number {
    let totalCost = 0;
    for (const r of recipe) {
      const ing = ingredients.find((i) => i.id === r.ingredientId);
      if (!ing) continue;
      // Unit conversions
      if (ing.unit === 'kg' && r.unit === 'g') {
        totalCost += (r.amount / 1000) * ing.costPerUnit;
      } else if (ing.unit === 'kg' && r.unit === 'kg') {
        totalCost += r.amount * ing.costPerUnit;
      } else if (ing.unit === 'L' && r.unit === 'ml') {
        totalCost += (r.amount / 1000) * ing.costPerUnit;
      } else if (ing.unit === 'L' && r.unit === 'L') {
        totalCost += r.amount * ing.costPerUnit;
      } else if (ing.unit === 'bottle' && r.unit === 'ml') {
        // assume 750ml per bottle
        totalCost += (r.amount / 750) * ing.costPerUnit;
      } else if (ing.unit === 'pcs') {
        totalCost += r.amount * ing.costPerUnit;
      } else {
        totalCost += r.amount * ing.costPerUnit;
      }
    }
    return Math.round(totalCost * 100) / 100;
  }

  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'Iced Latte',
      category: 'Coffee',
      sellingPrice: 90,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
      description: 'Espresso poured over chilled fresh milk and ice.',
      recipe: [
        { ingredientId: 'ing-1', amount: 18, unit: 'g' }, // 18g beans = ₱15.30
        { ingredientId: 'ing-2', amount: 150, unit: 'ml' }, // 150ml milk = ₱13.50
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' }, // cup = ₱3.50
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' }, // lid = ₱1.20
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' }, // straw = ₱0.50
      ],
      modifierGroups: [
        {
          id: 'mod-sugar',
          name: 'Sweetness',
          required: false,
          options: [
            { id: 'sw-100', name: '100% Sugar', priceDelta: 0 },
            { id: 'sw-50', name: '50% Sugar', priceDelta: 0 },
            { id: 'sw-25', name: '25% Sugar', priceDelta: 0 },
            { id: 'sw-0', name: '0% Sugar (No Sugar)', priceDelta: 0 },
          ],
        },
        {
          id: 'mod-milk',
          name: 'Milk Choice',
          required: false,
          options: [
            { id: 'milk-whole', name: 'Fresh Whole Milk', priceDelta: 0 },
            { id: 'milk-oat', name: 'Sub Oat Milk', priceDelta: 30 },
          ],
        },
        {
          id: 'mod-shot',
          name: 'Add-ons',
          required: false,
          options: [{ id: 'add-shot', name: 'Extra Espresso Shot', priceDelta: 25 }],
        },
      ],
    },
    {
      id: 'prod-2',
      name: 'Iced Hazelnut Latte',
      category: 'Coffee',
      sellingPrice: 95,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=500&auto=format&fit=crop&q=80',
      description: 'Rich espresso, fresh milk, and French hazelnut syrup.',
      recipe: [
        { ingredientId: 'ing-1', amount: 18, unit: 'g' },
        { ingredientId: 'ing-2', amount: 140, unit: 'ml' },
        { ingredientId: 'ing-4', amount: 20, unit: 'ml' }, // ₱11.20
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' },
      ],
      modifierGroups: [
        {
          id: 'mod-milk',
          name: 'Milk Choice',
          required: false,
          options: [
            { id: 'milk-whole', name: 'Fresh Whole Milk', priceDelta: 0 },
            { id: 'milk-oat', name: 'Sub Oat Milk', priceDelta: 30 },
          ],
        },
      ],
    },
    {
      id: 'prod-3',
      name: 'Iced Americano',
      category: 'Coffee',
      sellingPrice: 80,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      description: 'Double shot Benguet arabica espresso over pure cold water and ice.',
      recipe: [
        { ingredientId: 'ing-1', amount: 18, unit: 'g' },
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' },
      ],
    },
    {
      id: 'prod-4',
      name: 'Iced Salted Caramel Macchiato',
      category: 'Coffee',
      sellingPrice: 110,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=80',
      description: 'Vanilla milk marked with espresso and drizzled with salted caramel.',
      recipe: [
        { ingredientId: 'ing-1', amount: 18, unit: 'g' },
        { ingredientId: 'ing-2', amount: 140, unit: 'ml' },
        { ingredientId: 'ing-5', amount: 25, unit: 'ml' },
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' },
      ],
    },
    {
      id: 'prod-5',
      name: 'Iced Matcha Latte',
      category: 'Non-Coffee',
      sellingPrice: 120,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
      description: 'Pure ceremonial grade Japanese Uji matcha whisked with fresh milk.',
      recipe: [
        { ingredientId: 'ing-7', amount: 8, unit: 'g' }, // ₱11.20
        { ingredientId: 'ing-2', amount: 160, unit: 'ml' },
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' },
      ],
    },
    {
      id: 'prod-6',
      name: 'Signature Dark Chocolate',
      category: 'Non-Coffee',
      sellingPrice: 100,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=80',
      description: 'Decadent Davao cacao sauce steamed with fresh creamy milk.',
      recipe: [
        { ingredientId: 'ing-6', amount: 35, unit: 'ml' },
        { ingredientId: 'ing-2', amount: 160, unit: 'ml' },
        { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-10', amount: 1, unit: 'pcs' },
        { ingredientId: 'ing-11', amount: 1, unit: 'pcs' },
      ],
    },
    {
      id: 'prod-7',
      name: 'Waffle Burger Supreme',
      category: 'Waffles',
      sellingPrice: 120,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      description: 'Crisp golden Belgian waffles sandwiching a juicy 120g beef patty & melted cheddar.',
      recipe: [
        { ingredientId: 'ing-12', amount: 100, unit: 'g' }, // ₱16.00
        { ingredientId: 'ing-13', amount: 1, unit: 'pcs' }, // ₱32.00
        { ingredientId: 'ing-14', amount: 1, unit: 'pcs' }, // ₱7.50
        { ingredientId: 'ing-17', amount: 1, unit: 'pcs' }, // ₱8.50
      ],
    },
    {
      id: 'prod-8',
      name: 'Classic Golden Belgian Waffle',
      category: 'Waffles',
      sellingPrice: 85,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=500&auto=format&fit=crop&q=80',
      description: 'Crispy outer edge, fluffy inside with butter and maple drizzle.',
      recipe: [{ ingredientId: 'ing-12', amount: 120, unit: 'g' }],
    },
    {
      id: 'prod-9',
      name: 'Grilled Ham & Three Cheese',
      category: 'Sandwiches',
      sellingPrice: 110,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      description: 'Toasted sourdough stuffed with savory smoked ham and melted cheddar.',
      recipe: [
        { ingredientId: 'ing-14', amount: 2, unit: 'pcs' },
        { ingredientId: 'ing-17', amount: 1, unit: 'pcs' },
      ],
    },
    {
      id: 'prod-10',
      name: 'Pork Tocilog Special',
      category: 'Rice Meals',
      sellingPrice: 140,
      cost: 0,
      profit: 0,
      profitMargin: 0,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
      description: 'Sweet savory cured pork tocino, garlic sinangag rice, and sunny-side egg.',
      recipe: [
        { ingredientId: 'ing-16', amount: 150, unit: 'g' }, // ₱48.00
        { ingredientId: 'ing-15', amount: 180, unit: 'g' }, // ₱9.36
        { ingredientId: 'ing-17', amount: 1, unit: 'pcs' }, // ₱8.50
      ],
    },
    {
      id: 'prod-11',
      name: 'Truffle Fries Basket',
      category: 'Snacks',
      sellingPrice: 95,
      cost: 32,
      profit: 63,
      profitMargin: 66.3,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
      description: 'Shoestring french fries tossed with real white truffle oil and parmesan.',
      recipe: [],
    },
    {
      id: 'prod-12',
      name: 'Basque Burnt Cheesecake Slice',
      category: 'Desserts',
      sellingPrice: 135,
      cost: 45,
      profit: 90,
      profitMargin: 66.7,
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop&q=80',
      description: 'Silky smooth cream cheese center with caramelized top crust.',
      recipe: [],
    },
  ];

  // Recalculate costs and profit margins for all products based on recipes
  products.forEach((prod) => {
    if (prod.recipe && prod.recipe.length > 0) {
      prod.cost = computeRecipeCost(prod.recipe);
    }
    prod.profit = Math.round((prod.sellingPrice - prod.cost) * 100) / 100;
    prod.profitMargin = prod.sellingPrice > 0 ? Math.round(((prod.sellingPrice - prod.cost) / prod.sellingPrice) * 1000) / 10 : 0;
  });

  const shifts: Shift[] = [
    {
      id: 'sh-101',
      cashierId: 'u-3',
      cashierName: 'Maria Cruz',
      startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      startingCash: 2000,
      cashSales: 1380,
      gcashSales: 630,
      mayaSales: 310,
      bankSales: 0,
      totalSales: 2320,
      expectedCash: 3380,
      status: 'OPEN',
    },
  ];

  const sales: Sale[] = [
    {
      id: 'sal-1001',
      receiptNumber: 'RCP-2026-1001',
      shiftId: 'sh-101',
      cashierId: 'u-3',
      cashierName: 'Maria Cruz',
      items: [
        {
          productId: 'prod-1',
          productName: 'Iced Latte',
          category: 'Coffee',
          unitPrice: 90,
          quantity: 2,
          modifiers: [],
          itemTotal: 180,
        },
        {
          productId: 'prod-7',
          productName: 'Waffle Burger Supreme',
          category: 'Waffles',
          unitPrice: 120,
          quantity: 1,
          modifiers: [],
          itemTotal: 120,
        },
      ],
      subtotal: 300,
      discountType: 'NONE',
      discountAmount: 0,
      total: 300,
      totalCost: 128.4,
      netProfit: 171.6,
      paymentMethod: 'Cash',
      amountTendered: 500,
      change: 200,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'sal-1002',
      receiptNumber: 'RCP-2026-1002',
      shiftId: 'sh-101',
      cashierId: 'u-3',
      cashierName: 'Maria Cruz',
      items: [
        {
          productId: 'prod-2',
          productName: 'Iced Hazelnut Latte',
          category: 'Coffee',
          unitPrice: 95,
          quantity: 2,
          modifiers: [],
          itemTotal: 190,
        },
        {
          productId: 'prod-10',
          productName: 'Pork Tocilog Special',
          category: 'Rice Meals',
          unitPrice: 140,
          quantity: 1,
          modifiers: [],
          itemTotal: 140,
        },
      ],
      subtotal: 330,
      discountType: 'NONE',
      discountAmount: 0,
      total: 330,
      totalCost: 154.2,
      netProfit: 175.8,
      paymentMethod: 'GCash',
      amountTendered: 330,
      change: 0,
      paymentReference: 'GC-9821034',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
    },
    {
      id: 'sal-1003',
      receiptNumber: 'RCP-2026-1003',
      shiftId: 'sh-101',
      cashierId: 'u-3',
      cashierName: 'Maria Cruz',
      items: [
        {
          productId: 'prod-4',
          productName: 'Iced Salted Caramel Macchiato',
          category: 'Coffee',
          unitPrice: 110,
          quantity: 1,
          modifiers: [],
          itemTotal: 110,
        },
        {
          productId: 'prod-12',
          productName: 'Basque Burnt Cheesecake Slice',
          category: 'Desserts',
          unitPrice: 135,
          quantity: 1,
          modifiers: [],
          itemTotal: 135,
        },
      ],
      subtotal: 245,
      discountType: 'SENIOR_PWD',
      discountAmount: 49,
      discountPercentage: 20,
      total: 196,
      totalCost: 89.5,
      netProfit: 106.5,
      paymentMethod: 'Cash',
      amountTendered: 200,
      change: 4,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'sal-1004',
      receiptNumber: 'RCP-2026-1004',
      shiftId: 'sh-101',
      cashierId: 'u-3',
      cashierName: 'Maria Cruz',
      items: [
        {
          productId: 'prod-5',
          productName: 'Iced Matcha Latte',
          category: 'Non-Coffee',
          unitPrice: 120,
          quantity: 1,
          modifiers: [],
          itemTotal: 120,
        },
      ],
      subtotal: 120,
      discountAmount: 0,
      total: 120,
      totalCost: 34.2,
      netProfit: 85.8,
      paymentMethod: 'Maya',
      amountTendered: 120,
      change: 0,
      paymentReference: 'MY-1182390',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      date: '2026-08-18',
      category: 'Electricity',
      description: 'Meralco Electric Bill (Commercial Rate)',
      amount: 6850,
      addedBy: 'u-1',
      addedByName: 'Carlo Mendoza',
      approvedBy: 'Carlo Mendoza',
      receiptNumber: 'MER-889021',
    },
    {
      id: 'exp-2',
      date: '2026-08-19',
      category: 'Water',
      description: 'Manila Water Monthly Utility',
      amount: 1450,
      addedBy: 'u-1',
      addedByName: 'Carlo Mendoza',
      approvedBy: 'Carlo Mendoza',
    },
    {
      id: 'exp-3',
      date: '2026-08-19',
      category: 'LPG',
      description: 'Solane 11kg LPG Tank Refill',
      amount: 1120,
      addedBy: 'u-2',
      addedByName: 'Elena Santos',
      approvedBy: 'Carlo Mendoza',
    },
    {
      id: 'exp-4',
      date: '2026-08-19',
      category: 'Miscellaneous',
      description: 'Commercial Cleaning Detergent & Sanitizer',
      amount: 580,
      addedBy: 'u-3',
      addedByName: 'Maria Cruz',
      approvedBy: 'Carlo Mendoza',
    },
  ];

  const purchases: Purchase[] = [
    {
      id: 'pur-1',
      date: '2026-08-15T10:00:00.000Z',
      supplierId: 'sup-1',
      supplierName: 'Highland Beans Trading Co.',
      ingredientId: 'ing-1',
      ingredientName: 'Arabica Coffee Beans',
      quantity: 10,
      unit: 'kg',
      unitCost: 850,
      totalCost: 8500,
      invoiceNumber: 'INV-HB-4491',
      receivedBy: 'u-2',
      receivedByName: 'Elena Santos',
    },
    {
      id: 'pur-2',
      date: '2026-08-18T09:30:00.000Z',
      supplierId: 'sup-2',
      supplierName: 'Dairy Gold Farms',
      ingredientId: 'ing-2',
      ingredientName: 'Fresh Whole Milk',
      quantity: 20,
      unit: 'L',
      unitCost: 90,
      totalCost: 1800,
      invoiceNumber: 'INV-DG-1029',
      receivedBy: 'u-3',
      receivedByName: 'Maria Cruz',
    },
  ];

  const approvalRequests: ApprovalRequest[] = [
    {
      id: 'appr-101',
      action: 'PRICE_CHANGE',
      actionTitle: 'Change Product Price',
      requestedBy: 'u-3',
      requestedByName: 'Maria Cruz',
      requestedByRole: 'CASHIER',
      itemAffected: 'Iced Latte',
      targetId: 'prod-1',
      oldValue: '₱90',
      newValue: '₱100',
      reason: 'Owner instructed price increase for new blend batch',
      payload: { productId: 'prod-1', newPrice: 100 },
      status: 'PENDING',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'appr-102',
      action: 'VOID_TRANSACTION',
      actionTitle: 'Void Sale #1001',
      requestedBy: 'u-4',
      requestedByName: 'John Reyes',
      requestedByRole: 'CASHIER',
      itemAffected: 'Sale #1001',
      targetId: 'sal-1001',
      oldValue: '₱300 (Completed)',
      newValue: '₱0 (Voided)',
      reason: 'Customer mistakenly ordered hot instead of iced and asked for cash cancellation before preparation',
      payload: { saleId: 'sal-1001' },
      status: 'PENDING',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      timestamp: '2026-08-19T14:30:00.000Z',
      userId: 'u-1',
      userName: 'Carlo Mendoza',
      userRole: 'OWNER',
      action: 'System Initialization',
      itemAffected: 'POS Database',
      oldValue: 'None',
      newValue: 'Configured & Seeded',
      reason: 'Opening shift preparations',
      approvalStatus: 'DIRECT_OWNER',
      approvingOwner: 'Carlo Mendoza',
      authorizationMethod: 'DIRECT_SESSION',
    },
    {
      id: 'aud-2',
      timestamp: '2026-08-19T18:00:00.000Z',
      userId: 'u-3',
      userName: 'Maria Cruz',
      userRole: 'CASHIER',
      action: 'Open Shift',
      itemAffected: 'Drawer Cash Float',
      oldValue: '₱0',
      newValue: '₱2,000',
      reason: 'Morning Cashier Float',
      approvalStatus: 'STAFF_ACTION',
      authorizationMethod: 'PIN',
    },
  ];

  return {
    users,
    ownerPinHash,
    settings,
    ingredients,
    products,
    sales,
    shifts,
    expenses,
    purchases,
    suppliers,
    approvalRequests,
    auditLogs,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading DB file, re-seeding:', e);
    }
    const seeded = createSeedData();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing DB file:', e);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public persist() {
    this.saveData();
  }

  public verifyOwnerPin(pin: string): boolean {
    const hashed = hashSecret(pin);
    // Compare with ownerPinHash or any active owner user's pin
    if (hashed === this.data.ownerPinHash) return true;
    const owner = this.data.users.find((u) => u.role === 'OWNER' && u.active && u.pinHash === hashed);
    return !!owner;
  }

  public getPublicUsers(): User[] {
    return this.data.users.map(({ pinHash, passwordHash, ...user }) => user);
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(newLog);
    this.persist();
    return newLog;
  }

  // Recalculate recipe cost and profit margin for products
  public updateProductCosts() {
    for (const prod of this.data.products) {
      if (prod.recipe && prod.recipe.length > 0) {
        let totalCost = 0;
        for (const r of prod.recipe) {
          const ing = this.data.ingredients.find((i) => i.id === r.ingredientId);
          if (!ing) continue;
          if (ing.unit === 'kg' && r.unit === 'g') {
            totalCost += (r.amount / 1000) * ing.costPerUnit;
          } else if (ing.unit === 'kg' && r.unit === 'kg') {
            totalCost += r.amount * ing.costPerUnit;
          } else if (ing.unit === 'L' && r.unit === 'ml') {
            totalCost += (r.amount / 1000) * ing.costPerUnit;
          } else if (ing.unit === 'L' && r.unit === 'L') {
            totalCost += r.amount * ing.costPerUnit;
          } else if (ing.unit === 'bottle' && r.unit === 'ml') {
            totalCost += (r.amount / 750) * ing.costPerUnit;
          } else {
            totalCost += r.amount * ing.costPerUnit;
          }
        }
        prod.cost = Math.round(totalCost * 100) / 100;
        prod.profit = Math.round((prod.sellingPrice - prod.cost) * 100) / 100;
        prod.profitMargin =
          prod.sellingPrice > 0
            ? Math.round(((prod.sellingPrice - prod.cost) / prod.sellingPrice) * 1000) / 10
            : 0;
      }
    }
    this.persist();
  }

  // Atomic ingredient stock deduction when sales are made
  public deductIngredientsForSale(items: { productId: string; quantity: number }[]) {
    for (const item of items) {
      const prod = this.data.products.find((p) => p.id === item.productId);
      if (!prod || !prod.recipe) continue;
      for (const r of prod.recipe) {
        const ing = this.data.ingredients.find((i) => i.id === r.ingredientId);
        if (!ing) continue;
        const totalAmountUsed = r.amount * item.quantity;
        if (ing.unit === 'kg' && r.unit === 'g') {
          ing.currentStock = Math.max(0, Math.round((ing.currentStock - totalAmountUsed / 1000) * 1000) / 1000);
        } else if (ing.unit === 'L' && r.unit === 'ml') {
          ing.currentStock = Math.max(0, Math.round((ing.currentStock - totalAmountUsed / 1000) * 1000) / 1000);
        } else if (ing.unit === 'bottle' && r.unit === 'ml') {
          ing.currentStock = Math.max(0, Math.round((ing.currentStock - totalAmountUsed / 750) * 1000) / 1000);
        } else {
          ing.currentStock = Math.max(0, Math.round((ing.currentStock - totalAmountUsed) * 100) / 100);
        }
      }
    }
    this.persist();
  }

  // Restore ingredient stock when a sale is voided/refunded
  public restoreIngredientsForSale(items: { productId: string; quantity: number }[]) {
    for (const item of items) {
      const prod = this.data.products.find((p) => p.id === item.productId);
      if (!prod || !prod.recipe) continue;
      for (const r of prod.recipe) {
        const ing = this.data.ingredients.find((i) => i.id === r.ingredientId);
        if (!ing) continue;
        const totalAmountToRestore = r.amount * item.quantity;
        if (ing.unit === 'kg' && r.unit === 'g') {
          ing.currentStock = Math.round((ing.currentStock + totalAmountToRestore / 1000) * 1000) / 1000;
        } else if (ing.unit === 'L' && r.unit === 'ml') {
          ing.currentStock = Math.round((ing.currentStock + totalAmountToRestore / 1000) * 1000) / 1000;
        } else if (ing.unit === 'bottle' && r.unit === 'ml') {
          ing.currentStock = Math.round((ing.currentStock + totalAmountToRestore / 750) * 1000) / 1000;
        } else {
          ing.currentStock = Math.round((ing.currentStock + totalAmountToRestore) * 100) / 100;
        }
      }
    }
    this.persist();
  }
}

export const db = new Database();
