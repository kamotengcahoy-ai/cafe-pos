import React, { useRef } from 'react';
import {
  Bike,
  CheckCircle2,
  Copy,
  Download,
  MapPin,
  Phone,
  Printer,
  ShoppingBag,
  Truck,
  User,
  Utensils,
  WifiOff,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.js';
import { Sale } from '../types.js';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = usePos();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const isOfflineSale = sale.receiptNumber.startsWith('OFFLINE-') || sale.id.includes('offline');

  const formattedDate = new Date(sale.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(sale.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Top Control Bar */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOfflineSale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isOfflineSale ? 'Offline Receipt (Queued for Sync)' : sale.status === 'COMPLETED' ? 'Official Sale Receipt' : `Receipt (${sale.status})`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Realistic Thermal Receipt Paper Container */}
        <div className="p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white text-slate-900 font-mono text-[11px] p-5 rounded-xl shadow-md border border-slate-200 select-text leading-tight"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5 pb-3 border-b border-dashed border-slate-300">
              <div className="text-sm font-black uppercase tracking-tight text-slate-900">{settings.cafeName}</div>
              <div className="text-[10px] text-slate-600">{settings.branchName}</div>
              <div className="text-[10px] text-slate-600 px-2">{settings.address}</div>
              <div className="text-[10px] text-slate-600">Tel: {settings.contactNumber}</div>
              <div className="text-[9px] text-slate-500 font-semibold">{settings.taxIdentificationNumber}</div>
              {isOfflineSale && (
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold">
                  <WifiOff className="w-2.5 h-2.5 text-amber-700" />
                  <span>ISSUED OFFLINE</span>
                </div>
              )}
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 space-y-0.5 border-b border-dashed border-slate-300 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>RECEIPT #:</span>
                <span>{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE / TIME:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{sale.cashierName}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span>ORDER TYPE:</span>
                <span className="font-bold uppercase flex items-center gap-1">
                  {sale.orderType === 'DELIVERY' ? (
                    <>
                      <Truck className="w-3 h-3 text-sky-600 inline" />
                      <span>Delivery ({sale.deliveryPlatform || 'Courier'})</span>
                    </>
                  ) : sale.orderType === 'TAKEOUT' ? (
                    <>
                      <ShoppingBag className="w-3 h-3 text-amber-600 inline" />
                      <span>Takeout</span>
                    </>
                  ) : (
                    <>
                      <Utensils className="w-3 h-3 text-slate-700 inline" />
                      <span>Dine-In</span>
                    </>
                  )}
                </span>
              </div>

              {sale.orderType === 'DELIVERY' && (sale.customerName || sale.deliveryAddress || sale.customerPhone) && (
                <div className="pt-1.5 mt-1 border-t border-dotted border-slate-200 text-[9px] space-y-0.5 text-slate-600">
                  {sale.customerName && (
                    <div className="flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-400" />
                      <span>Customer: <b>{sale.customerName}</b></span>
                    </div>
                  )}
                  {sale.customerPhone && (
                    <div className="flex items-center gap-1 font-mono">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      <span>Phone: {sale.customerPhone}</span>
                    </div>
                  )}
                  {sale.deliveryAddress && (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">Address: {sale.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              )}

              {sale.status !== 'COMPLETED' && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>STATUS:</span>
                  <span>{sale.status}</span>
                </div>
              )}
            </div>

            {/* Itemized Lines */}
            <div className="py-2.5 space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 pb-0.5">
                <span>QTY / ITEM</span>
                <span>AMOUNT</span>
              </div>

              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start font-medium">
                    <span className="pr-2">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-bold shrink-0">₱{item.itemTotal.toFixed(2)}</span>
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-4 text-[9px] text-slate-500">
                      {item.modifiers.map((m, mIdx) => (
                        <div key={mIdx} className="flex justify-between">
                          <span>+ {m.optionName}</span>
                          {m.priceDelta > 0 && <span>+₱{m.priceDelta.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{sale.subtotal.toFixed(2)}</span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>
                    Discount {sale.discountType ? `(${sale.discountType})` : ''}:
                  </span>
                  <span>-₱{sale.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {(sale.deliveryFee !== undefined && (sale.deliveryFee > 0 || sale.orderType === 'DELIVERY')) && (
                <div className="flex justify-between text-slate-900 font-semibold items-center">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-sky-600 inline" />
                    <span>Delivery Fee:</span>
                  </span>
                  <span>{sale.deliveryFee > 0 ? `+₱${sale.deliveryFee.toFixed(2)}` : 'FREE'}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>₱{sale.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 space-y-0.5 border-b border-dashed border-slate-300 text-[10px]">
              <div className="flex justify-between font-semibold">
                <span>PAYMENT METHOD:</span>
                <span>{sale.paymentMethod}</span>
              </div>
              {sale.paymentReference && (
                <div className="flex justify-between">
                  <span>REF NO:</span>
                  <span>{sale.paymentReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>AMOUNT TENDERED:</span>
                <span>₱{sale.amountTendered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CHANGE:</span>
                <span>₱{sale.change.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-3 text-center space-y-1 text-[9px] text-slate-600">
              <div className="whitespace-pre-line font-medium">{settings.receiptFooter}</div>
              <div className="pt-1 text-[8px] text-slate-400">
                POS System v2.6 • Offline Cache & Auto-Sync Enabled
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
