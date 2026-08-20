import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { OwnerAuthModal } from './components/OwnerAuthModal.js';
import { ReceiptModal } from './components/ReceiptModal.js';
import { ShiftModal } from './components/ShiftModal.js';
import { PosCashierView } from './components/pos/PosCashierView.js';
import { ApprovalRequestsView } from './components/owner/ApprovalRequestsView.js';
import { AuditLogView } from './components/owner/AuditLogView.js';
import { ExpenseManagement } from './components/owner/ExpenseManagement.js';
import { InventoryManagement } from './components/owner/InventoryManagement.js';
import { OwnerDashboard } from './components/owner/OwnerDashboard.js';
import { ProductManagement } from './components/owner/ProductManagement.js';
import { PurchasesView } from './components/owner/PurchasesView.js';
import { SalesHistoryView } from './components/owner/SalesHistoryView.js';
import { ReportsView } from './components/owner/ReportsView.js';
import { SettingsView } from './components/owner/SettingsView.js';
import { ShiftsHistoryView } from './components/owner/ShiftsHistoryView.js';
import { StaffManagementView } from './components/owner/StaffManagementView.js';
import { PosProvider, usePos } from './context/PosContext.js';
import { Sale } from './types.js';

const MainAppContent: React.FC = () => {
  const { currentReceipt, setCurrentReceipt } = usePos();

  const [activeTab, setActiveTab] = useState<string>('pos');
  const [ownerAuthConfig, setOwnerAuthConfig] = useState<any>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  const handleOpenAuthModal = (config: any) => {
    setOwnerAuthConfig(config);
  };

  const handleCloseAuthModal = () => {
    setOwnerAuthConfig(null);
  };

  // Check if either a checkout completed receipt or an explicit view receipt is open
  const activeReceiptToDisplay = currentReceipt || viewingReceipt;

  const handleCloseReceiptModal = () => {
    setCurrentReceipt(null);
    setViewingReceipt(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Universal App Navigation Bar */}
      <Header
        activeTab={activeTab}
        currentTab={activeTab}
        onTabChange={setActiveTab}
        setCurrentTab={setActiveTab}
        onOpenApprovalQueue={() => setActiveTab('approvals')}
        onRequireOwnerAuth={handleOpenAuthModal}
      />

      {/* Main Tab Content Display */}
      <main className="flex-1 pb-10">
        {activeTab === 'pos' && (
          <PosCashierView onRequireOwnerAuth={handleOpenAuthModal} />
        )}

        {activeTab === 'dashboard' && (
          <OwnerDashboard
            onNavigateTab={setActiveTab}
            onOpenApprovalQueue={() => setActiveTab('approvals')}
          />
        )}

        {activeTab === 'products' && (
          <ProductManagement onRequireOwnerAuth={handleOpenAuthModal} />
        )}

        {activeTab === 'inventory' && (
          <InventoryManagement
            onRequireOwnerAuth={handleOpenAuthModal}
            onNavigateTab={setActiveTab}
          />
        )}

        {(activeTab === 'purchases' || activeTab === 'stockin') && <PurchasesView />}

        {(activeTab === 'sales' || activeTab === 'orders') && (
          <SalesHistoryView
            onViewReceipt={(s) => setViewingReceipt(s)}
            onRequireOwnerAuth={handleOpenAuthModal}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalRequestsView onRequireOwnerAuth={handleOpenAuthModal} />
        )}

        {activeTab === 'audit' && <AuditLogView />}

        {activeTab === 'expenses' && (
          <ExpenseManagement onRequireOwnerAuth={handleOpenAuthModal} />
        )}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'shifts' && <ShiftsHistoryView />}

        {activeTab === 'employees' && (
          <StaffManagementView onRequireOwnerAuth={handleOpenAuthModal} />
        )}

        {activeTab === 'settings' && (
          <SettingsView onRequireOwnerAuth={handleOpenAuthModal} />
        )}
      </main>

      {/* Floating Owner Authorization & PIN Verification Modal */}
      {ownerAuthConfig && (
        <OwnerAuthModal
          config={ownerAuthConfig}
          onClose={handleCloseAuthModal}
        />
      )}

      {/* Shift Drawer Float Open & Close Modals */}
      <ShiftModal onRequireOwnerAuth={handleOpenAuthModal} />

      {/* Realistic Thermal Receipt Print Modal */}
      {activeReceiptToDisplay && (
        <ReceiptModal
          sale={activeReceiptToDisplay}
          onClose={handleCloseReceiptModal}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <MainAppContent />
    </PosProvider>
  );
}
