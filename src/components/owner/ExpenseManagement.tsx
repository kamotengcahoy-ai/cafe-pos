import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  DollarSign,
  Edit2,
  FileSpreadsheet,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { Expense } from '../../types.js';

interface ExpenseManagementProps {
  onRequireOwnerAuth?: (config: any) => void;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ onRequireOwnerAuth }) => {
  const { expenses, currentUser, refreshExpenses } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [category, setCategory] = useState<any>('Electricity');
  const [amount, setAmount] = useState('1500');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteReason, setDeleteReason] = useState('Incorrect or duplicated expense entry');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const expenseCategories = [
    'Electricity',
    'Water',
    'LPG Gas',
    'Staff Labor & Wages',
    'Store Rent',
    'Packaging Supplies',
    'Repairs & Maintenance',
    'Staff Meal & Welfare',
    'Cleaning Supplies',
    'Marketing & Promo',
    'Permits & Licenses',
    'Miscellaneous Overhead',
  ];

  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setCategory('Electricity');
    setAmount('1500');
    setDescription('');
    setReceiptNumber('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setDescription(exp.description);
    setReceiptNumber(exp.receiptNumber || '');
    setExpenseDate(exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const executeSaveExpense = async (ownerPin?: string) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const expensePayload: Partial<Expense> = {
      ...(editingExpense ? { id: editingExpense.id } : {}),
      category,
      amount: numAmount,
      description,
      receiptNumber,
      date: new Date(expenseDate).toISOString(),
      recordedBy: currentUser.name,
      addedByName: currentUser.name,
      addedBy: currentUser.id,
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense: expensePayload,
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
          ownerPin,
        }),
      });
      const data = await res.json();
      setIsSaving(false);

      if (data.success) {
        setIsModalOpen(false);
        setEditingExpense(null);
        refreshExpenses();
      } else {
        setFormError(data.error || 'Failed to save expense');
      }
    } catch (e: any) {
      setIsSaving(false);
      setFormError(e.message || 'Network error');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const isOwner = currentUser.role === 'OWNER';

    // If editing existing expense and user is not owner, require PIN
    if (editingExpense && !isOwner && onRequireOwnerAuth) {
      onRequireOwnerAuth({
        action: 'EDIT_EXPENSE',
        actionTitle: `Edit Expense: ${editingExpense.description}`,
        itemAffected: `Expense #${editingExpense.id} (${editingExpense.category})`,
        targetId: editingExpense.id,
        oldValue: `₱${editingExpense.amount} (${editingExpense.category})`,
        newValue: `₱${amount} (${category})`,
        reason: 'Correction of expense record',
        onSuccess: async (ownerPin: string) => {
          await executeSaveExpense(ownerPin);
        },
      });
      return;
    }

    await executeSaveExpense();
  };

  const executeDeleteExpense = async (ownerPin?: string) => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
          ownerPin,
          reason: deleteReason,
        }),
      });
      const data = await res.json();
      setIsDeleting(false);

      if (data.success) {
        setDeletingExpense(null);
        refreshExpenses();
      } else {
        setDeleteError(data.error || 'Failed to delete expense record');
      }
    } catch (e: any) {
      setIsDeleting(false);
      setDeleteError(e.message || 'Network error occurred');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    const isOwner = currentUser.role === 'OWNER';

    if (!isOwner && onRequireOwnerAuth) {
      onRequireOwnerAuth({
        action: 'DELETE_EXPENSE',
        actionTitle: `Delete Expense: ${deletingExpense.description}`,
        itemAffected: `${deletingExpense.category}: ${deletingExpense.description} (₱${deletingExpense.amount.toFixed(2)})`,
        targetId: deletingExpense.id,
        oldValue: `₱${deletingExpense.amount} (${deletingExpense.category})`,
        newValue: 'Deleted from ledger',
        reason: deleteReason,
        onSuccess: async (ownerPin: string) => {
          await executeDeleteExpense(ownerPin);
        },
      });
      return;
    }

    await executeDeleteExpense();
  };

  const filtered = expenses.filter((exp) => {
    const matchesCat = categoryFilter === 'ALL' || exp.category === categoryFilter;
    const matchesQuery =
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const totalExpenseSum = filtered.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Café Operating Expenses (OPEX)</h2>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold">
              Editable & Deletable
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track and manage operational overheads (LPG cooking gas, staff labor, utilities, rent, supplies). You can record, edit, or delete any OPEX entry anytime.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
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
            placeholder="Search expense description, category, or receipt #..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">Filtered Expenses ({filtered.length}):</span>
            <span className="text-[10px] text-slate-400">Total OPEX overhead</span>
          </div>
          <span className="font-mono font-bold text-rose-600 text-base">
            ₱{totalExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {['ALL', ...expenseCategories].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Description & Receipt</th>
                <th className="p-3.5 text-right">Amount (₱)</th>
                <th className="p-3.5">Recorded By</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <TrendingDown className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No expense records found</p>
                    <p className="text-[11px] text-slate-400">Click "Record New Expense" above to log operational costs.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{exp.description}</div>
                      {exp.receiptNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">OR #: {exp.receiptNumber}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                      -₱{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{exp.recordedBy || exp.addedByName || 'Owner'}</td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(exp)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                          title="Edit this expense entry"
                        >
                          <Edit2 className="w-3 h-3 text-amber-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingExpense(exp);
                            setDeleteReason('Correction / duplicate expense entry');
                            setDeleteError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                          title="Delete this expense entry"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record or Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  {editingExpense ? <Edit2 className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingExpense ? 'Edit Operating Expense' : 'Record Operating Expense'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingExpense
                      ? 'Update details or amount for this expense entry.'
                      : 'Log overhead cost out of store cash or bank accounts.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExpense(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date:</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₱):</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo:</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Meralco electricity bill payment for August"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receipt / Official Invoice Number:
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. OR-881920 (Optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                />
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
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingExpense(null);
                  }}
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
                  <span>{isSaving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Record Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-50 p-4 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Delete Operating Expense</h3>
                  <p className="text-[11px] text-rose-700">This action will remove this cost from store records.</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingExpense(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Description:</span>
                  <span className="font-semibold text-slate-900">{deletingExpense.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Date Recorded:</span>
                  <span className="font-mono text-slate-700">{new Date(deletingExpense.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold">Amount to Deduct:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    ₱{deletingExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Deletion:</label>
                <input
                  type="text"
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate entry, incorrect bill amount"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              {deleteError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingExpense(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
