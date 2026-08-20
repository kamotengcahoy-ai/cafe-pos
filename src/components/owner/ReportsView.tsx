import React, { useState } from 'react';
import {
  Award,
  Bike,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  PieChart as PieIcon,
  ShoppingBag,
  Table,
  TrendingDown,
  TrendingUp,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePos } from '../../context/PosContext.js';

export const ReportsView: React.FC = () => {
  const { sales, expenses, products, settings } = usePos();

  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const now = new Date();
  const completedSales = sales.filter((s) => s.status === 'COMPLETED');

  const filteredSales = completedSales.filter((s) => {
    if (timeRange === 'ALL') return true;
    const saleDate = new Date(s.createdAt);
    if (timeRange === 'TODAY') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (timeRange === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= oneWeekAgo;
    }
    if (timeRange === 'MONTH') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return saleDate >= oneMonthAgo;
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (timeRange === 'ALL') return true;
    const expDate = new Date(e.date);
    if (timeRange === 'TODAY') {
      return expDate.toDateString() === now.toDateString();
    }
    if (timeRange === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return expDate >= oneWeekAgo;
    }
    if (timeRange === 'MONTH') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return expDate >= oneMonthAgo;
    }
    return true;
  });

  // Financial Calculations
  const grossSales = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
  const discountsGiven = filteredSales.reduce((acc, s) => acc + s.discountAmount, 0);
  const netSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalCOGS = filteredSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const grossProfit = netSalesRevenue - totalCOGS;
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const grossProfitMargin = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;
  const netProfitMargin = netSalesRevenue > 0 ? (netOperatingProfit / netSalesRevenue) * 100 : 0;

  // Group expenses by category
  const expenseByCategoryMap: { [cat: string]: number } = {};
  filteredExpenses.forEach((exp) => {
    expenseByCategoryMap[exp.category] = (expenseByCategoryMap[exp.category] || 0) + exp.amount;
  });

  // Payment Breakdown
  const cashTotal = filteredSales
    .filter((s) => s.paymentMethod === 'Cash')
    .reduce((acc, s) => acc + s.total, 0);
  const gcashTotal = filteredSales
    .filter((s) => s.paymentMethod === 'GCash')
    .reduce((acc, s) => acc + s.total, 0);
  const mayaTotal = filteredSales
    .filter((s) => s.paymentMethod === 'Maya')
    .reduce((acc, s) => acc + s.total, 0);
  const bankTotal = filteredSales
    .filter((s) => s.paymentMethod === 'Bank Transfer')
    .reduce((acc, s) => acc + s.total, 0);

  // Fulfillment Breakdown & Delivery Fees
  const dineInCount = filteredSales.filter((s) => !s.orderType || s.orderType === 'DINE_IN').length;
  const dineInRevenue = filteredSales
    .filter((s) => !s.orderType || s.orderType === 'DINE_IN')
    .reduce((acc, s) => acc + s.total, 0);

  const takeoutCount = filteredSales.filter((s) => s.orderType === 'TAKEOUT').length;
  const takeoutRevenue = filteredSales
    .filter((s) => s.orderType === 'TAKEOUT')
    .reduce((acc, s) => acc + s.total, 0);

  const deliveryOrders = filteredSales.filter((s) => s.orderType === 'DELIVERY');
  const deliveryCount = deliveryOrders.length;
  const deliveryRevenue = deliveryOrders.reduce((acc, s) => acc + s.total, 0);
  const totalDeliveryFeesCollected = deliveryOrders.reduce((acc, s) => acc + (s.deliveryFee || 0), 0);

  // Best Sellers Leaderboard
  const prodPerformanceMap: {
    [id: string]: { name: string; category: string; unitsSold: number; revenue: number; cogs: number };
  } = {};

  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!prodPerformanceMap[item.productId]) {
        const p = products.find((pr) => pr.id === item.productId);
        prodPerformanceMap[item.productId] = {
          name: item.productName,
          category: p?.category || 'Coffee',
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
        };
      }
      prodPerformanceMap[item.productId].unitsSold += item.quantity;
      prodPerformanceMap[item.productId].revenue += item.itemTotal;
      prodPerformanceMap[item.productId].cogs += (item.itemCost || 0) * item.quantity;
    });
  });

  const bestSellersRanked = Object.values(prodPerformanceMap).sort(
    (a, b) => b.unitsSold - a.unitsSold
  );

  // Helper for generating CSV file and triggering browser download
  const triggerCsvDownload = (filename: string, csvContent: string) => {
    // Add UTF-8 BOM so Microsoft Excel & Google Sheets correctly parse symbols like ₱ and special characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessToast(`Downloaded: ${filename}`);
    setTimeout(() => setDownloadSuccessToast(null), 4000);
    setIsExportMenuOpen(false);
  };

  const sanitizeCsvField = (field: any): string => {
    if (field === null || field === undefined) return '""';
    const stringValue = String(field);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return `"${stringValue}"`;
  };

  const getFormattedDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 1. Download Profit & Loss Financial Statement
  const handleDownloadPnL = () => {
    const storeName = settings?.storeName || 'Café POS';
    const dateStr = getFormattedDateString();
    const rangeLabel = timeRange === 'ALL' ? 'All_Time' : timeRange;

    const rows: string[][] = [
      [storeName, 'FINANCIAL STATEMENT & PROFIT LOSS (P&L) REPORT', ''],
      ['Report Period', timeRange, ''],
      ['Generated On', new Date().toLocaleString(), ''],
      ['Currency', 'PHP (₱)', ''],
      ['', '', ''],
      ['ACCOUNTING CATEGORY', 'LINE ITEM', 'AMOUNT (PHP)', '% OF NET SALES', 'NOTES & CLASSIFICATION'],
      ['REVENUE', 'Gross Sales Revenue', grossSales.toFixed(2), (netSalesRevenue > 0 ? (grossSales / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Total product sales before discounts'],
      ['REVENUE', 'Less: Customer Discounts', (-discountsGiven).toFixed(2), (netSalesRevenue > 0 ? (discountsGiven / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Senior / PWD / Student / Promos'],
      ['REVENUE', 'NET SALES REVENUE', netSalesRevenue.toFixed(2), '100.0%', 'Gross Sales minus Discounts'],
      ['', '', '', '', ''],
      ['COST OF GOODS SOLD (COGS)', 'Direct Recipe & Raw Ingredients COGS', (-totalCOGS).toFixed(2), (netSalesRevenue > 0 ? (totalCOGS / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Coffee beans, syrups, milk, cups, straws (Excludes labor/gas/rent)'],
      ['GROSS PROFIT', 'GROSS PROFIT', grossProfit.toFixed(2), grossProfitMargin.toFixed(1) + '%', 'Net Sales minus Direct Ingredient COGS'],
      ['', '', '', '', ''],
      ['OPERATING EXPENSES (OPEX)', 'Store Overhead Breakdown:', '', '', 'Operating expenses & utilities'],
    ];

    Object.entries(expenseByCategoryMap).forEach(([cat, amt]) => {
      rows.push([
        'OPEX',
        `  - ${cat}`,
        (-amt).toFixed(2),
        (netSalesRevenue > 0 ? (amt / netSalesRevenue) * 100 : 0).toFixed(1) + '%',
        `Operating expense for ${cat}`,
      ]);
    });

    rows.push(
      ['OPEX', 'TOTAL OPERATING EXPENSES (OPEX)', (-totalOperatingExpenses).toFixed(2), (netSalesRevenue > 0 ? (totalOperatingExpenses / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Sum of all store utilities, labor, rent & gas'],
      ['', '', '', '', ''],
      ['BOTTOM LINE', 'NET OPERATING PROFIT', netOperatingProfit.toFixed(2), netProfitMargin.toFixed(1) + '%', 'Gross Profit minus Total Operating Expenses'],
      ['', '', '', '', ''],
      ['PAYMENT CHANNELS', 'Cash Collections (Drawer)', cashTotal.toFixed(2), (netSalesRevenue > 0 ? (cashTotal / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Physical cash received'],
      ['PAYMENT CHANNELS', 'GCash QR Collections', gcashTotal.toFixed(2), (netSalesRevenue > 0 ? (gcashTotal / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'GCash e-wallet QR payments'],
      ['PAYMENT CHANNELS', 'Maya QR Collections', mayaTotal.toFixed(2), (netSalesRevenue > 0 ? (mayaTotal / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Maya e-wallet QR payments'],
      ['PAYMENT CHANNELS', 'Bank Transfer Collections', bankTotal.toFixed(2), (netSalesRevenue > 0 ? (bankTotal / netSalesRevenue) * 100 : 0).toFixed(1) + '%', 'Direct bank deposit transfers'],
      ['', '', '', '', ''],
      ['FULFILLMENT', 'Dine-In Sales Revenue', dineInRevenue.toFixed(2), `${dineInCount} Orders`, 'In-store dining sales'],
      ['FULFILLMENT', 'Takeout Sales Revenue', takeoutRevenue.toFixed(2), `${takeoutCount} Orders`, 'Pick-up / Takeaway orders'],
      ['FULFILLMENT', 'Delivery Sales Revenue', deliveryRevenue.toFixed(2), `${deliveryCount} Orders`, 'Delivery partner & rider orders'],
      ['FULFILLMENT', 'Delivery Fees Collected', totalDeliveryFeesCollected.toFixed(2), '', 'Total delivery surcharge collected from customers']
    );

    const csvContent = rows.map((r) => r.map(sanitizeCsvField).join(',')).join('\n');
    triggerCsvDownload(`${storeName.replace(/\s+/g, '_')}_Financial_Statement_${rangeLabel}_${dateStr}.csv`, csvContent);
  };

  // 2. Download Itemized Sales & Transactions Sheet
  const handleDownloadSalesSheet = () => {
    const storeName = settings?.storeName || 'Café POS';
    const dateStr = getFormattedDateString();
    const rangeLabel = timeRange === 'ALL' ? 'All_Time' : timeRange;

    const headers = [
      'Receipt #',
      'Date & Time',
      'Cashier',
      'Order Type',
      'Delivery Platform',
      'Customer Name',
      'Customer Phone',
      'Delivery Address',
      'Items Ordered (Summary)',
      'Subtotal (PHP)',
      'Discount (PHP)',
      'Delivery Fee (PHP)',
      'Total Amount Paid (PHP)',
      'Payment Method',
      'Status',
    ];

    const rows = filteredSales.map((s) => [
      s.receiptNumber,
      new Date(s.createdAt).toLocaleString(),
      s.cashierName,
      s.orderType || 'DINE_IN',
      s.deliveryPlatform || 'N/A',
      s.customerName || '',
      s.customerPhone || '',
      s.deliveryAddress || '',
      s.items.map((i) => `${i.quantity}x ${i.productName}${i.selectedSize ? ` (${i.selectedSize})` : ''}`).join('; '),
      s.subtotal.toFixed(2),
      s.discountAmount.toFixed(2),
      (s.deliveryFee || 0).toFixed(2),
      s.total.toFixed(2),
      s.paymentMethod,
      s.status,
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map(sanitizeCsvField).join(',')).join('\n');
    triggerCsvDownload(`${storeName.replace(/\s+/g, '_')}_Sales_Ledger_${rangeLabel}_${dateStr}.csv`, csvContent);
  };

  // 3. Download OPEX Expenses Sheet
  const handleDownloadOpexSheet = () => {
    const storeName = settings?.storeName || 'Café POS';
    const dateStr = getFormattedDateString();
    const rangeLabel = timeRange === 'ALL' ? 'All_Time' : timeRange;

    const headers = ['Date', 'Category', 'Description / Purpose', 'Receipt / OR #', 'Amount (PHP)', 'Recorded By'];

    const rows = filteredExpenses.map((exp) => [
      new Date(exp.date).toLocaleDateString(),
      exp.category,
      exp.description,
      exp.receiptNumber || 'N/A',
      exp.amount.toFixed(2),
      exp.recordedBy || exp.addedByName || 'Owner',
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map(sanitizeCsvField).join(',')).join('\n');
    triggerCsvDownload(`${storeName.replace(/\s+/g, '_')}_OPEX_Expenses_${rangeLabel}_${dateStr}.csv`, csvContent);
  };

  // 4. Download Product Profitability & Recipe Costing Sheet
  const handleDownloadProductsSheet = () => {
    const storeName = settings?.storeName || 'Café POS';
    const dateStr = getFormattedDateString();

    const headers = [
      'Rank',
      'Product Name',
      'Category',
      'Units Sold',
      'Total Sales Revenue (PHP)',
      'Direct Recipe COGS (PHP)',
      'Gross Profit (PHP)',
      'Gross Margin (%)',
      'Avg Selling Price (PHP)',
    ];

    const rows = bestSellersRanked.map((item, idx) => {
      const grossProf = item.revenue - item.cogs;
      const margin = item.revenue > 0 ? (grossProf / item.revenue) * 100 : 0;
      const avgPrice = item.unitsSold > 0 ? item.revenue / item.unitsSold : 0;
      return [
        `#${idx + 1}`,
        item.name,
        item.category,
        item.unitsSold.toString(),
        item.revenue.toFixed(2),
        item.cogs.toFixed(2),
        grossProf.toFixed(2),
        margin.toFixed(1) + '%',
        avgPrice.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows].map((r) => r.map(sanitizeCsvField).join(',')).join('\n');
    triggerCsvDownload(`${storeName.replace(/\s+/g, '_')}_Product_Profitability_${dateStr}.csv`, csvContent);
  };

  // 5. Download Master Financial Report (All-In-One Workbook CSV)
  const handleDownloadMasterWorkbook = () => {
    const storeName = settings?.storeName || 'Café POS';
    const dateStr = getFormattedDateString();
    const rangeLabel = timeRange === 'ALL' ? 'All_Time' : timeRange;

    const sections: string[] = [];

    // Section 1: P&L
    sections.push(`"${storeName} - COMPLETE MASTER FINANCIAL REPORT"`);
    sections.push(`"Generated On: ${new Date().toLocaleString()}"`);
    sections.push(`"Time Period: ${timeRange}"`);
    sections.push('""');
    sections.push('"=== 1. PROFIT & LOSS SUMMARY (PHP) ==="');
    sections.push('"Metric","Amount (PHP)","% of Net Sales"');
    sections.push(`"Gross Sales Revenue","${grossSales.toFixed(2)}","${(netSalesRevenue > 0 ? (grossSales / netSalesRevenue) * 100 : 0).toFixed(1)}%"`);
    sections.push(`"Less: Customer Discounts","-${discountsGiven.toFixed(2)}","${(netSalesRevenue > 0 ? (discountsGiven / netSalesRevenue) * 100 : 0).toFixed(1)}%"`);
    sections.push(`"NET SALES REVENUE","${netSalesRevenue.toFixed(2)}","100.0%"`);
    sections.push(`"Less: Recipe Ingredients & Packaging COGS","-${totalCOGS.toFixed(2)}","${(netSalesRevenue > 0 ? (totalCOGS / netSalesRevenue) * 100 : 0).toFixed(1)}%"`);
    sections.push(`"GROSS PROFIT","${grossProfit.toFixed(2)}","${grossProfitMargin.toFixed(1)}%"`);
    sections.push(`"Less: Operating Expenses (OPEX)","-${totalOperatingExpenses.toFixed(2)}","${(netSalesRevenue > 0 ? (totalOperatingExpenses / netSalesRevenue) * 100 : 0).toFixed(1)}%"`);
    sections.push(`"NET OPERATING PROFIT","${netOperatingProfit.toFixed(2)}","${netProfitMargin.toFixed(1)}%"`);
    sections.push('""');

    // Section 2: OPEX Breakdown
    sections.push('"=== 2. OPERATING EXPENSES (OPEX) LEDGER ==="');
    sections.push('"Date","Category","Description","Receipt / OR #","Amount (PHP)","Recorded By"');
    filteredExpenses.forEach((exp) => {
      sections.push(
        [
          new Date(exp.date).toLocaleDateString(),
          exp.category,
          exp.description,
          exp.receiptNumber || 'N/A',
          exp.amount.toFixed(2),
          exp.recordedBy || exp.addedByName || 'Owner',
        ]
          .map(sanitizeCsvField)
          .join(',')
      );
    });
    sections.push('""');

    // Section 3: Product Profitability
    sections.push('"=== 3. PRODUCT SALES & RECIPE PROFITABILITY ==="');
    sections.push('"Rank","Product Name","Category","Units Sold","Revenue (PHP)","COGS (PHP)","Gross Profit (PHP)","Margin (%)"');
    bestSellersRanked.forEach((p, idx) => {
      const grossProf = p.revenue - p.cogs;
      const margin = p.revenue > 0 ? (grossProf / p.revenue) * 100 : 0;
      sections.push(
        [`#${idx + 1}`, p.name, p.category, p.unitsSold, p.revenue.toFixed(2), p.cogs.toFixed(2), grossProf.toFixed(2), margin.toFixed(1) + '%']
          .map(sanitizeCsvField)
          .join(',')
      );
    });
    sections.push('""');

    // Section 4: Transactions
    sections.push('"=== 4. SALES TRANSACTIONS LEDGER ==="');
    sections.push('"Receipt #","Date & Time","Cashier","Order Type","Delivery Fee (PHP)","Total Paid (PHP)","Payment Method"');
    filteredSales.forEach((s) => {
      sections.push(
        [
          s.receiptNumber,
          new Date(s.createdAt).toLocaleString(),
          s.cashierName,
          s.orderType || 'DINE_IN',
          (s.deliveryFee || 0).toFixed(2),
          s.total.toFixed(2),
          s.paymentMethod,
        ]
          .map(sanitizeCsvField)
          .join(',')
      );
    });

    const csvContent = sections.join('\n');
    triggerCsvDownload(`${storeName.replace(/\s+/g, '_')}_Master_Financial_Report_${rangeLabel}_${dateStr}.csv`, csvContent);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
          <span>{downloadSuccessToast}</span>
          <button
            onClick={() => setDownloadSuccessToast(null)}
            className="ml-2 p-0.5 hover:bg-emerald-600 rounded text-emerald-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Financial Reports & Profit Statement</h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
              Excel / Sheets Ready
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Accounting analysis of gross revenue, ingredient recipe COGS, overhead expenses, and bottom-line profit.
          </p>
        </div>

        {/* Action Controls & Download Sheets Menu */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selection */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeRange === r
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {r === 'ALL' ? 'All Time' : r === 'TODAY' ? 'Today' : r === 'WEEK' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Download Sheets Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Sheets</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <div className="text-[11px] font-bold text-slate-800">Export Downloadable Sheets</div>
                    <div className="text-[10px] text-slate-400">Compatible with Google Sheets & MS Excel</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadPnL}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Profit & Loss Statement (P&L)</div>
                      <div className="text-[10px] text-slate-500">Revenue, COGS, OPEX & Net Profit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSalesSheet}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Table className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Sales & Transactions Ledger</div>
                      <div className="text-[10px] text-slate-500">Itemized receipt logs & fulfillment</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadOpexSheet}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Operating Expenses (OPEX) Sheet</div>
                      <div className="text-[10px] text-slate-500">LPG, utilities, labor & store overhead</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadProductsSheet}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Product Margin & COGS Sheet</div>
                      <div className="text-[10px] text-slate-500">Recipe cost vs selling price per item</div>
                    </div>
                  </button>

                  <div className="pt-1 border-t border-slate-100 mt-1">
                    <button
                      type="button"
                      onClick={handleDownloadMasterWorkbook}
                      className="w-full px-3 py-2 text-left bg-emerald-50/80 hover:bg-emerald-100/80 flex items-start gap-2.5 transition-colors text-emerald-950"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-900">Master Financial Report (.CSV)</div>
                        <div className="text-[10px] text-emerald-700">All 4 accounting reports combined</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Download Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={handleDownloadPnL}
          className="bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl p-3 text-left transition-all shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">P&L Statement Sheet</div>
              <div className="text-[10px] text-slate-400">Net Profit & Margins</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700" />
        </button>

        <button
          type="button"
          onClick={handleDownloadSalesSheet}
          className="bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl p-3 text-left transition-all shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Sales Transactions</div>
              <div className="text-[10px] text-slate-400">{filteredSales.length} records ready</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700" />
        </button>

        <button
          type="button"
          onClick={handleDownloadOpexSheet}
          className="bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-xl p-3 text-left transition-all shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">OPEX Overhead Sheet</div>
              <div className="text-[10px] text-slate-400">{filteredExpenses.length} expense logs</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-700" />
        </button>

        <button
          type="button"
          onClick={handleDownloadMasterWorkbook}
          className="bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-xl p-3 text-left transition-all shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">Master Report</div>
              <div className="text-[10px] text-emerald-700">All-in-one spreadsheet</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-emerald-700" />
        </button>
      </div>

      {/* P&L Statement Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Profit & Loss Summary Statement ({timeRange})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPnL}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3 text-emerald-600" />
              <span>Export P&L</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              {filteredSales.length} transaction(s)
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs space-y-0">
          {/* Gross Sales */}
          <div className="py-2.5 flex justify-between items-center text-slate-700">
            <span className="font-semibold">Gross Sales Revenue:</span>
            <span className="font-mono font-medium text-slate-900">
              ₱{grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Discounts */}
          <div className="py-2.5 flex justify-between items-center text-slate-600">
            <span>Less: Customer Discounts (Senior / PWD / Student / Promos):</span>
            <span className="font-mono text-rose-600">
              -₱{discountsGiven.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Net Sales */}
          <div className="py-3 flex justify-between items-center font-bold text-sm bg-slate-50 px-3 rounded-lg border border-slate-200">
            <span className="text-slate-800">NET SALES REVENUE:</span>
            <span className="font-mono text-amber-700">
              ₱{netSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* COGS */}
          <div className="py-2.5 flex justify-between items-center text-slate-600">
            <span>Less: Cost of Goods Sold (Raw Ingredients & Packaging COGS — excl. labor/gas):</span>
            <span className="font-mono text-rose-600">
              -₱{totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Gross Profit */}
          <div className="py-3 flex justify-between items-center font-bold text-sm bg-slate-50 px-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-800">GROSS PROFIT:</span>
              <span className="text-[11px] text-slate-500 font-normal ml-2">
                ({grossProfitMargin.toFixed(1)}% Gross Margin)
              </span>
            </div>
            <span className="font-mono text-emerald-600">
              ₱{grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="py-2.5 flex justify-between items-center text-slate-600">
            <span>Less: Store Operating Expenses (Staff Labor, LPG Gas, Electricity, Rent):</span>
            <span className="font-mono text-rose-600">
              -₱{totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* NET OPERATING PROFIT */}
          <div className="py-4 flex justify-between items-center font-black text-base bg-emerald-50 px-4 rounded-xl border border-emerald-300">
            <div>
              <span className="text-emerald-950">NET OPERATING PROFIT:</span>
              <span className="text-xs text-emerald-700 font-normal ml-2">
                ({netProfitMargin.toFixed(1)}% Net Margin)
              </span>
            </div>
            <span
              className={`font-mono text-lg sm:text-xl ${
                netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              ₱{netOperatingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Collections Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cash Register</div>
          <div className="text-lg font-black font-mono text-emerald-600 mt-2">
            ₱{cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Physical drawer bills & coins</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">GCash QR</div>
          <div className="text-lg font-black font-mono text-blue-600 mt-2">
            ₱{gcashTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">E-wallet direct transfers</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Maya QR</div>
          <div className="text-lg font-black font-mono text-purple-600 mt-2">
            ₱{mayaTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Maya merchant payments</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bank Transfer</div>
          <div className="text-lg font-black font-mono text-amber-700 mt-2">
            ₱{bankTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Online bank deposits</div>
        </div>
      </div>

      {/* Order Fulfillment & Delivery Revenue Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Fulfillment Channels & Delivery Performance ({timeRange})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 font-medium">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            <span>Delivery Fees Collected: <b>₱{totalDeliveryFeesCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Utensils className="w-4 h-4 text-slate-600" />
                <span>Dine-In Orders</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">{dineInCount} orders</span>
            </div>
            <div className="text-lg font-black font-mono text-slate-900 pt-1">
              ₱{dineInRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400">In-house dining sales</p>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Takeout Orders</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700">{takeoutCount} orders</span>
            </div>
            <div className="text-lg font-black font-mono text-amber-800 pt-1">
              ₱{takeoutRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-amber-600/80">Customer pick-up & counter takeout</p>
          </div>

          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Delivery Orders</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-700">{deliveryCount} orders</span>
            </div>
            <div className="text-lg font-black font-mono text-sky-900 pt-1">
              ₱{deliveryRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-sky-700/80">In-house riders & partner couriers</p>
          </div>
        </div>
      </div>

      {/* Best Sellers Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Product Sales & Margin Performance</h3>
          </div>
          <button
            type="button"
            onClick={handleDownloadProductsSheet}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3 text-purple-600" />
            <span>Export Product Margins</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Rank</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Units Sold</th>
                <th className="p-3.5 text-right">Total Revenue</th>
                <th className="p-3.5 text-right">
                  <div>Recipe COGS</div>
                  <div className="text-[9px] text-slate-400 font-normal lowercase">(raw materials)</div>
                </th>
                <th className="p-3.5 text-right">
                  <div>Gross Profit</div>
                  <div className="text-[9px] text-slate-400 font-normal lowercase">(excl. overhead)</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bestSellersRanked.map((item, idx) => {
                const itemProfit = item.revenue - item.cogs;
                return (
                  <tr key={item.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-amber-600">#{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{item.name}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {item.unitsSold}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-800">
                      ₱{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      ₱{item.cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600 text-sm">
                      ₱{itemProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

