import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Delete,
  KeyRound,
  Lock,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.js';
import { ActionType } from '../types.js';

export interface OwnerAuthRequestConfig {
  action: ActionType;
  actionTitle: string;
  itemAffected: string;
  targetId?: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  payload?: any;
  onSuccess: (ownerPin: string) => Promise<void> | void;
}

interface OwnerAuthModalProps {
  isOpen?: boolean;
  onClose: () => void;
  config: OwnerAuthRequestConfig | null;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen = true,
  onClose,
  config,
}) => {
  const { currentUser, verifyOwnerPin, requestOwnerApproval } = usePos();
  const [pin, setPin] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAsyncRequested, setIsAsyncRequested] = useState(false);

  if (!isOpen || !config) return null;

  const handleNumberClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleDirectApprove = async () => {
    if (pin.length < 4) {
      setError('Please enter at least 4 digits PIN.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyOwnerPin(pin);
      if (!isValid) {
        setError('Invalid Owner Authorization PIN. Access Denied.');
        setIsVerifying(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(async () => {
        try {
          await config.onSuccess(pin);
          setIsVerifying(false);
          setIsSuccess(false);
          setPin('');
          setReasonInput('');
          onClose();
        } catch (e: any) {
          setError(e.message || 'Execution error');
          setIsVerifying(false);
          setIsSuccess(false);
        }
      }, 600);
    } catch (e: any) {
      setError(e.message || 'Verification failed');
      setIsVerifying(false);
    }
  };

  const handleSendToApprovalQueue = async () => {
    const finalReason = reasonInput.trim() || config.reason || 'Staff requested authorization';
    setIsVerifying(true);
    await requestOwnerApproval(
      config.action,
      config.actionTitle,
      config.itemAffected,
      config.oldValue,
      config.newValue,
      finalReason,
      config.payload
    );
    setIsVerifying(false);
    setIsAsyncRequested(true);
    setTimeout(() => {
      setIsAsyncRequested(false);
      setPin('');
      setReasonInput('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-950 uppercase tracking-wide">
                Owner Approval Required
              </h2>
              <p className="text-xs text-amber-800">
                This sensitive action requires authorized Owner PIN or approval.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details Card */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Staff Member:</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {currentUser.name} ({currentUser.role})
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Action:</span>
              <span className="font-bold text-amber-700">{config.actionTitle}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Target Item:</span>
              <span className="font-medium text-slate-900">{config.itemAffected}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <div>
                <div className="text-[10px] text-slate-400 font-mono uppercase">Old Value</div>
                <div className="font-medium text-rose-600 line-through truncate">{config.oldValue}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-mono uppercase">New Value</div>
                <div className="font-bold text-emerald-600 truncate">{config.newValue}</div>
              </div>
            </div>

            {/* Optional Reason Input if not set */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Reason for change / void:
              </label>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={config.reason || 'e.g. Customer cancelled order / Price update'}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-amber-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* PIN Input Form */}
          {!isAsyncRequested ? (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-xs text-slate-600 mb-2 font-medium flex items-center justify-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Enter Owner PIN (Default: 123456)</span>
                </div>

                {/* PIN Dots Display */}
                <div className="flex justify-center items-center gap-2 mb-3">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        pin.length > idx
                          ? 'bg-amber-600 border-amber-600 shadow-xs shadow-amber-600/50 scale-110'
                          : 'border-slate-300 bg-slate-100'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {isSuccess && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 mb-2 animate-bounce font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>OWNER AUTHORIZATION APPROVED! Executing...</span>
                  </div>
                )}
              </div>

              {/* Touch Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') handleClear();
                      else if (key === '⌫') handleBackspace();
                      else handleNumberClick(key);
                    }}
                    className={`h-11 rounded-xl text-base font-bold transition-all active:scale-95 flex items-center justify-center ${
                      key === 'C' || key === '⌫'
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 text-sm'
                        : 'bg-white text-slate-800 hover:bg-amber-600 hover:text-white border border-slate-200 shadow-xs'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={pin.length < 4 || isVerifying || isSuccess}
                  onClick={handleDirectApprove}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isVerifying ? 'Verifying PIN...' : 'Authorize & Execute Action'}</span>
                </button>

                <div className="flex items-center gap-2 text-slate-400 text-xs justify-center py-0.5">
                  <span>- or -</span>
                </div>

                <button
                  type="button"
                  onClick={handleSendToApprovalQueue}
                  disabled={isVerifying}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors border border-slate-200 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5 text-amber-600" />
                  <span>Send as Request to Owner's Approvals Queue</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Request Sent to Owner</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your request has been added to the owner's notification queue. The action will execute once the owner reviews and approves it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
