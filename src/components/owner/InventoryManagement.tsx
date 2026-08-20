import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Edit,
  Layers,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { Ingredient } from '../../types.js';

interface InventoryManagementProps {
  onRequireOwnerAuth: (config: any) => void;
  onNavigateTab: (tab: string) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  onRequireOwnerAuth,
  onNavigateTab,
}) => {
  const { ingredients, suppliers, currentUser, refreshIngredients } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Add / Edit Ingredient Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Coffee');
  const [currentStock, setCurrentStock] = useState('5');
  const [unit, setUnit] = useState('kg');
  const [costPerUnit, setCostPerUnit] = useState('850');
  const [reorderLevel, setReorderLevel] = useState('2');
  const [supplierId, setSupplierId] = useState('');

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetIng, setAdjustTargetIng] = useState<Ingredient | null>(null);
  const [adjustNewQuantity, setAdjustNewQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const categories = [
    'ALL',
    'Coffee',
    'Dairy',
    'Dairy Alternative',
    'Syrups',
    'Sauces',
    'Powders',
    'Packaging',
    'Bakery',
    'Meat',
    'Grains',
    'Poultry',
    'Pantry',
  ];

  const handleOpenAddModal = () => {
    setEditingIng(null);
    setName('');
    setCategory('Coffee');
    setCurrentStock('5');
    setUnit('kg');
    setCostPerUnit('850');
    setReorderLevel('2');
    setSupplierId(suppliers[0]?.id || '');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (ing: Ingredient) => {
    setEditingIng(ing);
    setName(ing.name);
    setCategory(ing.category);
    setCurrentStock(String(ing.currentStock));
    setUnit(ing.unit);
    setCostPerUnit(String(ing.costPerUnit));
    setReorderLevel(String(ing.reorderLevel));
    setSupplierId(ing.supplierId || '');
    setIsEditModalOpen(true);
  };

  const handleOpenAdjustModal = (ing: Ingredient) => {
    setAdjustTargetIng(ing);
    setAdjustNewQuantity(String(ing.currentStock));
    setAdjustReason('Physical stock audit / Spoilage');
    setIsAdjustModalOpen(true);
  };

  const executeSaveIngredient = async (ownerPin?: string) => {
    const payload = {
      ingredient: {
        id: editingIng ? editingIng.id : undefined,
        name,
        category,
        currentStock: Number(currentStock),
        unit,
        costPerUnit: Number(costPerUnit),
        reorderLevel: Number(reorderLevel),
        supplierId,
      },
      ownerPin,
      operatorRole: currentUser.role,
      operatorName: currentUser.name,
      operatorId: currentUser.id,
      reason: editingIng ? 'Updated ingredient unit cost / reorder level' : 'Created new raw ingredient',
    };

    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setIsEditModalOpen(false);
      refreshIngredients();
    }
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const isOwner = currentUser.role === 'OWNER';

    if (!isOwner) {
      onRequireOwnerAuth({
        action: 'INVENTORY_ADJUSTMENT',
        actionTitle: editingIng ? `Update Ingredient: ${name}` : `Create Ingredient: ${name}`,
        itemAffected: name,
        oldValue: editingIng ? `₱${editingIng.costPerUnit}/${editingIng.unit}` : 'None',
        newValue: `₱${costPerUnit}/${unit}`,
        reason: 'Staff inventory master record modification',
        onSuccess: async (ownerPin: string) => {
          await executeSaveIngredient(ownerPin);
        },
      });
      return;
    }

    await executeSaveIngredient();
  };

  // Manual Stock Adjustment - strictly requires Owner Authorization
  const handleExecuteAdjustment = async (ownerPin?: string) => {
    if (!adjustTargetIng) return;

    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientId: adjustTargetIng.id,
        newQuantity: Number(adjustNewQuantity),
        reason: adjustReason,
        ownerPin,
        operatorRole: currentUser.role,
        operatorName: currentUser.name,
        operatorId: currentUser.id,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setIsAdjustModalOpen(false);
      refreshIngredients();
    }
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetIng) return;
    const isOwner = currentUser.role === 'OWNER';

    if (!isOwner) {
      onRequireOwnerAuth({
        action: 'INVENTORY_ADJUSTMENT',
        actionTitle: `Manual Stock Adjustment: ${adjustTargetIng.name}`,
        itemAffected: adjustTargetIng.name,
        oldValue: `${adjustTargetIng.currentStock} ${adjustTargetIng.unit}`,
        newValue: `${adjustNewQuantity} ${adjustTargetIng.unit}`,
        reason: adjustReason || 'Physical inventory audit / spoilage',
        onSuccess: async (ownerPin: string) => {
          await handleExecuteAdjustment(ownerPin);
        },
      });
      return;
    }

    handleExecuteAdjustment();
  };

  const filtered = ingredients.filter((ing) => {
    const matchesCat = selectedCategory === 'ALL' || ing.category === selectedCategory;
    const matchesQuery = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLow = filterLowStockOnly ? ing.currentStock <= ing.reorderLevel : true;
    return matchesCat && matchesQuery && matchesLow;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Ingredient Inventory Tracking</h2>
          <p className="text-xs text-slate-500">
            Monitor real-time ingredient levels, unit costs, and automated recipe deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('purchases')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stock In / Receive</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee beans, milk, syrups, packaging..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              filterLowStockOnly
                ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Show Low Stock Only</span>
          </button>
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

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Ingredient</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Current Stock</th>
                <th className="p-3.5 text-right">Reorder Alert</th>
                <th className="p-3.5 text-right">Unit Cost</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ing) => {
                const isLow = ing.currentStock <= ing.reorderLevel;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{ing.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {ing.lastRestocked
                          ? `Last restocked: ${new Date(ing.lastRestocked).toLocaleDateString()}`
                          : 'No restock date'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[10px]">
                        {ing.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-sm">
                      <span className={isLow ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                        {ing.currentStock} {ing.unit}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {ing.reorderLevel} {ing.unit}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-amber-700">
                      ₱{ing.costPerUnit.toFixed(2)} / {ing.unit}
                    </td>
                    <td className="p-3.5 text-center">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                          Healthy
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjustModal(ing)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 border border-slate-200"
                          title="Manual Inventory Count Adjustment (Restricted)"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ing)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
                          title="Edit Unit Cost / Specifications"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal (Requires Owner Approval) */}
      {isAdjustModalOpen && adjustTargetIng && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manual Stock Adjustment</h3>
                  <p className="text-[11px] text-slate-500">{adjustTargetIng.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500">Current System Stock:</span>
                <span className="font-mono font-bold text-slate-900">
                  {adjustTargetIng.currentStock} {adjustTargetIng.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Physical Stock Count ({adjustTargetIng.unit}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustNewQuantity}
                  onChange={(e) => setAdjustNewQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment (Audit Mandatory):
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. End of month physical inventory count / spilled milk bottle"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Ingredient Specification Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingIng ? `Edit ${editingIng.name}` : 'New Ingredient Specification'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Setup inventory unit, reorder alerts, and unit cost.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ingredient Name:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arabica Beans"
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Stock:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit:</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="bottle">bottle</option>
                    <option value="pcs">pcs</option>
                    <option value="can">can</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost per Unit (₱):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reorder Alert Level:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Supplier:</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingIng ? 'Update Ingredient' : 'Create Ingredient'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
