import React, { useState } from 'react';
import {
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';

export const AuditLogView: React.FC = () => {
  const { auditLogs, refreshAuditLogs } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesQuery =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.itemAffected && log.itemAffected.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesRole = roleFilter === 'ALL' || log.performedByRole === roleFilter;

    return matchesQuery && matchesAction && matchesRole;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action)));

  const handleExportCsv = () => {
    const headers = 'ID,Timestamp,User,Role,Action,Item Affected,Old Value,New Value,Authorized By,Reason\n';
    const rows = filteredLogs.map((l) => {
      return `"${l.id}","${l.timestamp}","${l.performedByName}","${l.performedByRole}","${l.action}","${(l.itemAffected || '').replace(/"/g, '""')}","${(l.oldValue || '').replace(/"/g, '""')}","${(l.newValue || '').replace(/"/g, '""')}","${(l.authorizedByName || '').replace(/"/g, '""')}","${(l.reason || '').replace(/"/g, '""')}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cafe_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Permanent Activity & Security Audit Log</h2>
          </div>
          <p className="text-xs text-slate-500">
            Immutable tracking record of every financial transaction, void, inventory change, and manager override.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={refreshAuditLogs}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-xs"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by operator, action, item, or reason..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">All Event Types</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="OWNER">OWNER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="CASHIER">CASHIER</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">User & Role</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Item / Subject</th>
                <th className="p-3.5">Delta (Old → New)</th>
                <th className="p-3.5">Reason & Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isCritical =
                  log.action.includes('VOID') ||
                  log.action.includes('PRICE') ||
                  log.action.includes('DISCREPANCY') ||
                  log.action.includes('PIN');

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{log.performedByName}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                        {log.performedByRole}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                          isCritical
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {log.itemAffected || '—'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {log.oldValue || log.newValue ? (
                        <div className="space-y-0.5">
                          {log.oldValue && <div className="text-slate-400 line-through">{log.oldValue}</div>}
                          {log.newValue && <div className="text-emerald-600 font-bold">{log.newValue}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {log.reason && <div className="text-slate-700 italic">"{log.reason}"</div>}
                      {log.authorizedByName && (
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          ✓ Verified by {log.authorizedByName}
                        </div>
                      )}
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
