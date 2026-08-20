import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Bike,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  CreditCard,
  Edit3,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
  Percent,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  User,
  Utensils,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { CartItemModifier, DeliveryPlatform, OrderType, PaymentMethod, Product } from '../../types.js';

interface PosCashierViewProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const PosCashierView: React.FC<PosCashierViewProps> = ({ onRequireOwnerAuth }) => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    discountType,
    setDiscountType,
    customDiscountPercent,
    setCustomDiscountPercent,
    discountAmount,
    orderType,
    setOrderType,
    deliveryFee,
    setDeliveryFee,
    deliveryPlatform,
    setDeliveryPlatform,
    deliveryCustomerName,
    setDeliveryCustomerName,
    deliveryCustomerPhone,
    setDeliveryCustomerPhone,
    deliveryAddress,
    setDeliveryAddress,
    cartTotal,
    processCheckout,
    settings,
    currentUser,
    currentShift,
    setOpenShiftModalOpen,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDeliveryDetailsExpanded, setIsDeliveryDetailsExpanded] = useState<boolean>(true);

  // Selected product for modifier popup modal
  const [selectedProductForMod, setSelectedProductForMod] = useState<Product | null>(null);
  const [tempSelectedModifiers, setTempSelectedModifiers] = useState<CartItemModifier[]>([]);
  const [tempNotes, setTempNotes] = useState<string>('');

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountTenderedInput, setAmountTenderedInput] = useState<string>('');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const categories = [
    'ALL',
    'Coffee',
    'Non-Coffee',
    'Waffles',
    'Sandwiches',
    'Rice Meals',
    'Snacks',
    'Desserts',
    'Add-ons',
  ];

  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (product.status === 'OUT_OF_STOCK' || product.status === 'UNAVAILABLE') {
      return;
    }

    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setSelectedProductForMod(product);
      setTempSelectedModifiers([]);
      setTempNotes('');
    } else {
      addToCart(product);
    }
  };

  const handleModifierToggle = (group: any, option: any) => {
    const exists = tempSelectedModifiers.find((m) => m.groupId === group.id && m.optionId === option.id);
    if (exists) {
      setTempSelectedModifiers(tempSelectedModifiers.filter((m) => !(m.groupId === group.id && m.optionId === option.id)));
    } else {
      // If group is single-choice, replace other in group
      const filtered = tempSelectedModifiers.filter((m) => m.groupId !== group.id);
      setTempSelectedModifiers([
        ...filtered,
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        },
      ]);
    }
  };

  const handleConfirmModifiers = () => {
    if (selectedProductForMod) {
      addToCart(selectedProductForMod, tempSelectedModifiers, tempNotes);
      setSelectedProductForMod(null);
      setTempSelectedModifiers([]);
      setTempNotes('');
    }
  };

  // Discount Handling
  const handleDiscountChange = (type: 'NONE' | 'SENIOR_PWD' | 'STUDENT' | 'CUSTOM' | 'PROMO') => {
    if (type === 'CUSTOM') {
      const input = prompt('Enter custom discount percentage (%):', '15');
      if (input !== null) {
        const percent = Number(input);
        if (isNaN(percent) || percent <= 0 || percent > 100) return;

        // If discount exceeds maxStaffDiscountPercent (e.g. 10%) and user is Cashier, require owner approval!
        if (percent > settings.maxStaffDiscountPercent && currentUser.role === 'CASHIER') {
          onRequireOwnerAuth({
            action: 'DISCOUNT_LIMIT',
            actionTitle: `Authorize ${percent}% Custom Discount`,
            itemAffected: `Order Total: ₱${cartSubtotal}`,
            oldValue: 'Staff Limit (10%)',
            newValue: `${percent}% Discount (-₱${Math.round((cartSubtotal * percent) / 100)})`,
            reason: `Customer requested special promo/management discount of ${percent}%`,
            onSuccess: () => {
              setDiscountType('CUSTOM');
              setCustomDiscountPercent(percent);
            },
          });
          return;
        }

        setDiscountType('CUSTOM');
        setCustomDiscountPercent(percent);
      }
    } else {
      setDiscountType(type);
    }
  };

  // Amount calculation
  const numericTendered =
    paymentMethod === 'Cash'
      ? amountTenderedInput === ''
        ? cartTotal
        : Number(amountTenderedInput)
      : cartTotal;

  const changeAmount = Math.max(0, numericTendered - cartTotal);

  const handleQuickCash = (amt: number) => {
    setAmountTenderedInput(String(amt));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (numericTendered < cartTotal) {
      setCheckoutError(`Amount tendered is less than total.`);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    const result = await processCheckout(paymentMethod, numericTendered, paymentRefInput);
    setIsCheckingOut(false);

    if (result.success) {
      setAmountTenderedInput('');
      setPaymentRefInput('');
    } else {
      setCheckoutError(result.error || 'Checkout failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      {/* LEFT COLUMN: Products & Categories Grid (7 cols on lg, 8 cols on xl) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Search & Category Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coffee, waffles, snacks, drinks..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!currentShift && (
              <button
                onClick={() => setOpenShiftModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold whitespace-nowrap"
              >
                <Banknote className="w-3.5 h-3.5 text-amber-600" />
                <span>Open Drawer Float</span>
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid with robust card sizing and image/badge previews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5 pb-8">
          {filteredProducts.map((product) => {
            const isAvailable = product.status === 'AVAILABLE';

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductClick(product)}
                disabled={!isAvailable}
                className={`group relative text-left bg-white border rounded-2xl p-3.5 transition-all flex flex-col justify-between select-none shadow-xs h-full min-h-[145px] ${
                  isAvailable
                    ? 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 hover:shadow-xs active:scale-[0.99] cursor-pointer'
                    : 'opacity-55 cursor-not-allowed bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-2 w-full">
                  {/* Top Bar: Category Pill & Availability status / Customizable badge */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap min-w-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200 truncate max-w-[130px]">
                      {product.category}
                    </span>
                    {!isAvailable ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                        {product.status.replace(/_/g, ' ')}
                      </span>
                    ) : product.modifierGroups && product.modifierGroups.length > 0 ? (
                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                        Customizable
                      </span>
                    ) : null}
                  </div>

                  {/* Product Title and Description */}
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-amber-900 transition-colors break-words">
                      {product.name}
                    </h3>

                    {product.description ? (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed break-words">
                        {product.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No description</p>
                    )}
                  </div>
                </div>

                {/* Price & Add Button Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 w-full shrink-0">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-base sm:text-lg font-black font-mono text-amber-700 shrink-0">
                      ₱{product.sellingPrice.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans truncate">/ serving</span>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-amber-600 text-slate-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Order Cart & Checkout (5 cols on lg, 4 cols on xl) */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-fit sticky top-20 overflow-hidden">
        {/* Cart Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Current Order</h2>
              <p className="text-[10px] text-slate-500">{cart.length} distinct item(s)</p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Order Fulfillment Selector (Dine-in or Deliver with Takeout option) */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-100/90 border-b border-slate-200">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Order Fulfillment Mode</span>
            </span>
            <span className="text-[10px] font-semibold text-amber-700 font-mono">
              {orderType === 'DELIVERY' ? `Delivery (+₱${deliveryFee.toFixed(2)})` : orderType === 'TAKEOUT' ? 'Takeout' : 'Dine In'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setOrderType('DINE_IN')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                orderType === 'DINE_IN'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-1 ring-amber-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Dine In</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('DELIVERY')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                orderType === 'DELIVERY'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-1 ring-sky-500'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Deliver</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('TAKEOUT')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                orderType === 'TAKEOUT'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-sm ring-1 ring-amber-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Takeout</span>
            </button>
          </div>
        </div>

        {/* Dedicated Delivery Fee & Partner Setup Panel (when Delivery is chosen) */}
        {orderType === 'DELIVERY' && (
          <div className="p-3 bg-sky-50/60 border-b border-sky-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Delivery Partner & Fees</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryDetailsExpanded(!isDeliveryDetailsExpanded)}
                className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-0.5"
              >
                <span>{isDeliveryDetailsExpanded ? 'Hide Info' : 'Edit Info'}</span>
                {isDeliveryDetailsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Courier / Platform Chips with Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('IN_HOUSE');
                  if (deliveryFee === 0 || deliveryFee === 60 || deliveryFee === 80) setDeliveryFee(50);
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'IN_HOUSE'
                    ? 'bg-white text-sky-900 border-sky-500 shadow-xs ring-1 ring-sky-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <Bike className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">In-House (₱50)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('GRAB');
                  if (deliveryFee === 0 || deliveryFee === 50 || deliveryFee === 80) setDeliveryFee(60);
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'GRAB'
                    ? 'bg-white text-emerald-900 border-emerald-500 shadow-xs ring-1 ring-emerald-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">GrabFood (₱60)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('FOODPANDA');
                  if (deliveryFee === 0 || deliveryFee === 50 || deliveryFee === 80) setDeliveryFee(60);
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'FOODPANDA'
                    ? 'bg-white text-pink-900 border-pink-500 shadow-xs ring-1 ring-pink-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-pink-600 shrink-0" />
                <span className="truncate">Foodpanda (₱60)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('LALAMOVE');
                  if (deliveryFee === 0 || deliveryFee === 50 || deliveryFee === 60) setDeliveryFee(80);
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'LALAMOVE'
                    ? 'bg-white text-orange-900 border-orange-500 shadow-xs ring-1 ring-orange-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <PackageCheck className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="truncate">Lalamove (₱80)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('OTHER');
                  setDeliveryFee(0);
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'OTHER' && deliveryFee === 0
                    ? 'bg-white text-purple-900 border-purple-500 shadow-xs ring-1 ring-purple-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Free (₱0)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryPlatform('OTHER');
                }}
                className={`p-2 rounded-xl border text-[11px] font-medium flex flex-col items-center justify-center gap-1 transition-all ${
                  deliveryPlatform === 'OTHER' && deliveryFee > 0
                    ? 'bg-white text-sky-900 border-sky-500 shadow-xs ring-1 ring-sky-400 font-bold'
                    : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <Edit3 className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">Custom</span>
              </button>
            </div>

            {/* Delivery Fee Amount Controls */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-sky-100">
              <div className="text-[11px] font-semibold text-sky-900 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
                <span>Delivery Fee (₱):</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 px-2 py-1 bg-white border border-sky-300 rounded-lg text-right font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Quick Fee Presets */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[9px] text-sky-700 font-medium shrink-0">Presets:</span>
              {[0, 30, 50, 60, 80, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDeliveryFee(preset)}
                  className={`px-1.5 py-0.5 rounded border font-mono transition-colors ${
                    deliveryFee === preset
                      ? 'bg-sky-600 text-white border-sky-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset === 0 ? 'Free' : `₱${preset}`}
                </button>
              ))}
            </div>

            {/* Expanded Customer / Address Input Fields */}
            {isDeliveryDetailsExpanded && (
              <div className="pt-2 space-y-1.5 border-t border-sky-100">
                <div className="relative">
                  <User className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={deliveryCustomerName}
                    onChange={(e) => setDeliveryCustomerName(e.target.value)}
                    placeholder="Customer Name (e.g. Maria Santos)"
                    className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={deliveryCustomerPhone}
                    onChange={(e) => setDeliveryCustomerPhone(e.target.value)}
                    placeholder="Mobile / Phone (e.g. 0917-123-4567)"
                    className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="relative">
                  <MapPin className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Delivery Address / Drop-off location..."
                    className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart Items List */}
        <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto max-h-[220px] divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-slate-400">
              <Coffee className="w-8 h-8 mx-auto opacity-40 animate-pulse text-slate-400" />
              <p className="text-xs font-medium text-slate-600">Cart is empty</p>
              <p className="text-[10px]">Tap products on the menu to add to order.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs">
                <div className="flex-1 pr-1">
                  <div className="font-semibold text-slate-900">{item.productName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">₱{item.unitPrice.toFixed(2)} each</div>

                  {/* Modifiers display */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-[10px] text-amber-700 pl-1 mt-0.5 space-y-0.5 font-medium">
                      {item.modifiers.map((m, idx) => (
                        <div key={idx}>
                          • {m.optionName} {m.priceDelta > 0 ? `(+₱${m.priceDelta})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity Controls & Item Total */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-bold font-mono text-slate-900">₱{item.itemTotal.toFixed(2)}</span>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg border border-slate-200 p-0.5">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-slate-800 font-mono text-[11px]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Discount Section */}
        {cart.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Subtotal & Discount Selection */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">₱{cartSubtotal.toFixed(2)}</span>
              </div>

              {/* Discount Buttons */}
              <div className="pt-1">
                <div className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-amber-600" />
                  <span>Apply Discount:</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => handleDiscountChange('NONE')}
                    className={`py-1 text-[10px] rounded-lg border font-medium ${
                      discountType === 'NONE'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountChange('SENIOR_PWD')}
                    className={`py-1 text-[10px] rounded-lg border font-medium ${
                      discountType === 'SENIOR_PWD'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Senior (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountChange('STUDENT')}
                    className={`py-1 text-[10px] rounded-lg border font-medium ${
                      discountType === 'STUDENT'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Student (10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountChange('CUSTOM')}
                    className={`py-1 text-[10px] rounded-lg border font-medium ${
                      discountType === 'CUSTOM'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Custom %
                  </button>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-medium pt-1">
                  <span>
                    Discount ({discountType === 'CUSTOM' ? `${customDiscountPercent}%` : discountType}):
                  </span>
                  <span className="font-mono font-bold">-₱{discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Delivery Fee with Icon line item */}
              {orderType === 'DELIVERY' && (
                <div className="flex justify-between items-center text-sky-800 bg-sky-100/60 px-2 py-1 rounded-lg border border-sky-200/80 font-medium text-[11px] pt-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Delivery Fee ({deliveryPlatform === 'IN_HOUSE' ? 'In-House' : deliveryPlatform === 'GRAB' ? 'GrabFood' : deliveryPlatform === 'FOODPANDA' ? 'Foodpanda' : deliveryPlatform === 'LALAMOVE' ? 'Lalamove' : 'Courier'}):</span>
                  </span>
                  <span className="font-mono font-bold text-sky-900">
                    {deliveryFee > 0 ? `+₱${deliveryFee.toFixed(2)}` : 'FREE'}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base font-black font-mono text-amber-600">
                  ₱{cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Payment Method:
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['Cash', 'GCash', 'Maya', 'Bank Transfer'] as PaymentMethod[]).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm);
                      if (pm !== 'Cash') setAmountTenderedInput(String(cartTotal));
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      paymentMethod === pm
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tendered & Quick Cash Presets */}
            {paymentMethod === 'Cash' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Cash Tendered (₱):
                  </label>
                  <input
                    type="number"
                    min={cartTotal}
                    value={amountTenderedInput}
                    onChange={(e) => setAmountTenderedInput(e.target.value)}
                    placeholder={String(cartTotal)}
                    className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(cartTotal)}
                    className="py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-mono font-semibold"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(Math.ceil(cartTotal / 100) * 100)}
                    className="py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-mono font-semibold"
                  >
                    ₱{Math.ceil(cartTotal / 100) * 100}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(500)}
                    className="py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-mono font-semibold"
                  >
                    ₱500
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(1000)}
                    className="py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-mono font-semibold"
                  >
                    ₱1,000
                  </button>
                </div>

                {/* Change Display */}
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <span>Change to Customer:</span>
                  <span className="font-mono text-emerald-700 text-sm font-black">
                    ₱{changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">
                  {paymentMethod} Reference Number:
                </label>
                <input
                  type="text"
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder="e.g. GC-9821034 or Transaction ID"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {checkoutError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Giant Complete Checkout Button */}
            <button
              type="button"
              disabled={isCheckingOut || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-extrabold text-sm sm:text-base transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>{isCheckingOut ? 'Processing...' : `COMPLETE SALE (₱${cartTotal.toFixed(2)})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modifier Selection Modal */}
      {selectedProductForMod && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                    {selectedProductForMod.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{selectedProductForMod.name}</h3>
                </div>
                {selectedProductForMod.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedProductForMod.description}</p>
                )}
                <p className="text-xs font-mono text-amber-700 font-bold mt-1">
                  Base Price: ₱{selectedProductForMod.sellingPrice.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForMod(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {selectedProductForMod.modifierGroups?.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{group.name}</span>
                    {group.required && <span className="text-[10px] text-amber-600 font-medium">*Required</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.options.map((opt) => {
                      const isSelected = tempSelectedModifiers.some(
                        (m) => m.groupId === group.id && m.optionId === opt.id
                      );
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleModifierToggle(group, opt)}
                          className={`p-2 rounded-xl text-xs text-left border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate pr-1">{opt.name}</span>
                          {opt.priceDelta > 0 && (
                            <span className="font-mono text-[11px] text-amber-700 font-bold shrink-0">+₱{opt.priceDelta}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Special Notes / Request:
                </label>
                <input
                  type="text"
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="e.g. Less ice, extra hot"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProductForMod(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModifiers}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
