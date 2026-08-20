import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Coffee,
  Edit2,
  Lock,
  Percent,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { Product, RecipeItem } from '../../types.js';

interface ProductManagementProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({ onRequireOwnerAuth }) => {
  const { products, ingredients, currentUser, refreshProducts } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Coffee');
  const [sellingPrice, setSellingPrice] = useState<string>('90');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK'>('AVAILABLE');
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    'ALL',
    'Coffee',
    'Non-Coffee',
    'Waffles',
    'Sandwiches',
    'Rice Meals',
    'Snacks',
    'Desserts',
    'Add-ons',
  ];

  // Helper to compute cost of recipe dynamically in UI
  const calculateEstimatedCost = (currentRecipe: RecipeItem[]): number => {
    let total = 0;
    for (const r of currentRecipe) {
      const ing = ingredients.find((i) => i.id === r.ingredientId);
      if (!ing) continue;
      if (ing.unit === 'kg' && r.unit === 'g') {
        total += (r.amount / 1000) * ing.costPerUnit;
      } else if (ing.unit === 'kg' && r.unit === 'kg') {
        total += r.amount * ing.costPerUnit;
      } else if (ing.unit === 'L' && r.unit === 'ml') {
        total += (r.amount / 1000) * ing.costPerUnit;
      } else if (ing.unit === 'L' && r.unit === 'L') {
        total += r.amount * ing.costPerUnit;
      } else if (ing.unit === 'bottle' && r.unit === 'ml') {
        total += (r.amount / 750) * ing.costPerUnit;
      } else {
        total += r.amount * ing.costPerUnit;
      }
    }
    return Math.round(total * 100) / 100;
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Coffee');
    setSellingPrice('90');
    setImageUrl('https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500');
    setDescription('');
    setStatus('AVAILABLE');
    setRecipe([
      { ingredientId: 'ing-1', amount: 18, unit: 'g' },
      { ingredientId: 'ing-8', amount: 1, unit: 'pcs' },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setSellingPrice(String(product.sellingPrice));
    setImageUrl(product.imageUrl || '');
    setDescription(product.description || '');
    setStatus(product.status);
    setRecipe(product.recipe ? [...product.recipe] : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddRecipeIngredient = () => {
    if (ingredients.length === 0) return;
    const firstIng = ingredients[0];
    const defaultUnit = firstIng.unit === 'kg' ? 'g' : firstIng.unit === 'L' ? 'ml' : firstIng.unit;
    setRecipe([
      ...recipe,
      {
        ingredientId: firstIng.id,
        amount: defaultUnit === 'g' ? 15 : defaultUnit === 'ml' ? 100 : 1,
        unit: defaultUnit,
      },
    ]);
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipe(recipe.filter((_, idx) => idx !== index));
  };

  const handleUpdateRecipeIngredient = (index: number, field: string, val: any) => {
    const updated = [...recipe];
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === val);
      const defUnit = ing ? (ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit) : 'pcs';
      updated[index] = { ...updated[index], ingredientId: val, unit: defUnit };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setRecipe(updated);
  };

  const executeSaveProduct = async (ownerPin?: string) => {
    const computedCost = calculateEstimatedCost(recipe);
    const numPrice = Number(sellingPrice);
    const payload = {
      product: {
        id: editingProduct ? editingProduct.id : undefined,
        name,
        category,
        sellingPrice: numPrice,
        cost: computedCost,
        status,
        imageUrl,
        description,
        recipe,
      },
      ownerPin,
      operatorRole: currentUser.role,
      operatorName: currentUser.name,
      operatorId: currentUser.id,
      reason: editingProduct ? 'Product specification & price update' : 'New product created',
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setIsSaving(false);
      if (data.success) {
        setIsModalOpen(false);
        refreshProducts();
      } else {
        setFormError(data.error || 'Failed to save product');
      }
    } catch (e: any) {
      setIsSaving(false);
      setFormError(e.message || 'Network error');
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(sellingPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Invalid selling price');
      return;
    }

    const isPriceChange = editingProduct && editingProduct.sellingPrice !== numPrice;
    const isOwner = currentUser.role === 'OWNER';

    // If staff/manager is changing price or creating product and is not owner, prompt Owner PIN modal!
    if (!isOwner) {
      onRequireOwnerAuth({
        action: isPriceChange ? 'PRICE_CHANGE' : 'PRODUCT_COST_CHANGE',
        actionTitle: isPriceChange ? `Change Price: ${name}` : `Save Product: ${name}`,
        itemAffected: name,
        targetId: editingProduct?.id,
        oldValue: editingProduct ? `₱${editingProduct.sellingPrice}` : 'None',
        newValue: `₱${numPrice}`,
        reason: isPriceChange ? 'Staff initiated menu price update' : 'Staff product edit',
        onSuccess: async (ownerPin: string) => {
          await executeSaveProduct(ownerPin);
        },
      });
      return;
    }

    await executeSaveProduct();
  };

  const handleDeleteProduct = (product: Product) => {
    const isOwner = currentUser.role === 'OWNER';
    if (!isOwner) {
      onRequireOwnerAuth({
        action: 'DELETE_PRODUCT',
        actionTitle: `Delete Product: ${product.name}`,
        itemAffected: product.name,
        targetId: product.id,
        oldValue: `Active Product (₱${product.sellingPrice})`,
        newValue: 'Deleted',
        reason: 'Staff requested product removal',
        onSuccess: async (ownerPin: string) => {
          await fetch(`/api/products/${product.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerPin,
              operatorRole: currentUser.role,
              operatorName: currentUser.name,
              operatorId: currentUser.id,
            }),
          });
          refreshProducts();
        },
      });
    } else {
      if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
        fetch(`/api/products/${product.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorRole: 'OWNER',
            operatorName: currentUser.name,
            operatorId: currentUser.id,
          }),
        }).then(() => refreshProducts());
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const estimatedCost = calculateEstimatedCost(recipe);
  const estimatedProfit = Math.round((Number(sellingPrice) - estimatedCost) * 100) / 100;
  const estimatedMargin =
    Number(sellingPrice) > 0
      ? Math.round(((Number(sellingPrice) - estimatedCost) / Number(sellingPrice)) * 1000) / 10
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header & Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Products & Recipe Costing</h2>
          <p className="text-xs text-slate-500">
            Manage café menu items and raw ingredient recipes. <span className="font-semibold text-slate-700">Costing Policy:</span> Labor, LPG gas, electricity, and rent are excluded from recipe unit costing and tracked separately under Operating Expenses.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product catalog..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Product Details</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-right">
                  <div>Recipe COGS</div>
                  <div className="text-[9px] text-slate-400 font-normal lowercase">(raw materials only)</div>
                </th>
                <th className="p-3.5 text-right">
                  <div>Gross Margin</div>
                  <div className="text-[9px] text-slate-400 font-normal lowercase">(excl. labor/gas)</div>
                </th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.recipe && p.recipe.length > 0
                          ? `${p.recipe.length} recipe ingredient(s)`
                          : 'No recipe attached'}
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[10px]">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-700 text-sm">
                    ₱{p.sellingPrice.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-600">
                    ₱{p.cost.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono">
                    <div className="font-bold text-emerald-600">₱{p.profit.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {p.profitMargin.toFixed(1)}% margin
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'AVAILABLE'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-600 transition-colors"
                        title="Edit Product & Recipe"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors"
                        title="Delete Product (Owner Restricted)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal with Dynamic Recipe Builder */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingProduct ? `Edit ${editingProduct.name}` : 'Create New Menu Product'}
                  </h3>
                  <p className="text-xs text-slate-500">Define selling price, product details, and recipe deductions.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Iced Hazelnut Latte"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (₱):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="UNAVAILABLE">UNAVAILABLE</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Double shot espresso, fresh milk, and French hazelnut syrup."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Recipe Costing Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Recipe & Ingredient Deductions (COGS)
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      When sold, these exact amounts will be deducted from ingredient inventory.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRecipeIngredient}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-amber-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                {/* Exclusions Notice */}
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Costing Scope:</span> Labor wages, LPG gas, electricity, water, and store rent are period operating expenses (OPEX) and are <strong className="underline">NOT included</strong> in this unit recipe cost. This cost represents direct raw materials only.
                </div>

                {recipe.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No recipe configured. Raw ingredient cost will be ₱0.00.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipe.map((r, idx) => {
                      const ing = ingredients.find((i) => i.id === r.ingredientId);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {/* Ingredient Selector */}
                          <select
                            value={r.ingredientId}
                            onChange={(e) => handleUpdateRecipeIngredient(idx, 'ingredientId', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-amber-500"
                          >
                            {ingredients.map((ingItem) => (
                              <option key={ingItem.id} value={ingItem.id}>
                                {ingItem.name} (Stock: {ingItem.currentStock} {ingItem.unit} • ₱{ingItem.costPerUnit}/{ingItem.unit})
                              </option>
                            ))}
                          </select>

                          {/* Amount Input */}
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={r.amount}
                            onChange={(e) => handleUpdateRecipeIngredient(idx, 'amount', Number(e.target.value))}
                            className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-right focus:outline-none focus:border-amber-500"
                          />

                          {/* Unit Selection */}
                          <select
                            value={r.unit}
                            onChange={(e) => handleUpdateRecipeIngredient(idx, 'unit', e.target.value)}
                            className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="pcs">pcs</option>
                            <option value="bottle">bottle</option>
                          </select>

                          {/* Remove row */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeIngredient(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Auto Costing Calculation Summary */}
                <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-medium">Raw Ingredients Cost</div>
                    <div className="font-mono font-bold text-slate-800 text-sm">
                      ₱{estimatedCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-medium">Gross Margin / Unit</div>
                    <div className="font-mono font-bold text-emerald-600 text-sm">
                      ₱{estimatedProfit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[10px] text-slate-500 font-medium">Gross Margin %</div>
                    <div className="font-mono font-bold text-amber-600 text-sm">
                      {estimatedMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
