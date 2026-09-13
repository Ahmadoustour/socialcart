import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'product' | 'order';
  targetId: string;
  targetTitle: string;
  onSubmitReport: (data: {
    targetType: string;
    targetId: string;
    reason: string;
    details: string;
    requestRefund: boolean;
  }) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSubmitReport
}) => {
  const [reason, setReason] = useState('شبهة بائع محتال أو منتج غير حقيقي');
  const [details, setDetails] = useState('');
  const [requestRefund, setRequestRefund] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const REASONS = [
    'شبهة بائع محتال أو منتج غير حقيقي',
    'الملف الرقمي لا يعمل أو تالف بعد التحميل',
    'المنتج لا يطابق الوصف والصور المعروضة',
    'روابط مشبوهة أو اختراق محتمل',
    'محتوى ينتهك حقوق الملكية الفكرية',
    'سبب آخر'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      alert('يرجى توضيح سبب الإبلاغ أو تفاصيل طلب الاسترجاع لمراجعة فريق الأمان');
      return;
    }

    onSubmitReport({
      targetType,
      targetId,
      reason,
      details: details.trim(),
      requestRefund
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 my-auto mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-sm">
              {targetType === 'order' ? 'طلب استرجاع الأموال والنزاع (Escrow)' : 'إبلاغ عن شبهة احتيال / بائع'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-3 text-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              تم استلام البلاغ وتجميد المعاملة بنجاح!
            </h4>
            <p className="text-slate-500 leading-relaxed max-w-sm mx-auto">
              بموجب نظام حماية الضمان Escrow، تم تعليق أي مدفوعات تخص هذا البائع وسيقوم فريق الأمان بالتحقق ورد المبلغ لمحفظتك أو بطاقتك فوراً.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block">العنصر محل البلاغ:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{targetTitle}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                سبب الإبلاغ الرئيسي:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none font-bold"
              >
                {REASONS.map((r, idx) => (
                  <option key={idx} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اشرح المشكلة بالتفصيل (لجنة فض النزاعات):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="اذكر ما حدث بالتفصيل (مثل: الملف ناقص، لا يفتح، البائع لم يرد...)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {targetType === 'order' && (
              <label className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestRefund}
                  onChange={(e) => setRequestRefund(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="font-bold text-emerald-800 dark:text-emerald-200">
                  أطالب باسترجاع كامل المبلغ من محفظة الضمان (Escrow Refund)
                </span>
              </label>
            )}

            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                نظام الأمان الصارم: تكرار البلاغات المؤكدة ضد أي بائع يؤدي إلى حظر حسابه نهائياً وتجميد أرباحه وحماية كافة المشترين.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-md transition"
            >
              إرسال البلاغ وتفعيل حماية الضمان
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
