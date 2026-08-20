import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bike,
  Calendar,
  Eye,
  FileText,
  Filter,
  Lock,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  User,
  Utensils,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { Sale } from '../../types.js';

interface SalesHistoryViewProps {
  onViewReceipt: (sale: Sale) => void;
  onRequireOwnerAuth: (config: any) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  onViewReceipt,
  onRequireOwnerAuth,
}) => {
  const { sales, currentUser, voidSaleTransaction } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Voiding state
  const [selectedSaleForVoid, setSelectedSaleForVoid] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('Customer changed mind / incorrect item input');

  const handleOpenVoidDialog = (sale: Sale) => {
    setSelectedSaleForVoid(sale);
    setVoidReason('Customer cancelled order before preparation');
  };

  const handleConfirmVoid = async () => {
    if (!selectedSaleForVoid) return;

    const isOwner = currentUser.role === 'OWNER';

    if (!isOwner) {
      onRequireOwnerAuth({
        action: 'VOID_TRANSACTION',
        actionTitle: `Void Sale #${selectedSaleForVoid.receiptNumber}`,
        itemAffected: `Receipt #${selectedSaleForVoid.receiptNumber} (₱${selectedSaleForVoid.total.toFixed(2)})`,
        targetId: selectedSaleForVoid.id,
        oldValue: 'Status: COMPLETED',
        newValue: 'Status: VOIDED (Inventory will be restored)',
        reason: voidReason,
        onSuccess: async (ownerPin: string) => {
          await voidSaleTransaction(selectedSaleForVoid.id, voidReason, ownerPin);
          setSelectedSaleForVoid(null);
        },
      });
      return;
    }

    await voidSaleTransaction(selectedSaleForVoid.id, voidReason);
    setSelectedSaleForVoid(null);
  };

  const filteredSales = sales.filter((s) => {
    const matchesQuery =
      s.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.paymentReference && s.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;

    return matchesQuery && matchesStatus && matchesPayment;
  });

  const totalFilteredAmount = filteredSales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Sales Transactions & Receipts</h2>
          <p className="text-xs text-slate-500">
            Audit-protected record of all cashier orders, payment channels, and thermal receipts.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Filtered Completed Revenue:</span>
          <span className="font-mono font-black text-amber-700 text-base">
            ₱{totalFilteredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, cashier name, payment reference..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="VOIDED">VOIDED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Receipt #</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5">Order Type</th>
                <th className="p-3.5">Items Ordered</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-right">Total Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => {
                const isVoided = s.status === 'VOIDED';

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-sm">
                      {s.receiptNumber}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-850">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{s.cashierName}</span>
                    </td>
                    <td className="p-3.5">
                      {s.orderType === 'DELIVERY' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold">
                            <Truck className="w-3 h-3 text-sky-600" />
                            <span>Delivery</span>
                          </span>
                          <div className="text-[9px] text-sky-800 font-semibold">
                            Fee: ₱{(s.deliveryFee || 0).toFixed(2)} ({s.deliveryPlatform || 'Courier'})
                          </div>
                        </div>
                      ) : s.orderType === 'TAKEOUT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                          <ShoppingBag className="w-3 h-3 text-amber-600" />
                          <span>Takeout</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold">
                          <Utensils className="w-3 h-3 text-slate-500" />
                          <span>Dine In</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800 line-clamp-1">
                        {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.items.reduce((a, b) => a + b.quantity, 0)} total unit(s)
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {s.paymentMethod}
                      </span>
                      {s.paymentReference && (
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{s.paymentReference}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-700 text-sm">
                      ₱{s.total.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-rose-50 border-rose-300 text-rose-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewReceipt(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>

                        {!isVoided && (
                          <button
                            onClick={() => handleOpenVoidDialog(s)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 text-[11px] transition-colors flex items-center gap-1"
                            title="Void Sale (Owner PIN Restricted)"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Void</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {selectedSaleForVoid && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-50 p-4 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">
                    Void Transaction #{selectedSaleForVoid.receiptNumber}
                  </h3>
                  <p className="text-[11px] text-rose-700">Owner authorization required.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleForVoid(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Order Total:</span>
                  <span className="font-mono font-bold text-amber-700">₱{selectedSaleForVoid.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Method:</span>
                  <span className="text-slate-900">{selectedSaleForVoid.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cashier:</span>
                  <span className="text-slate-900">{selectedSaleForVoid.cashierName}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                <div className="font-bold text-amber-950">What happens when voided?</div>
                <div>• Transaction is marked VOIDED (never deleted, for financial audit integrity).</div>
                <div>• All deducted recipe ingredients will automatically be returned to inventory.</div>
                <div>• Action is permanently recorded in the Audit Log with supervisor approval.</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Voiding (Mandatory):
                </label>
                <textarea
                  rows={2}
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Cashier pressed wrong item / customer cancelled before cup was poured"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSaleForVoid(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Authorize Void</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
