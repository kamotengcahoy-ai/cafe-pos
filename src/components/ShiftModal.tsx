import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Lock,
  Receipt,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.js';

interface ShiftModalProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ onRequireOwnerAuth }) => {
  const {
    currentUser,
    currentShift,
    openShiftModalOpen,
    setOpenShiftModalOpen,
    closeShiftModalOpen,
    setCloseShiftModalOpen,
    openNewShift,
    closeCurrentShift,
  } = usePos();

  // Open Shift State
  const [startingCash, setStartingCash] = useState<string>('2000');
  const [isOpening, setIsOpening] = useState(false);

  // Close Shift State
  const [actualCash, setActualCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // ----------------------------------------------------
  // OPEN SHIFT MODAL
  // ----------------------------------------------------
  if (openShiftModalOpen) {
    const handleOpenSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = Number(startingCash);
      if (isNaN(amount) || amount < 0) return;
      setIsOpening(true);
      await openNewShift(amount);
      setIsOpening(false);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Open Cashier Shift</h3>
                <p className="text-xs text-slate-500">Enter beginning cash drawer float amount.</p>
              </div>
            </div>
            <button
              onClick={() => setOpenShiftModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleOpenSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cashier on Duty:
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold">{currentUser.name}</span> ({currentUser.role})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Starting Cash Float (₱):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                  placeholder="2000"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['1000', '2000', '3000', '5000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStartingCash(preset)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      startingCash === preset
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    ₱{Number(preset).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenShiftModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isOpening || !startingCash}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isOpening ? 'Starting...' : 'Open Shift'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CLOSE SHIFT MODAL
  // ----------------------------------------------------
  if (closeShiftModalOpen && currentShift) {
    const counted = Number(actualCash) || 0;
    const discrepancy = actualCash === '' ? 0 : counted - currentShift.expectedCash;
    const isSignificant = Math.abs(discrepancy) > 100 && actualCash !== '';

    const handleCloseSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (actualCash === '') {
        setCloseError('Please count and enter actual cash in the drawer.');
        return;
      }

      setIsClosing(true);
      setCloseError(null);

      const result = await closeCurrentShift(counted, closeNotes);
      setIsClosing(false);

      if (result.success) {
        setActualCash('');
        setCloseNotes('');
      } else if (result.requiresOwnerApproval) {
        // Trigger owner auth modal with rich details
        onRequireOwnerAuth({
          action: 'SHIFT_DISCREPANCY',
          actionTitle: 'Authorize Shift Cash Discrepancy',
          itemAffected: `Shift #${currentShift.id} (${currentShift.cashierName})`,
          oldValue: `Expected Cash: ₱${currentShift.expectedCash.toLocaleString()}`,
          newValue: `Counted: ₱${counted.toLocaleString()} (${discrepancy < 0 ? `Shortage: -₱${Math.abs(discrepancy)}` : `Overage: +₱${discrepancy}`})`,
          reason: closeNotes || 'Cash difference at end of shift reconciliation',
          onSuccess: async (ownerPin: string) => {
            await closeCurrentShift(counted, closeNotes, ownerPin);
            setActualCash('');
            setCloseNotes('');
          },
        });
      } else {
        setCloseError(result.error || 'Failed to close shift');
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
          <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">End Shift Reconciliation</h3>
                <p className="text-xs text-slate-500">Review drawer balance and enter counted physical cash.</p>
              </div>
            </div>
            <button
              onClick={() => setCloseShiftModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCloseSubmit} className="p-5 space-y-4">
            {/* Shift Summary Breakdown Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Shift Started:</span>
                <span className="font-mono text-slate-800">
                  {new Date(currentShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Starting Drawer Float:</span>
                <span className="font-mono text-slate-800">₱{currentShift.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Total Cash Sales:</span>
                <span className="font-mono text-emerald-600 font-bold">+₱{currentShift.cashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>Non-Cash (GCash/Maya/Bank):</span>
                <span className="font-mono text-slate-600">
                  ₱{(currentShift.gcashSales + currentShift.mayaSales + currentShift.bankSales).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
                <span className="text-slate-800">Expected Physical Cash in Drawer:</span>
                <span className="font-mono text-amber-700 text-base">₱{currentShift.expectedCash.toLocaleString()}</span>
              </div>
            </div>

            {/* Actual Counted Cash Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Counted Physical Cash in Drawer (₱):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                  placeholder={`e.g. ${currentShift.expectedCash}`}
                  autoFocus
                />
              </div>
            </div>

            {/* Live Discrepancy Indicator */}
            {actualCash !== '' && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : discrepancy < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {discrepancy === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <div>
                    <div className="font-bold">
                      {discrepancy === 0
                        ? 'Exact Match (Drawer Balanced)'
                        : discrepancy < 0
                        ? `Cash Shortage: -₱${Math.abs(discrepancy).toLocaleString()}`
                        : `Cash Overage: +₱${discrepancy.toLocaleString()}`}
                    </div>
                    {isSignificant && (
                      <div className="text-[11px] opacity-90 mt-0.5 font-medium text-amber-900">
                        ⚠️ Discrepancy exceeds ₱100. Will require Owner Authorization to finalize.
                      </div>
                    )}
                  </div>
                </div>
                <div className="font-mono font-black text-sm">
                  {discrepancy >= 0 ? `+₱${discrepancy}` : `-₱${Math.abs(discrepancy)}`}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closing Shift Notes / Discrepancy Reason (Optional):
              </label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Drawer balanced, handed over to next shift cashier"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white placeholder-slate-400"
              />
            </div>

            {closeError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{closeError}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCloseShiftModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                Keep Shift Open
              </button>
              <button
                type="submit"
                disabled={isClosing || actualCash === ''}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isClosing ? 'Finalizing...' : 'Close Shift & Print Z-Report'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};
