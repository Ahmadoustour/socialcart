import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  KeyRound, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { CartItem, Product, User } from '../types';
import { validateCreditCardNumber, validateCardExpiry, validateCardCVV, formatCardNumber } from '../utils/security';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentUser: User;
  onCheckoutComplete: (ordersData: {
    items: CartItem[];
    totalPaid: number;
    paymentMethod: string;
  }) => void;
  onUpdateProfile?: (updated: Partial<User>) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  onCheckoutComplete,
  onUpdateProfile
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [paymentChoice, setPaymentChoice] = useState<'saved' | 'new'>(currentUser.savedCard ? 'saved' : 'new');

  // New card fields if chosen
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardHolder, setNewCardHolder] = useState(currentUser.displayName.toUpperCase());
  const [newExpiry, setNewExpiry] = useState('');
  const [newCvv, setNewCvv] = useState('');
  const [saveCardToProfile, setSaveCardToProfile] = useState(true);
  const [cardError, setCardError] = useState<string | null>(null);

  // 3D-Secure SMS/OTP confirmation code
  const [otpCode, setOtpCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Bank testing simulation: Insufficient funds check
  const [simulateInsufficientFunds, setSimulateInsufficientFunds] = useState(false);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Step 1 to Step 2
  const handleProceedToPayment = () => {
    setStep(2);
  };

  // Step 2 to Step 3 (Validate payment and initiate 3D Secure)
  const handleProceedTo3DSecure = () => {
    setCardError(null);

    if (paymentChoice === 'new') {
      const cardCheck = validateCreditCardNumber(newCardNumber);
      if (!cardCheck.isValid) {
        setCardError('رقم البطاقة غير صحيح (فشل خوارزمية Luhn المصرفية).');
        return;
      }
      if (!validateCardExpiry(newExpiry)) {
        setCardError('تاريخ انتهاء صلاحية البطاقة غير صالح (MM/YY).');
        return;
      }
      if (!validateCardCVV(newCvv)) {
        setCardError('رمز الأمان CVV يجب أن يكون 3 أو 4 أرقام.');
        return;
      }
    }

    // Move to 3D Secure simulation step! (This fulfills user's explicit request: "التأكد عندما يتم عملية الشراء بشكل كامل يتم الشراء وليس فقط ضغطة زر")
    setStep(3);
  };

  // Step 3 to Step 4 (Confirm OTP and execute purchase via Stripe Gateway)
  const handleConfirm3DSecure = async () => {
    if (otpCode.length < 4) {
      alert('يرجى إدخال رمز التحقق المصرفي المكون من 6 أرقام (أو اكتب 1234)');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payment/verify-and-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          cardNumber: paymentChoice === 'saved' ? '4242424242424242' : newCardNumber,
          expiry: paymentChoice === 'saved' ? '12/28' : newExpiry,
          cvv: paymentChoice === 'saved' ? '123' : newCvv,
          customerEmail: currentUser.email,
          simulateDeclined: simulateInsufficientFunds || (newCardNumber && newCardNumber.replace(/\D/g, '').endsWith('0002'))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsProcessing(false);
        setCardError(data.message || `❌ رفض البنك المعاملة: رصيد البطاقة غير كافٍ أو البطاقة غير مقبولة.`);
        setStep(2);
        return;
      }

      setIsProcessing(false);
      setStep(4);

      if (paymentChoice === 'new' && saveCardToProfile && onUpdateProfile) {
        const sanitized = newCardNumber.replace(/\D/g, '');
        const last4 = sanitized.slice(-4) || '4242';
        onUpdateProfile({
          savedCard: {
            cardNumber: `•••• •••• •••• ${last4}`,
            cardHolder: (newCardHolder || currentUser.displayName).trim().toUpperCase(),
            expiry: newExpiry.trim(),
            cardType: sanitized.startsWith('5') ? 'mastercard' : 'visa',
            last4
          }
        });
      }

      onCheckoutComplete({
        items,
        totalPaid: totalAmount,
        paymentMethod: paymentChoice === 'saved' ? `Visa (${currentUser.savedCard?.last4 || '4242'}) - Stripe` : 'Stripe Card Gateway'
      });
    } catch (err: any) {
      setIsProcessing(false);
      // Fallback in case offline or server issue
      setCardError(`❌ تعذر إتمام المعالجة البنكية: ${err.message || 'خطأ في الاتصال'}`);
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Steps Tracker */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              بوابة الدفع الآمنة متعددة المراحل
            </h3>
            <span className="text-[11px] text-slate-400">
              المرحلة {step} من 3: {
                step === 1 ? 'مراجعة المشتريات' :
                step === 2 ? 'بيانات بطاقة الدفع' :
                step === 3 ? 'التحقق البنكي 3D Secure' : 'تأكيد الشراء بنجاح'
              }
            </span>
          </div>

          {step !== 4 && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP 1: Review Order & Quantities */}
        {step === 1 && (
          <div className="space-y-4 text-xs animate-fadeIn">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 max-h-56 overflow-y-auto">
              {items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                      {item.product.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      الكمية: {item.quantity} × ${item.product.price}
                    </span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    ${item.product.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                  أموالك في أمان تام بنظام الضمان Escrow
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-tight block mt-0.5">
                  لن يستلم البائع أي مبالغ إلا بعد استلامك للملف وفحصه لمدة 14 يوماً مع إمكانية استرجاع الأموال بضغطة زر.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-sm">
              <span>المجموع المطلوب دفعه:</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${totalAmount}</span>
            </div>

            <button
              onClick={handleProceedToPayment}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span>المتابعة لاختيار وسيلة الدفع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Choose Payment Card (Saved or New with Luhn Check) */}
        {step === 2 && (
          <div className="space-y-4 text-xs animate-fadeIn">
            {currentUser.savedCard && (
              <div 
                onClick={() => setPaymentChoice('saved')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  paymentChoice === 'saved' 
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                    VISA
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      البطاقة المحفوظة في ملفك ({currentUser.savedCard.cardNumber})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      تنتهي في: {currentUser.savedCard.expiry} • حاملها: {currentUser.savedCard.cardHolder}
                    </span>
                  </div>
                </div>

                <input
                  type="radio"
                  checked={paymentChoice === 'saved'}
                  onChange={() => setPaymentChoice('saved')}
                  className="accent-indigo-600 w-4 h-4"
                />
              </div>
            )}

            <div 
              onClick={() => setPaymentChoice('new')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                paymentChoice === 'new' 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  استخدام بطاقة دفع جديدة (Visa أو MasterCard)
                </span>
                <input
                  type="radio"
                  checked={paymentChoice === 'new'}
                  onChange={() => setPaymentChoice('new')}
                  className="accent-indigo-600 w-4 h-4"
                />
              </div>

              {paymentChoice === 'new' && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="block font-bold mb-1">رقم البطاقة (16 رقماً):</label>
                    <input
                      type="text"
                      maxLength={19}
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value.replace(/\D/g, '')))}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">الصلاحية (MM/YY):</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={newExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                          setNewExpiry(v);
                        }}
                        placeholder="12/28"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">رمز الأمان (CVV):</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newCvv}
                        onChange={(e) => setNewCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="123"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs text-center"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-300 font-bold pt-1">
                    <input
                      type="checkbox"
                      checked={saveCardToProfile}
                      onChange={(e) => setSaveCardToProfile(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>حفظ بيانات هذه البطاقة في ملفي الشخصي للاستخدام السريع مستقبلاً 💳</span>
                  </label>
                </div>
              )}
            </div>

            {/* Bank Balance Scenario Tester */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateInsufficientFunds}
                  onChange={(e) => setSimulateInsufficientFunds(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  🧪 تجربة محاكاة بطاقة بدون رصيد كافٍ (رفض المعاملة من البنك)
                </span>
              </label>
              <p className="text-[10px] text-slate-400 mr-6">
                عند تفعيل هذا الخيار، سيتم محاكاة رفض البنك للشراء بسبب عدم توفر الرصيد كما في بوابات الدفع الحقيقية.
              </p>
            </div>

            {cardError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
                ⚠️ {cardError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleProceedTo3DSecure}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <span>متابعة للتحقق البنكي 3D Secure</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 3D Secure Bank OTP Confirmation (Prevents accidental one-click purchases) */}
        {step === 3 && (
          <div className="space-y-4 text-xs animate-fadeIn">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                نظام الحماية المصرفية المزدوج (3D Secure)
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-sm mx-auto">
                لضمان عدم تنفيذ الشراء دون إذنك، أرسل مصرفك رمز تحقق أمني إلى هاتفك لتأكيد خصم مبلغ <b className="text-emerald-600">${totalAmount}</b>.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-center">
                أدخل رمز التحقق البنكي (OTP):
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="مثال: 123456"
                className="w-48 mx-auto block px-4 py-2.5 text-center bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500 rounded-xl font-mono text-base font-black tracking-widest outline-none"
              />
              <span className="text-[10px] text-slate-400 text-center block mt-1">
                (في بيئة التجربة: يمكنك كتابة أي رمز مثل 1234 للمتابعة)
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleConfirm3DSecure}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>جاري معالجة الدفع والتوثيق البنكي...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تأكيد الخصم وإتمام عملية الشراء</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4 text-xs animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                🎉 تمت عملية الشراء بنجاح!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                تم حفظ مبلغك في محفظة الضمان Escrow وفك قفل جميع الملفات الرقمية في صفحة "مشترياتي".
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition"
            >
              الانتقال إلى قائمة مشترياتي لتحميل الملفات
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
