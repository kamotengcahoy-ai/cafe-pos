import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  Calendar,
  Check,
  DollarSign,
  FileText,
  Layers,
  Package,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { PurchaseOrder } from '../../types.js';

export const PurchasesView: React.FC = () => {
  const { purchases, ingredients, suppliers, currentUser, refreshPurchases, refreshIngredients } =
    usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stock In Form
  const [ingredientId, setIngredientId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitCost, setUnitCost] = useState('850');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = () => {
    if (ingredients.length > 0) {
      const first = ingredients[0];
      setIngredientId(first.id);
      setUnitCost(String(first.costPerUnit));
      setSupplierId(first.supplierId || suppliers[0]?.id || '');
    }
    setQuantity('5');
    setInvoiceNumber(`INV-${Date.now().toString().slice(-5)}`);
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleIngredientChange = (id: string) => {
    setIngredientId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setUnitCost(String(ing.costPerUnit));
      if (ing.supplierId) setSupplierId(ing.supplierId);
    }
  };

  const selectedIng = ingredients.find((i) => i.id === ingredientId);
  const numQty = Number(quantity) || 0;
  const numCost = Number(unitCost) || 0;
  const totalCost = numQty * numCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId || numQty <= 0 || numCost <= 0) {
      setFormError('Please enter valid quantity and unit cost');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase: {
            ingredientId,
            ingredientName: selectedIng?.name || 'Raw Ingredient',
            supplierId,
            supplierName: suppliers.find((s) => s.id === supplierId)?.name || 'Direct Supplier',
            quantity: numQty,
            unit: selectedIng?.unit || 'pcs',
            unitCost: numCost,
            totalCost,
            invoiceNumber,
            notes,
            receivedBy: currentUser.name,
          },
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setIsModalOpen(false);
        refreshPurchases();
        refreshIngredients();
      } else {
        setFormError(data.error || 'Failed to record purchase');
      }
    } catch (e: any) {
      setIsSubmitting(false);
      setFormError(e.message || 'Network error');
    }
  };

  const filtered = purchases.filter((po) => {
    return (
      po.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.invoiceNumber && po.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalSpentPurchases = filtered.reduce((acc, p) => acc + p.totalCost, 0);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Stock-In & Purchase Orders</h2>
          <p className="text-xs text-slate-500">
            Log deliveries and raw supply receiving. Automatically replenishes inventory and updates unit costs.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Receive New Stock-In</span>
        </button>
      </div>

      {/* Filter and Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ingredient, supplier, or invoice #..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs focus:outline-none"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Restock Spend:</span>
          <span className="font-mono font-bold text-amber-700 text-base">
            ₱{totalSpentPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Date & Invoice</th>
                <th className="p-3.5">Ingredient Delivered</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Quantity</th>
                <th className="p-3.5 text-right">Unit Cost</th>
                <th className="p-3.5 text-right">Total Cost</th>
                <th className="p-3.5">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{po.invoiceNumber || 'No Inv #'}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      <span>{po.ingredientName}</span>
                    </div>
                    {po.notes && <div className="text-[10px] text-slate-400">{po.notes}</div>}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                      {po.supplierName}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-600 text-sm">
                    +{po.quantity} {po.unit}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-600">
                    ₱{po.unitCost.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-700 text-sm">
                    ₱{po.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {po.receivedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Receive Stock-In Delivery</h3>
                  <p className="text-[11px] text-slate-500">Restock ingredient inventory with purchase invoice.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Ingredient:</label>
                <select
                  value={ingredientId}
                  onChange={(e) => handleIngredientChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Current Stock: {ing.currentStock} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Vendor:</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contactNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Received ({selectedIng?.unit || 'unit'}):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Unit Cost (₱/{selectedIng?.unit || 'unit'}):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Live Cost Computation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Total Purchase Invoice Amount:</span>
                <span className="font-mono font-black text-amber-700 text-base">
                  ₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / OR #:</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. SI-2026-904"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Notes:</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Batch expiry Dec 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Receiving...' : 'Confirm Delivery'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
