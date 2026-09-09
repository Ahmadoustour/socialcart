import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { User } from '../types';
import { CURRENT_USER, SAMPLE_SELLERS } from '../mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
  registeredUsernames?: string[];
  registeredEmails?: string[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
  registeredUsernames = ['ahmed_dev', 'sara_design', 'omar_coder'],
  registeredEmails = ['ahmed.dev@example.com', 'sara.studio@example.com', 'omar.tech@example.com']
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    if (!identifier) {
      setErrorMsg('يرجى إدخال اسم المستخدم أو البريد الإلكتروني.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('يرجى إدخال كلمة المرور.');
      return;
    }

    // Match with current user or sample sellers
    const allUsers: User[] = [CURRENT_USER, ...SAMPLE_SELLERS];
    const matched = allUsers.find(
      u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );

    if (matched) {
      setSuccessMsg(`أهلاً بك مجدداً يا ${matched.displayName}! جاري تسجيل الدخول...`);
      setTimeout(() => {
        onLoginSuccess(matched);
        onClose();
        setSuccessMsg(null);
      }, 700);
    } else {
      // Fallback created user for any custom credentials
      const customUser: User = {
        id: `usr_${Date.now()}`,
        username: identifier.replace(/[^a-z0-9_]/gi, '') || 'user',
        displayName: loginIdentifier.split('@')[0],
        email: loginIdentifier.includes('@') ? loginIdentifier : `${identifier}@example.com`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        joinedDate: 'سبتمبر 2026',
        isVerifiedSeller: false,
        sellerRating: 5.0,
        sellerReviewsCount: 0,
        totalSales: 0,
        trustScore: 95
      };
      setSuccessMsg(`تم تسجيل الدخول بنجاح! مرحباً بك.`);
      setTimeout(() => {
        onLoginSuccess(customUser);
        onClose();
        setSuccessMsg(null);
      }, 700);
    }
  };

  const handleQuickLogin = (user: User) => {
    setErrorMsg(null);
    setSuccessMsg(`تم تسجيل الدخول بحساب: ${user.displayName}`);
    setTimeout(() => {
      onLoginSuccess(user);
      onClose();
      setSuccessMsg(null);
    }, 500);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regDisplayName.trim();

    if (!cleanName || !cleanUsername || !cleanEmail || !regPassword) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }

    if (registeredUsernames.includes(cleanUsername)) {
      setErrorMsg('اسم المستخدم هذا محجوز مسبقاً، يرجى اختيار اسم مستخدم آخر.');
      return;
    }

    if (registeredEmails.includes(cleanEmail)) {
      setErrorMsg('البريد الإلكتروني هذا مستخدم بالفعل بحساب آخر.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تتكون من 6 خانات على الأقل.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      displayName: cleanName,
      email: cleanEmail,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'عضو نشط في منصة سوشيال كارت.',
      joinedDate: 'سبتمبر 2026',
      isVerifiedSeller: true,
      sellerRating: 5.0,
      sellerReviewsCount: 0,
      totalSales: 0,
      trustScore: 98
    };

    setSuccessMsg('تهانينا! تم إنشاء حسابك بنجاح. جاري تسجيل الدخول...');
    setTimeout(() => {
      onLoginSuccess(newUser);
      onClose();
      setSuccessMsg(null);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {mode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد في سوشيال كارت'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? 'مرحباً بك مجدداً! سجّل دخولك للتفاعل والشراء والبيع الآمن'
              : 'انضم لآلاف المستخدمين والمتاجر الرقمية الموثوقة'}
          </p>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إنشاء حساب</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Demo Login Helpers */}
        {mode === 'login' && (
          <div className="mb-5 p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                دخول تجريبي سريع بنقرة واحدة:
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin(CURRENT_USER)}
                className="w-full text-right px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <img src={CURRENT_USER.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{CURRENT_USER.displayName}</span>
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">بائع معتمد</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickLogin(SAMPLE_SELLERS[0])}
                className="w-full text-right px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <img src={SAMPLE_SELLERS[0].avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{SAMPLE_SELLERS[0].displayName}</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">مصممة ومتاجر</span>
              </button>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="ahmed_dev أو user@example.com"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => alert('للتجربة، يمكنك كتابة أي كلمة مرور أو استخدام أزرار الدخول السريع في الأعلى!')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 mt-4"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم الكامل أو اسم المتجر
              </label>
              <input
                type="text"
                value={regDisplayName}
                onChange={e => setRegDisplayName(e.target.value)}
                placeholder="مثال: عبد الله السعيد"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم المستخدم (@)
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                placeholder="abdullah_dev"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تأكيد الكلمة
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء الحساب وبدء التجربة</span>
            </button>
          </form>
        )}

        <div className="mt-5 text-center text-[11px] text-slate-400 dark:text-slate-500">
          بالتسجيل أو الدخول، فإنك توافق على شروط وسياسات منصة سوشيال كارت.
        </div>
      </div>
    </div>
  );
};
