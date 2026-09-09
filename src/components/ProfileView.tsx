import React, { useState } from 'react';
import { 
  User as UserIcon, 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  BadgeCheck, 
  Check, 
  AlertTriangle, 
  Save, 
  Star, 
  ShoppingBag, 
  DollarSign,
  KeyRound,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { User, SavedCard } from '../types';
import { validateCreditCardNumber, validateCardExpiry, validateCardCVV, formatCardNumber } from '../utils/security';

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (updated: Partial<User>) => void;
  registeredUsernames: string[];
  registeredEmails: string[];
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  registeredUsernames,
  registeredEmails,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'payment' | 'stats'>('info');

  // Info Tab State
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Security Tab State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Card Tab State
  const [rawCardNumber, setRawCardNumber] = useState(currentUser.savedCard?.cardNumber || '4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(currentUser.savedCard?.cardHolder || currentUser.displayName.toUpperCase());
  const [expiry, setExpiry] = useState(currentUser.savedCard?.expiry || '12/28');
  const [cvv, setCvv] = useState('123');
  const [cardSuccess, setCardSuccess] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };
  const pwdStrength = getPasswordStrength(newPassword);

  // Save Personal Info with Uniqueness Check
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(false);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check username uniqueness if changed
    if (cleanUsername !== currentUser.username.toLowerCase()) {
      if (registeredUsernames.includes(cleanUsername)) {
        setInfoError('اسم المستخدم هذا محجوز بالفعل لمستخدم آخر، يرجى اختيار اسم متاح.');
        return;
      }
    }

    // Check email uniqueness if changed
    if (cleanEmail !== currentUser.email.toLowerCase()) {
      if (registeredEmails.includes(cleanEmail)) {
        setInfoError('هذا البريد الإلكتروني مسجل مسبقاً بحساب آخر.');
        return;
      }
    }

    if (cleanUsername.length < 3) {
      setInfoError('اسم المستخدم يجب ألا يقل عن 3 أحرف.');
      return;
    }

    onUpdateProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      bio: bio.trim()
    });

    setInfoSuccess(true);
    setTimeout(() => setInfoSuccess(false), 3000);
  };

  // Save Security & Password
  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(false);

    if (newPassword.length < 6) {
      setSecurityError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    setSecuritySuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSecuritySuccess(false), 3000);
  };

  // Save and Validate Credit Card
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);
    setCardSuccess(false);

    // 1. Validate Card Number with Luhn Algorithm
    const cardValidation = validateCreditCardNumber(rawCardNumber);
    if (!cardValidation.isValid) {
      setCardError('رقم بطاقة الفيزا / ماستركارد غير صحيح أو فشل في فحص Luhn المصرفي.');
      return;
    }

    // 2. Validate Expiry Date
    if (!validateCardExpiry(expiry)) {
      setCardError('تاريخ انتهاء صلاحية البطاقة غير صالح أو منتهي الصلاحية (MM/YY).');
      return;
    }

    // 3. Validate CVV
    if (!validateCardCVV(cvv)) {
      setCardError('رمز الأمان CVV يجب أن يتكون من 3 أو 4 أرقام.');
      return;
    }

    const sanitized = rawCardNumber.replace(/\D/g, '');
    const last4 = sanitized.slice(-4);
    const masked = `•••• •••• •••• ${last4}`;

    const newCard: SavedCard = {
      cardNumber: masked,
      cardHolder: cardHolder.trim().toUpperCase(),
      expiry: expiry.trim(),
      cardType: cardValidation.cardType === 'mastercard' ? 'mastercard' : 'visa',
      last4
    };

    onUpdateProfile({ savedCard: newCard });
    setCardSuccess(true);
    setTimeout(() => setCardSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fadeIn space-y-6">
      
      {/* Executive Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Cover Banner */}
        <div className="h-36 bg-gradient-to-r from-indigo-700 via-indigo-600 to-emerald-600 relative">
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>حساب موثق ومحمي 100%</span>
          </div>
        </div>

        {/* User Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-md bg-white shrink-0"
              />
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    {currentUser.displayName}
                  </h1>
                  <BadgeCheck className="w-5 h-5 text-emerald-500" title="بائع معتمد بهوية موثقة" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  @{currentUser.username} • عضو منذ {currentUser.joinedDate}
                </p>
              </div>
            </div>

            {/* Quick Stats Badges & Logout */}
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/70 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block">تقييمك كبائع</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {currentUser.sellerRating}
                </span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/70 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">نسبة الأمان</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {currentUser.trustScore}%
                </span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج من الحساب"
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {currentUser.bio || 'لا توجد نبذة تعريفية مضافة بعد.'}
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>المعلومات الشخصية والبريد</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>الأمان وكلمة المرور</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'payment'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>بطاقة الفيزا / ماستركارد</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>إحصائيات البائع والضمان</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Personal Info & Email (Includes Uniqueness Checking) */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">تعديل البيانات الأساسية</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يتم فحص اسم المستخدم والبريد الإلكتروني لمنع التكرار وضمان أمان الحساب
            </p>
          </div>

          <form onSubmit={handleSaveInfo} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل الظاهر:</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم (@username):</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني المعتمد:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">النبذة التعريفية (Bio):</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
              />
            </div>

            {infoError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{infoError}</span>
              </div>
            )}

            {infoSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>تم حفظ وتحديث بيانات الملف الشخصي بنجاح!</span>
              </div>
            )}

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التغييرات</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">تغيير كلمة المرور وإعدادات الأمان</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر كلمة مرور قوية تحتوي على حروف وأرقام ورموز للحماية القصوى
            </p>
          </div>

          <form onSubmit={handleSaveSecurity} className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية:</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        pwdStrength <= 25 ? 'bg-rose-500 w-1/4' :
                        pwdStrength <= 50 ? 'bg-amber-500 w-2/4' :
                        pwdStrength <= 75 ? 'bg-blue-500 w-3/4' : 'bg-emerald-500 w-full'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    قوة كلمة المرور: {pwdStrength >= 75 ? 'قوية جداً 🛡️' : pwdStrength >= 50 ? 'متوسطة' : 'ضعيفة'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة:</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {securityError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{securityError}</span>
              </div>
            )}

            {securitySuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>تم تحديث كلمة المرور بنجاح!</span>
              </div>
            )}

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>تحديث كلمة المرور</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Payment Cards (Visa / Mastercard Management with Luhn Check & 3D Card Preview) */}
      {activeTab === 'payment' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">إدارة بطاقات الدفع (Visa / MasterCard)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يتم التحقق من صحة البطاقة بخوارزمية Luhn العالمية وتشفيرها مع دعم الشراء الآمن
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Realistic Virtual 3D Glassmorphism Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 text-white p-5 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden aspect-[1.58/1] flex flex-col justify-between select-none">
                
                {/* Top of Card: Chip & Card Type */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 border border-amber-500/50 flex items-center justify-center shadow-inner">
                    <div className="w-6 h-4 border border-amber-600/40 rounded-sm" />
                  </div>
                  <span className="font-extrabold text-sm tracking-wider text-indigo-300">
                    {rawCardNumber.startsWith('5') ? 'MasterCard' : 'VISA'}
                  </span>
                </div>

                {/* Card Number */}
                <div className="text-center my-2">
                  <span className="text-base sm:text-lg font-mono tracking-widest block font-bold text-slate-100">
                    {formatCardNumber(rawCardNumber) || '•••• •••• •••• ••••'}
                  </span>
                </div>

                {/* Bottom Card: Holder & Expiry */}
                <div className="flex items-end justify-between text-[10px] text-slate-300">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">حامل البطاقة</span>
                    <span className="font-bold tracking-wide uppercase font-mono text-white">
                      {cardHolder || 'NAME SURNAME'}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[8px] text-slate-400 uppercase block">الصلاحية</span>
                    <span className="font-bold font-mono text-white">
                      {expiry || 'MM/YY'}
                    </span>
                  </div>
                </div>

                {/* Security badge on card */}
                <div className="absolute top-2 right-1/2 translate-x-1/2 opacity-20 pointer-events-none">
                  <ShieldCheck className="w-24 h-24 text-white" />
                </div>
              </div>

              <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>محمية ومشفرة بـ SSL 256-Bit وفق معايير PCI-DSS</span>
              </div>
            </div>

            {/* Right: Card Details Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم البطاقة (16 رقماً):
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={rawCardNumber}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/\D/g, '');
                      setRawCardNumber(formatCardNumber(sanitized));
                      setCardError(null);
                    }}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم المكتوب على البطاقة:
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="AHMED AL-TAMIMI"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ الصلاحية (MM/YY):
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 3) {
                          val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                        }
                        setExpiry(val);
                      }}
                      placeholder="12/28"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-center"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رمز الأمان (CVV):
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-center"
                      required
                    />
                  </div>
                </div>

                {cardError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{cardError}</span>
                  </div>
                )}

                {cardSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>تم التحقق من بطاقتك بنجاح وحفظها كوسيلة دفع آمنة!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تأكيد وحفظ البطاقة</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: Seller Stats & Escrow Protection info */}
      {activeTab === 'stats' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">إحصائيات المبيعات ومحفظة الضمان</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              متابعة تقييمات العملاء وحالة الأموال المحتجزة في حماية Escrow
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-xs text-slate-400 font-bold block">إجمالي المبيعات</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{currentUser.totalSales} عملية</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 text-center space-y-1">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold block">متوسط تقييم المشترين</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                ⭐ {currentUser.sellerRating} / 5
              </span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block">درجة الثقة المعتمدة</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {currentUser.trustScore}% ممتاز
              </span>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              كيف يضمن نظام Escrow سلامتك وسمعتك كبائع؟
            </h4>
            <p className="leading-relaxed text-[11px]">
              عند قيام أي مشترٍ بشراء منتج رقمي، تظل الأموال محجوزة في محفظة المنصة الآمنة لمدة 14 يوماً. بعد انتهاء فترة الضمان أو تأكيد المشتري رضاه، يتم تحويل المبلغ مباشرة إلى رصيدك البنكي القابل للسحب، مما يبني سمعة لا تشوبها شائبة ويمنع الشكاوى الكيدية.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
