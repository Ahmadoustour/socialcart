import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  Download, 
  ShieldCheck, 
  Star, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Store,
  MessageSquare,
  Play
} from 'lucide-react';
import { Order } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface PurchasesViewProps {
  orders: Order[];
  onDownloadFile: (order: Order) => void;
  onRateSeller: (order: Order) => void;
  onRequestRefund: (order: Order) => void;
  onExploreMarket: () => void;
  onOpenDirectChat?: (username: string, displayName: string, avatar: string, productTitle?: string) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  orders,
  onDownloadFile,
  onRateSeller,
  onRequestRefund,
  onExploreMarket,
  onOpenDirectChat
}) => {
  // Auto-refresh relative timestamps periodically
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            سجل المشتريات والملفات الرقمية
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تنزيل الملفات المشتراة، تفاصيل المبالغ المدفوعة، وتقييم البائعين أو طلب استرجاع الأموال
          </p>
        </div>

        <button
          onClick={onExploreMarket}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Store className="w-4 h-4" />
          <span>تصفح المتجر</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <PackageCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">لم تقم بشراء أي منتج رقمي بعد</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              اكتشف مئات القوالب البرمجية والتصاميم المعتمدة مع روابط تحميل مباشرة ومضمونة.
            </p>
          </div>
          <button
            onClick={onExploreMarket}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition"
          >
            تصفح المتجر الآن
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition hover:shadow-md"
            >
              {/* Top Row: Product + Seller + Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(order.productImage) || order.productImage.includes('assets.mixkit.co') ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 bg-slate-950 relative">
                      <video
                        src={`${order.productImage}#t=0.001`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={order.productImage}
                      alt={order.productTitle}
                      className="w-14 h-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      رقم الطلب: #{order.id} • {formatRelativeTime(order.purchasedAt, order.id)}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {order.productTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      البائع: <span className="font-bold text-slate-700 dark:text-slate-300">@{order.sellerUsername}</span> ({order.sellerDisplayName})
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="text-left shrink-0">
                  {order.status === 'refunded' ? (
                    <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                      تم استرجاع الأموال
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      مكتمل وجاهز للتحميل
                    </span>
                  )}
                </div>
              </div>

              {/* CRITICAL: Quantity and Total Paid Calculation Breakdown (Fixes user bug #3) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                
                {/* Math Breakdown */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">تفاصيل الحسبة والمبلغ الإجمالي المدفوع:</span>
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span className="bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                      الكمية المشتراة: <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{order.quantity}</span>
                    </span>
                    <span>×</span>
                    <span className="bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                      سعر النسخة الواحدة: <span className="text-slate-900 dark:text-white font-black">${order.unitPrice}</span>
                    </span>
                    <span>=</span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 font-black text-sm">
                      إجمالي ما دفعته: ${order.totalPaid}
                    </span>
                  </div>
                </div>

                {/* Escrow Status Badge */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>حماية الضمان: </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{order.escrowReleaseDate}</span>
                </div>
              </div>

              {/* Actions Row: Download + Rate Seller + Report/Refund */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  
                  {/* Download Button */}
                  <button
                    onClick={() => onDownloadFile(order)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الملف الرقمي</span>
                  </button>

                  {/* Message Seller */}
                  {onOpenDirectChat && (
                    <button
                      onClick={() => onOpenDirectChat(
                        order.sellerUsername || 'seller',
                        order.sellerDisplayName || 'البائع',
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                        order.productTitle
                      )}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>مراسلة البائع</span>
                    </button>
                  )}

                  {/* Rate Seller Button */}
                  <button
                    onClick={() => onRateSeller(order)}
                    disabled={order.hasRatedSeller}
                    className={`font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border transition ${
                      order.hasRatedSeller
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed'
                        : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${order.hasRatedSeller ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{order.hasRatedSeller ? 'تم تقييم البائع ⭐' : 'تقييم البائع'}</span>
                  </button>
                </div>

                {/* Report Scammer / Request Refund button (Fixes requirement) */}
                <button
                  onClick={() => onRequestRefund(order)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition"
                  title="إبلاغ عن بائع محتال أو طلب استرجاع الأموال من محفظة الضمان"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>إبلاغ عن بائع محتال / طلب استرجاع الأموال</span>
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
