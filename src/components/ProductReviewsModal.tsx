import React from 'react';
import { X, Star, BadgeCheck, ShieldCheck, MessageSquare } from 'lucide-react';
import { Product } from '../types';

interface ProductReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onOpenDirectChat?: (username: string, displayName: string, avatar: string, productTitle?: string) => void;
}

export const ProductReviewsModal: React.FC<ProductReviewsModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenDirectChat
}) => {
  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-slate-100 max-h-[85vh] overflow-y-auto my-auto mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>تقييمات وآراء العملاء للبائع</span>
            </h3>
            <span className="text-[11px] text-slate-400">@{product.seller.username} • {product.seller.displayName}</span>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Summary */}
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/80 rounded-2xl flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 block leading-none">
                {product.seller.rating}
              </span>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                معدل رضا ممتاز للمشترين
              </span>
              <span className="text-[11px] text-slate-500">مبني على {product.seller.reviewsCount} تقييماً معتمداً</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            <span>موثوق بنسبة {product.seller.trustScore}%</span>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-3 text-xs">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((rev) => (
              <div 
                key={rev.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={rev.buyerAvatar}
                      alt={rev.buyerUsername}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        @{rev.buyerUsername}
                      </span>
                      <span className="text-[10px] text-slate-400">{rev.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed pt-1">
                  "{rev.comment}"
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 py-6">لا توجد مراجعات مكتوبة بعد لهذا المنتج.</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 mt-5">
          {onOpenDirectChat && (
            <button
              onClick={() => {
                onClose();
                onOpenDirectChat(
                  product.seller.username,
                  product.seller.displayName,
                  product.seller.avatar,
                  product.title
                );
              }}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>الاستفسار من البائع قبل الشراء</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition text-slate-700 dark:text-slate-200"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
