import React from 'react';
import { X, Star, BadgeCheck, ShieldCheck, MessageSquare, Trash2 } from 'lucide-react';
import { Product, User } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface ProductReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onOpenDirectChat?: (username: string, displayName: string, avatar: string, productTitle?: string) => void;
  currentUser?: User;
  onDeleteReview?: (productId: string, reviewId: string) => void;
}

export const ProductReviewsModal: React.FC<ProductReviewsModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenDirectChat,
  currentUser,
  onDeleteReview
}) => {
  if (!isOpen || !product) return null;

  const reviews = product.reviews || [];
  const reviewsCount = reviews.length;
  const avgRating = reviewsCount > 0
    ? Number((reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviewsCount).toFixed(1))
    : 0;

  const getSatisfactionLabel = (score: number) => {
    if (score >= 4.5) return 'معدل رضا ممتاز للمشترين';
    if (score >= 3.8) return 'معدل رضا جيد جداً للمشترين';
    if (score >= 2.8) return 'معدل رضا مقبول';
    return 'تقييمات متباينة';
  };

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
        {reviewsCount === 0 ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-slate-300 dark:text-slate-500" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  منتج جديد — لا توجد تقييمات حتى الآن
                </span>
                <span className="text-[11px] text-slate-500">
                  لم يقم أي مشترٍ بتقييم هذا المنتج بعد. كن أول من يشتريه ويضع مراجعته!
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>ضمان 14 يوماً</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/80 rounded-2xl flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400 block leading-none">
                  {avgRating}
                </span>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={`w-3 h-3 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {getSatisfactionLabel(avgRating)}
                </span>
                <span className="text-[11px] text-slate-500">مبني على {reviewsCount} تقييماً معتمداً</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>موثوق ومحمي بالضمان</span>
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-3 text-xs">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((rev) => {
              const canDeleteReview = currentUser && currentUser.id !== 'guest' && (
                (rev.buyerUsername && currentUser.username && rev.buyerUsername.toLowerCase() === currentUser.username.toLowerCase()) ||
                (product.seller && product.seller.username && currentUser.username && product.seller.username.toLowerCase() === currentUser.username.toLowerCase()) ||
                (product.sellerId && currentUser.id && product.sellerId === currentUser.id)
              );

              return (
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
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(rev.date, rev.id)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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

                      {canDeleteReview && onDeleteReview && (
                        <button
                          type="button"
                          onClick={() => onDeleteReview(product.id, rev.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md transition"
                          title="حذف هذا التقييم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed pt-1">
                    "{rev.comment}"
                  </p>
                </div>
              );
            })
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
