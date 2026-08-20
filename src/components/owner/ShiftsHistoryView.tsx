import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  History,
  Lock,
  Receipt,
  User,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';

export const ShiftsHistoryView: React.FC = () => {
  const { shiftHistory } = usePos();

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Cash Register Shifts & Drawer Audits</h2>
        <p className="text-xs text-slate-500">
          Historical log of cashier shift openings, starting floats, physical drawer counts, and cash discrepancies.
        </p>
      </div>

      {/* Shifts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Shift ID & Date</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5 text-right">Starting Float</th>
                <th className="p-3.5 text-right">Cash Sales</th>
                <th className="p-3.5 text-right">Expected Drawer</th>
                <th className="p-3.5 text-right">Counted Cash</th>
                <th className="p-3.5 text-right">Difference</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shiftHistory.map((shift) => {
                const discrepancy = shift.discrepancy || 0;
                const isShortage = discrepancy < 0;
                const isOverage = discrepancy > 0;
                const isBalanced = discrepancy === 0;

                return (
                  <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">#{shift.id}</div>
                      <div className="text-slate-400">
                        {new Date(shift.startTime).toLocaleDateString()}{' '}
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{shift.cashierName}</div>
                      {shift.notes && <div className="text-[10px] text-slate-500 italic">"{shift.notes}"</div>}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-700">
                      ₱{shift.startingCash.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-emerald-600">
                      +₱{shift.cashSales.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      ₱{shift.expectedCash.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {shift.actualCash !== undefined ? `₱${shift.actualCash.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-sm font-bold">
                      {shift.actualCash === undefined ? (
                        <span className="text-slate-400">—</span>
                      ) : isBalanced ? (
                        <span className="text-emerald-600">₱0.00</span>
                      ) : isShortage ? (
                        <span className="text-rose-600">-₱{Math.abs(discrepancy).toLocaleString()}</span>
                      ) : (
                        <span className="text-blue-600">+₱{discrepancy.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          shift.status === 'OPEN'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse'
                            : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
