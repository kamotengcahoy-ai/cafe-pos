import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Coffee,
  DollarSign,
  FileText,
  History,
  Layers,
  Lock,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { usePos } from '../context/PosContext.js';
import { UserRole } from '../types.js';

interface HeaderProps {
  currentTab?: string;
  activeTab?: string;
  setCurrentTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
  onOpenApprovalQueue?: () => void;
  onRequireOwnerAuth?: (config: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeTab,
  setCurrentTab,
  onTabChange,
  onOpenApprovalQueue,
  onRequireOwnerAuth,
}) => {
  const selectedTab = currentTab || activeTab || 'pos';
  const handleTabChange = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const handleOpenApprovals = () => {
    if (onOpenApprovalQueue) {
      onOpenApprovalQueue();
    } else {
      handleTabChange('approvals');
    }
  };
  const {
    currentUser,
    setCurrentUser,
    users,
    currentShift,
    setOpenShiftModalOpen,
    setCloseShiftModalOpen,
    pendingApprovalsCount,
    lowStockItemsCount,
    settings,
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncOfflineQueue,
  } = usePos();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleManualSync = async () => {
    const res = await syncOfflineQueue();
    if (res.syncedCount > 0) {
      setSyncToast(`Synced ${res.syncedCount} queued transactions!`);
      setTimeout(() => setSyncToast(null), 3000);
    } else if (res.failedCount > 0) {
      setSyncToast(`Failed to sync ${res.failedCount} records.`);
      setTimeout(() => setSyncToast(null), 3000);
    } else {
      setSyncToast('All data already in sync.');
      setTimeout(() => setSyncToast(null), 2500);
    }
  };

  const handleTabClick = (tabId: string, requiresOwnerOrManager: boolean = false) => {
    if (requiresOwnerOrManager && currentUser.role === 'CASHIER') {
      if (onRequireOwnerAuth) {
        onRequireOwnerAuth({
          action: 'GENERAL_OVERRIDE',
          actionTitle: `Access ${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Module`,
          itemAffected: 'Managerial & Owner Controls',
          oldValue: 'Cashier Role',
          newValue: 'Manager / Owner Access',
          reason: `Switching to ${tabId} view requiring owner authorization`,
          onSuccess: async () => {
            const owner = users.find((u) => u.role === 'OWNER') || {
              id: 'u-1',
              name: 'Alex Vance',
              username: 'alex',
              role: 'OWNER' as UserRole,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              active: true,
            };
            setCurrentUser(owner);
            handleTabChange(tabId);
          },
        });
      } else {
        const owner = users.find((u) => u.role === 'OWNER');
        if (owner) setCurrentUser(owner);
        handleTabChange(tabId);
      }
      return;
    }
    handleTabChange(tabId);
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-medium';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-medium';
    }
  };

  const isOwnerOrManager = currentUser.role === 'OWNER' || currentUser.role === 'MANAGER';
  const isOwner = currentUser.role === 'OWNER';

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs select-none">
      {/* Sync Notification Banner if needed */}
      {syncToast && (
        <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 text-center flex items-center justify-center gap-2 shadow-inner">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                {settings.cafeName}
              </h1>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                {settings.branchName}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentTime}</span>
              <span className="text-slate-300">•</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>
        </div>

        {/* Middle Stats & Alerts & Sync Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Offline / Online Auto-Sync Badge */}
          <div className="flex items-center">
            {isOnline ? (
              <button
                onClick={handleManualSync}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-xs ${
                  pendingSyncCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title={pendingSyncCount > 0 ? `${pendingSyncCount} offline sales pending sync (click to sync now)` : 'Online and fully synchronized'}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Online'}</span>
                {pendingSyncCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-bold text-[10px]">
                    {pendingSyncCount} queued
                  </span>
                )}
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold shadow-xs"
                title="Offline Mode Active: Sales & receipts cached locally, will auto-sync when connection restores."
              >
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Offline Mode</span>
                {pendingSyncCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold text-[10px]">
                    {pendingSyncCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Shift Status Button */}
          {currentShift ? (
            <button
              onClick={() => setCloseShiftModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors text-xs shadow-xs"
              title="Click to Close Shift & Reconcile Drawer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">Shift Active</span>
              <span className="text-emerald-700 font-mono hidden md:inline">
                (Exp: ₱{currentShift.expectedCash.toLocaleString()})
              </span>
            </button>
          ) : (
            <button
              onClick={() => setOpenShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors text-xs font-semibold shadow-xs"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>Open Shift Float</span>
            </button>
          )}

          {/* Low Stock Alert Badge */}
          {lowStockItemsCount > 0 && (
            <button
              onClick={() => handleTabChange('inventory')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 transition-colors text-xs shadow-xs"
              title={`${lowStockItemsCount} ingredients below reorder level`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
              <span className="font-bold">{lowStockItemsCount}</span>
              <span className="hidden sm:inline">Low Stock</span>
            </button>
          )}

          {/* Owner Approval Requests Bell */}
          <button
            onClick={handleOpenApprovals}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors shadow-xs ${
              pendingApprovalsCount > 0
                ? 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Pending Owner Approval Requests"
          >
            <Bell className={`w-3.5 h-3.5 ${pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="font-medium hidden sm:inline">Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-extrabold text-[10px] animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-900 transition-all text-xs shadow-xs"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-slate-300"
            />
            <div className="text-left">
              <div className="font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${getRoleBadge(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </button>

          {/* User selection menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Role / Cashier
              </div>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (u.role === 'OWNER' && currentUser.role !== 'OWNER') {
                      if (onRequireOwnerAuth) {
                        onRequireOwnerAuth({
                          action: 'GENERAL_OVERRIDE',
                          actionTitle: 'Switch to Owner Account',
                          itemAffected: u.name,
                          oldValue: currentUser.name,
                          newValue: u.name,
                          reason: 'Switching active terminal operator to Owner',
                          onSuccess: () => setCurrentUser(u),
                        });
                      } else {
                        setCurrentUser(u);
                      }
                    } else {
                      setCurrentUser(u);
                    }
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2.5 text-xs hover:bg-slate-50 transition-colors ${
                    u.id === currentUser.id ? 'bg-amber-50/60 font-semibold' : ''
                  }`}
                >
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={u.name}
                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-500">{u.role}</div>
                  </div>
                  {u.id === currentUser.id && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5">
        <button
          onClick={() => handleTabClick('pos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'pos'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Register</span>
        </button>

        <button
          onClick={() => handleTabClick('orders')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'orders'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Orders & History</span>
        </button>

        <button
          onClick={() => handleTabClick('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ingredients & Recipes</span>
        </button>

        <button
          onClick={() => handleTabClick('stockin')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'stockin'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock In (Purchases)</span>
        </button>

        <button
          onClick={() => handleTabClick('expenses')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'expenses'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Expenses</span>
        </button>

        <button
          onClick={() => handleTabClick('shifts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'shifts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Shift Reconciliation</span>
        </button>

        <button
          onClick={() => handleTabClick('reports', true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'reports'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Reports (P&L)</span>
          {!isOwnerOrManager && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => handleTabClick('approvals', true)}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'approvals'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Owner Approvals</span>
          {pendingApprovalsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingApprovalsCount}
            </span>
          )}
          {!isOwner && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => handleTabClick('audit', true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'audit'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log</span>
          {!isOwnerOrManager && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => handleTabClick('employees', true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'employees'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Access</span>
          {!isOwner && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
        </button>

        <button
          onClick={() => handleTabClick('settings', true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            selectedTab === 'settings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
          {!isOwner && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
        </button>
      </nav>
    </header>
  );
};
