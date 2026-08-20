import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePos } from '../../context/PosContext.js';

interface OwnerDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenApprovalQueue: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onNavigateTab,
  onOpenApprovalQueue,
}) => {
  const { sales, expenses, ingredients, products, pendingApprovalsCount, currentShift } = usePos();

  const completedSales = sales.filter((s) => s.status === 'COMPLETED');
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = completedSales.filter((s) => s.createdAt.startsWith(todayStr));
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));

  const todayGross = todaySales.reduce((acc, s) => acc + s.subtotal, 0);
  const todayDiscounts = todaySales.reduce((acc, s) => acc + s.discountAmount, 0);
  const todayNetSales = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todayCOGS = todaySales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const todayGrossProfit = todayNetSales - todayCOGS;
  const todayExpenseTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpenseTotal;
  const avgOrderValue = todaySales.length > 0 ? todayNetSales / todaySales.length : 0;

  // Best Sellers ranking
  const productCountMap: { [prodId: string]: { name: string; quantity: number; revenue: number } } = {};
  completedSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productCountMap[item.productId]) {
        productCountMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productCountMap[item.productId].quantity += item.quantity;
      productCountMap[item.productId].revenue += item.itemTotal;
    });
  });

  const bestSellers = Object.values(productCountMap).sort((a, b) => b.quantity - a.quantity);
  const topProduct = bestSellers[0];

  // Low stock alert items
  const lowStockItems = ingredients.filter((i) => i.currentStock <= i.reorderLevel);

  // Hourly / Recent Sales Data for chart
  const paymentBreakdownData = [
    {
      name: 'Cash',
      value: todaySales.filter((s) => s.paymentMethod === 'Cash').reduce((a, b) => a + b.total, 0),
      color: '#10b981',
    },
    {
      name: 'GCash',
      value: todaySales.filter((s) => s.paymentMethod === 'GCash').reduce((a, b) => a + b.total, 0),
      color: '#3b82f6',
    },
    {
      name: 'Maya',
      value: todaySales.filter((s) => s.paymentMethod === 'Maya').reduce((a, b) => a + b.total, 0),
      color: '#8b5cf6',
    },
    {
      name: 'Bank',
      value: todaySales.filter((s) => s.paymentMethod === 'Bank Transfer').reduce((a, b) => a + b.total, 0),
      color: '#f59e0b',
    },
  ].filter((d) => d.value > 0);

  // Best Seller Bar Chart data
  const bestSellerChartData = bestSellers.slice(0, 5).map((p) => ({
    name: p.name.length > 14 ? p.name.substring(0, 12) + '...' : p.name,
    sold: p.quantity,
    revenue: p.revenue,
  }));

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Banner Notice for Pending Approvals */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {pendingApprovalsCount} Owner Authorization Request{pendingApprovalsCount > 1 ? 's' : ''} Pending
              </h3>
              <p className="text-xs text-amber-800">
                Staff members have submitted restricted actions (e.g. price change, void sale, or inventory adjustment) requiring your approval.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenApprovalQueue}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 whitespace-nowrap"
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Main KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Net Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              ₱{todayNetSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-700 font-medium">₱{todayGross.toFixed(0)} Gross</span>
              {todayDiscounts > 0 && <span className="text-rose-600">(-₱{todayDiscounts} disc)</span>}
            </div>
          </div>
        </div>

        {/* Orders & Avg Ticket */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders / Tickets</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {todaySales.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Avg Order: <span className="font-mono font-semibold text-amber-600">₱{avgOrderValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Net Profit</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
              ₱{todayNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Raw COGS: ₱{todayCOGS.toFixed(0)} • OPEX: ₱{todayExpenseTotal.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Top Best Seller */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Best Seller</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">
              {topProduct ? topProduct.name : 'No sales yet'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {topProduct ? `${topProduct.quantity} cups sold (₱${topProduct.revenue.toLocaleString()})` : 'Start shift to sell'}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts & Low Stock Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Best Sellers Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top 5 Best-Selling Products</h3>
              <p className="text-xs text-slate-500">Total units sold from completed transactions</p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
            >
              <span>Full Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {bestSellerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} sold`, 'Volume']}
                  />
                  <Bar dataKey="sold" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No transaction data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Today's Payment Channels</h3>
            <p className="text-xs text-slate-500 mb-4">Cash vs E-Wallet Collections</p>

            <div className="h-44 w-full flex items-center justify-center">
              {paymentBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {paymentBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400">No payment data recorded today</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {paymentBreakdownData.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-600">{p.name}:</span>
                </div>
                <span className="font-mono font-bold text-slate-900">₱{p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Stock Ingredient Alert Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-sm font-bold text-slate-900">Inventory Reorder Alerts</h3>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
            >
              Manage Inventory →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All ingredient inventory levels are healthy and above reorder thresholds.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 font-bold">
                      !
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Category: {item.category} • Cost: ₱{item.costPerUnit}/{item.unit}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold font-mono text-rose-600">
                      {item.currentStock} {item.unit} left
                    </div>
                    <div className="text-[10px] text-slate-400">Reorder at: {item.reorderLevel} {item.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Shift Status & System Shortcuts (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Cash Drawer & Active Shift</h3>

          {currentShift ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cashier on Duty:</span>
                <span className="font-bold text-slate-900">{currentShift.cashierName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Beginning Cash Float:</span>
                <span className="font-mono text-slate-700">₱{currentShift.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Sales Registered:</span>
                <span className="font-mono text-emerald-600 font-bold">
                  ₱{currentShift.totalSales.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                <span className="text-amber-800">Expected Physical Cash:</span>
                <span className="font-mono text-amber-700 text-sm">
                  ₱{currentShift.expectedCash.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <Clock className="w-6 h-6 mx-auto text-amber-500 opacity-80" />
              <div>No open shift is currently active on the register.</div>
            </div>
          )}

          <div className="pt-1 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab('purchases')}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold text-center transition-colors"
            >
              + Stock In / Purchase
            </button>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold text-center transition-colors"
            >
              + Record Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
