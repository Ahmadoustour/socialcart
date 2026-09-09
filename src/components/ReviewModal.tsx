import React, { useState } from 'react';
import { X, Star, Sparkles, Check } from 'lucide-react';
import { Order } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmitReview: (orderId: string, rating: number, comment: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmitReview
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('يرجى كتابة تعليق أو تقييم لتجربتك مع هذا البائع');
      return;
    }

    onSubmitReview(order.id, rating, comment.trim());
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="font-bold text-sm">تقييم البائع والمنتج</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-2 text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">شكراً لتقييمك!</p>
            <p className="text-slate-500">تم تسجيل تقييمك وإضافته لملف البائع لمساعدة المشترين الآخرين.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block">المنتج المُقيَّم:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{order.productTitle}</p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">البائع: @{order.sellerUsername}</p>
            </div>

            {/* Interactive Stars Picker */}
            <div className="text-center py-2 space-y-1">
              <span className="block font-bold text-slate-700 dark:text-slate-300">حدد تقييمك (من 1 إلى 5 نجوم):</span>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-600 block">
                {rating === 5 ? 'ممتاز وخدمة استثنائية (5/5)' :
                 rating === 4 ? 'جيد جداً ومطابق للمواصفات (4/5)' :
                 rating === 3 ? 'متوسط ومقبول (3/5)' :
                 rating === 2 ? 'أقل من المتوقع (2/5)' : 'سيئ وغير مطابق (1/5)'}
              </span>
            </div>

            <div>
              <label className="block font-bold mb-1">اكتب رأيك بالتفصيل:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="كيف كانت جودة الملف الرقمي وسرعة تجاوب البائع؟"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>إرسال التقييم واعتماده</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
