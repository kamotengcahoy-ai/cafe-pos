import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { ApprovalRequest } from '../../types.js';

interface ApprovalRequestsViewProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const ApprovalRequestsView: React.FC<ApprovalRequestsViewProps> = ({ onRequireOwnerAuth }) => {
  const { approvalRequests, currentUser, approvePendingRequest, rejectPendingRequest, refreshApprovals } =
    usePos();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedReqForAction, setSelectedReqForAction] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const filteredRequests = approvalRequests.filter((req) => {
    if (statusFilter === 'ALL') return true;
    return req.status === statusFilter;
  });

  const pendingCount = approvalRequests.filter((r) => r.status === 'PENDING').length;

  const handleOpenActionModal = (req: ApprovalRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedReqForAction(req);
    setActionType(type);
    setRejectReasonInput('');
  };

  const handleExecuteApprovalAction = (ownerPin?: string) => {
    if (!selectedReqForAction) return;

    if (actionType === 'APPROVE') {
      // If user is owner or entered pin
      if (currentUser.role !== 'OWNER' && !ownerPin) {
        onRequireOwnerAuth({
          action: selectedReqForAction.actionType || selectedReqForAction.action || 'APPROVAL',
          actionTitle: `Authorize Request #${selectedReqForAction.id}`,
          itemAffected: selectedReqForAction.itemAffected,
          oldValue: selectedReqForAction.oldValue,
          newValue: selectedReqForAction.newValue,
          reason: selectedReqForAction.reason,
          onSuccess: async (pin: string) => {
            await approvePendingRequest(selectedReqForAction.id, pin);
            setSelectedReqForAction(null);
          },
        });
        return;
      }

      approvePendingRequest(selectedReqForAction.id, ownerPin).then(() => {
        setSelectedReqForAction(null);
      });
    } else {
      rejectPendingRequest(selectedReqForAction.id, rejectReasonInput || 'Rejected by management').then(() => {
        setSelectedReqForAction(null);
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Owner Authorization Queue</h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Review sensitive staff actions: price overrides, transaction voids, inventory count adjustments, and shift discrepancies.
          </p>
        </div>

        <button
          onClick={refreshApprovals}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {tab}
            {tab === 'PENDING' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white border border-slate-200 rounded-2xl space-y-2 text-slate-400 shadow-xs">
            <ShieldCheck className="w-10 h-10 mx-auto opacity-40 text-emerald-600" />
            <div className="text-sm font-bold text-slate-700">No authorization requests in this view</div>
            <div className="text-xs text-slate-500">All staff transactions are operating within designated role parameters.</div>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                <div>
                  {/* Top Status & Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">
                      {String(req.actionType || req.action || 'ACTION').replace(/_/g, ' ')}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isPending
                          ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                          : isApproved
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Requester info */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Requested by: <strong className="text-slate-800">{req.requestedByName}</strong> ({req.requestedByRole})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm">{req.itemAffected}</div>

                    {/* Comparison Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Previous Value</div>
                        <div className="font-mono text-slate-700 mt-0.5">{req.oldValue || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-700 uppercase font-semibold">Requested Value</div>
                        <div className="font-mono text-amber-900 font-bold mt-0.5">{req.newValue || '—'}</div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-slate-600 pt-1 text-xs">
                      <span className="font-semibold text-slate-800">Staff Reason: </span>
                      <span className="italic">"{req.reason}"</span>
                    </div>

                    {/* Decided info if already handled */}
                    {!isPending && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>
                          Decided by: <strong className="text-slate-700">{req.reviewedByName || 'Owner'}</strong>
                        </span>
                        <span>{req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner Actions */}
                {isPending && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenActionModal(req, 'REJECT')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleOpenActionModal(req, 'APPROVE')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve with PIN</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation & Authorization Action Modal */}
      {selectedReqForAction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                    actionType === 'APPROVE' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {actionType === 'APPROVE' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {actionType === 'APPROVE' ? 'Approve Authorization' : 'Reject Staff Request'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Request #{selectedReqForAction.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReqForAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{selectedReqForAction.itemAffected}</div>
                <div className="text-slate-600">Proposed Change: {selectedReqForAction.newValue}</div>
              </div>

              {actionType === 'REJECT' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason (Feedback for staff):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="e.g. Price discounts cannot exceed promo budget"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                  Approving this request will apply the requested change immediately and record an owner-authorized audit entry.
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForAction(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteApprovalAction()}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionType === 'APPROVE' ? (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Authorize with PIN</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
