import React from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  Store, 
  CheckCircle2,
  Play
} from 'lucide-react';
import { CartItem } from '../types';

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fadeIn">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            سلة المشتريات الرقمية
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جميع المنتجات الرقمية المختارة معروضة مباشرة هنا وجاهزة للدفع الفوري
          </p>
        </div>

        <button
          onClick={onContinueShopping}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Store className="w-4 h-4" />
          <span>متابعة التسوق في المتجر</span>
        </button>
      </div>

      {cartItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">سلة مشترياتك فارغة حالياً</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              تصفح متجر المنتجات الرقمية واختر ما يناسبك من قوالب، أكواد، أو تصاميم مميزة مع حماية كاملة للملفات.
            </p>
          </div>
          <button
            onClick={onContinueShopping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition"
          >
            تصفح المتجر الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Items List (Directly displayed without any toggle!) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {cartItems.map((item) => {
                  const itemSubtotal = item.product.price * item.quantity;
                  const coverImg = item.product.media?.[0]?.url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80';
                  const isVideo = item.product.media?.[0]?.type === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(coverImg);

                  return (
                    <div key={item.product.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                      {/* Product Thumbnail */}
                      {isVideo ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 bg-slate-950 relative">
                          <video
                            src={`${coverImg}#t=0.001`}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={coverImg}
                          alt={item.product.title}
                          className="w-20 h-20 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                      )}

                      {/* Info & Quantity controls */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                              {item.product.title}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              البائع: <span className="font-semibold text-slate-600 dark:text-slate-300">@{item.product.seller.username}</span>
                            </p>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition shrink-0"
                            title="حذف من السلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Calculation breakdown: (Quantity × Unit Price = Total) */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-6 text-center text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-left">
                            <span className="text-[11px] text-slate-400 block">
                              ${item.product.price} للقطعة × {item.quantity}
                            </span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              ${itemSubtotal}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Escrow Guarantee Notice Box */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-start gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  حماية المشتري مؤكدة بنسبة 100% (نظام Escrow)
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5 leading-relaxed">
                  يتم إيداع أموالك في محفظة ضمان آمنة، ولا يتسلم البائع مستحقاته إلا بعد تحميلك للملفات وتأكيد مطابقتها للمواصفات أو مرور 14 يوماً.
                </p>
              </div>
            </div>
          </div>

          {/* Right Col: Order Summary & Checkout Trigger */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                ملخص الطلب ({totalItemsCount} منتجات)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>قيمة المنتجات:</span>
                  <span className="font-semibold">${subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>رسوم التحميل الفوري:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">مجاناً $0</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ضمان الاسترجاع Escrow:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">مشمول مجاناً</span>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline font-bold">
                  <span className="text-slate-900 dark:text-white text-sm">المجموع الكلي للدفع:</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${subtotal}</span>
                </div>
              </div>

              {/* Checkout Trigger Button (Opens Multi-step Checkout) */}
              <button
                onClick={onProceedToCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
              >
                <Lock className="w-4 h-4" />
                <span>متابعة إتمام الدفع الآمن (${subtotal})</span>
              </button>

              <div className="text-center pt-1 text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>دفع مشفر 256-Bit SSL وتحقق بنكي 3D Secure</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
