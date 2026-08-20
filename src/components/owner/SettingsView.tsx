import React, { useState } from 'react';
import {
  AlertCircle,
  Bike,
  Building,
  Check,
  CheckCircle2,
  Database,
  HardDrive,
  KeyRound,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Truck,
  User,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { SystemSettings, UserRole } from '../../types.js';
import { OfflineStorageManager } from '../../utils/offlineStorage.js';

interface SettingsViewProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRequireOwnerAuth }) => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    refreshUsers,
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    syncOfflineQueue,
    refreshAllData,
  } = usePos();

  // Store Settings Form with safe defaults
  const [formData, setFormData] = useState<SystemSettings>({
    cafeName: settings.cafeName || '',
    branchName: settings.branchName || '',
    address: settings.address || '',
    contactNumber: settings.contactNumber || '',
    taxIdentificationNumber: settings.taxIdentificationNumber || '',
    currency: settings.currency || settings.currencySymbol || '₱',
    currencySymbol: settings.currencySymbol || settings.currency || '₱',
    receiptHeader: settings.receiptHeader || '',
    receiptFooter: settings.receiptFooter || '',
    maxStaffDiscountPercent: settings.maxStaffDiscountPercent ?? 10,
    defaultDeliveryFee: settings.defaultDeliveryFee ?? 50,
    lowStockThresholdNotification: settings.lowStockThresholdNotification ?? true,
  });

  // Keep form data in sync when settings update from backend
  React.useEffect(() => {
    setFormData({
      cafeName: settings.cafeName || '',
      branchName: settings.branchName || '',
      address: settings.address || '',
      contactNumber: settings.contactNumber || '',
      taxIdentificationNumber: settings.taxIdentificationNumber || '',
      currency: settings.currency || settings.currencySymbol || '₱',
      currencySymbol: settings.currencySymbol || settings.currency || '₱',
      receiptHeader: settings.receiptHeader || '',
      receiptFooter: settings.receiptFooter || '',
      maxStaffDiscountPercent: settings.maxStaffDiscountPercent ?? 10,
      defaultDeliveryFee: settings.defaultDeliveryFee ?? 50,
      lowStockThresholdNotification: settings.lowStockThresholdNotification ?? true,
    });
  }, [settings]);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Change PIN Form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('CASHIER');
  const [staffPin, setStaffPin] = useState('1234');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffError, setStaffError] = useState<string | null>(null);

  const handleManualSyncNow = async () => {
    setSyncStatusMsg('Syncing cached offline records...');
    const result = await syncOfflineQueue();
    if (result.syncedCount > 0) {
      setSyncStatusMsg(`Successfully synced ${result.syncedCount} queued records!`);
    } else if (result.failedCount > 0) {
      setSyncStatusMsg(`Sync completed with ${result.failedCount} failed items.`);
    } else {
      setSyncStatusMsg('Everything is already in sync with the server database.');
    }
    setTimeout(() => setSyncStatusMsg(null), 3500);
  };

  const handleClearOfflineQueue = () => {
    if (confirm('Are you sure you want to clear the offline sync queue? Any unsynced offline records will be discarded.')) {
      OfflineStorageManager.clearSyncQueue();
      setSyncStatusMsg('Offline queue cleared.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);

    const isOwner = currentUser.role === 'OWNER';
    if (!isOwner) {
      onRequireOwnerAuth({
        action: 'SETTINGS_UPDATE',
        actionTitle: 'Save Store Settings & Receipt Profile',
        itemAffected: 'System Configuration',
        oldValue: settings.cafeName,
        newValue: formData.cafeName,
        reason: 'Staff requested system settings update',
        onSuccess: async (ownerPin: string) => {
          await updateSettings(formData);
          setIsSavingSettings(false);
          setSettingsSuccessMsg('Store settings saved successfully!');
          setTimeout(() => setSettingsSuccessMsg(null), 3000);
        },
      });
      return;
    }

    await updateSettings(formData);
    setIsSavingSettings(false);
    setSettingsSuccessMsg('Store settings saved successfully!');
    setTimeout(() => setSettingsSuccessMsg(null), 3000);
  };

  const handleChangeOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await fetch('/api/settings/change-owner-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin,
          newPin,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      const data = await res.json();
      setIsChangingPin(false);

      if (data.success) {
        setPinSuccess('Owner Master Authorization PIN updated securely!');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinError(data.error || 'Failed to change PIN');
      }
    } catch (e: any) {
      setIsChangingPin(false);
      setPinError(e.message || 'Network error');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffPin) {
      setStaffError('Please enter staff name and PIN');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            name: staffName,
            role: staffRole,
            pin: staffPin,
            email: staffEmail,
          },
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsStaffModalOpen(false);
        setStaffName('');
        setStaffPin('1234');
        setStaffEmail('');
        refreshUsers();
      } else {
        setStaffError(data.error || 'Failed to create user');
      }
    } catch (e: any) {
      setStaffError(e.message || 'Network error');
    }
  };

  const handleDeleteStaff = async (userId: string, userName: string) => {
    if (confirm(`Remove staff access for ${userName}?`)) {
      await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorRole: currentUser.role,
          operatorName: currentUser.name,
          operatorId: currentUser.id,
        }),
      });
      refreshUsers();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">System Configuration & Security</h2>
        <p className="text-xs text-slate-500">
          Manage store receipts, offline caching, background auto-sync, Owner PIN, and employee access.
        </p>
      </div>

      {/* Offline Caching & Auto-Sync Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Offline Caching & Auto-Sync Engine</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isOnline ? 'Network Connected' : 'Offline Mode'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Products, recipes, and sales are automatically cached locally in your browser and will seamlessly sync in the background.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSyncNow}
              disabled={isSyncing || !isOnline}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            {pendingSyncCount > 0 && (
              <button
                onClick={handleClearOfflineQueue}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                Clear Queue
              </button>
            )}
          </div>
        </div>

        {syncStatusMsg && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] mb-0.5">Pending Offline Queue</div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>{pendingSyncCount}</span>
              <span className="text-xs font-normal text-slate-500">transactions queued</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] mb-0.5">Last Sync Timestamp</div>
            <div className="text-xs font-semibold text-slate-900 font-mono">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] mb-0.5">Background Auto-Sync</div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active (Periodic 30s + on Reconnect)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Store Profile & Thermal Receipt Info (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Store Profile & Thermal Header</h3>
              </div>
              {settingsSuccessMsg && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {settingsSuccessMsg}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Café Name:</label>
                <input
                  type="text"
                  required
                  value={formData.cafeName ?? ''}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name:</label>
                <input
                  type="text"
                  required
                  value={formData.branchName ?? ''}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address:</label>
                <input
                  type="text"
                  required
                  value={formData.address ?? ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number:</label>
                <input
                  type="text"
                  required
                  value={formData.contactNumber ?? ''}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">TIN / Registration:</label>
                <input
                  type="text"
                  value={formData.taxIdentificationNumber ?? ''}
                  onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol:</label>
                <input
                  type="text"
                  required
                  value={formData.currency ?? formData.currencySymbol ?? '₱'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Staff Disc (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={formData.maxStaffDiscountPercent ?? 10}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStaffDiscountPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Default Delivery Fee (₱):</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  value={formData.defaultDeliveryFee ?? 50}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultDeliveryFee: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thermal Receipt Footer Message:
              </label>
              <textarea
                rows={3}
                value={formData.receiptFooter ?? ''}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>

          {/* Employee & Staff Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Employee Accounts & Roles</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-amber-800 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Staff</span>
              </button>
            </div>

            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {user.email || 'No email registered'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        user.role === 'OWNER'
                          ? 'bg-purple-50 border-purple-300 text-purple-700'
                          : user.role === 'MANAGER'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      {user.role}
                    </span>

                    {user.role !== 'OWNER' && (
                      <button
                        onClick={() => handleDeleteStaff(user.id, user.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Owner Master PIN Management (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleChangeOwnerPin}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Owner Master Authorization PIN</h3>
                <p className="text-[10px] text-slate-500">Secures voids, discounts, and inventory edits.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <div className="font-bold">Security Standard:</div>
              <div>• Default PIN: <strong>9999</strong> (Change immediately in production).</div>
              <div>• PINs are securely hashed with SHA-256 and salted server-side.</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Owner PIN:</label>
              <input
                type="password"
                required
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New 4-6 Digit PIN:</label>
              <input
                type="password"
                required
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New PIN:</label>
              <input
                type="password"
                required
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono tracking-widest focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pinSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPin}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>{isChangingPin ? 'Updating...' : 'Update Owner PIN'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add Staff Account</h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name:</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role:</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Login PIN:</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional):</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="maria@cafepos.local"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {staffError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {staffError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
