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
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';

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
  registeredUsernames = [],
  registeredEmails = []
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

  // Security: Brute-Force Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isLockedOut) {
      setErrorMsg('⚠️ تم تجميد تسجيل الدخول مؤقتاً لحماية الحساب من محاولات التخمين المتكررة. يرجى المحاولة لاحقاً.');
      return;
    }

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو اسم المستخدم.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('يرجى إدخال كلمة المرور.');
      return;
    }

    setIsSubmitting(true);

    // If identifier is not an email format, check local registered users first
    const isEmail = identifier.includes('@');
    let emailToAuth = identifier;

    if (!isEmail) {
      const savedUsersStr = localStorage.getItem('socialcart_registered_users');
      const savedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const userMatch = savedUsers.find(u => u.username.toLowerCase() === identifier.toLowerCase());
      if (userMatch && userMatch.email) {
        emailToAuth = userMatch.email;
      }
    }

    try {
      // 1. Attempt real Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, loginPassword);
      const fbUser = userCredential.user;

      const savedUsersStr = localStorage.getItem('socialcart_registered_users');
      const savedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const userMatch = savedUsers.find(u => 
        u.id === fbUser.uid || 
        (u.email && u.email.toLowerCase() === emailToAuth.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === identifier.toLowerCase())
      );
      
      const appUser: User = {
        id: fbUser.uid,
        username: userMatch?.username || (fbUser.displayName ? fbUser.displayName.toLowerCase().replace(/\s+/g, '_') : (fbUser.email?.split('@')[0] || 'user')),
        displayName: userMatch?.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'مستخدم مسجل',
        email: fbUser.email || emailToAuth,
        avatar: userMatch?.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: userMatch?.bio !== undefined ? userMatch.bio : 'عضو في منصة سوشيال كارت.',
        savedCard: userMatch?.savedCard,
        password: loginPassword || userMatch?.password,
        joinedDate: userMatch?.joinedDate || 'سبتمبر 2026',
        isVerifiedSeller: userMatch?.isVerifiedSeller ?? false,
        sellerRating: userMatch?.sellerRating ?? 0,
        sellerReviewsCount: userMatch?.sellerReviewsCount ?? 0,
        totalSales: userMatch?.totalSales ?? 0,
        trustScore: userMatch?.trustScore ?? 100,
        isEmailVerified: fbUser.emailVerified ?? userMatch?.isEmailVerified ?? false,
        twoFactorEnabled: userMatch?.twoFactorEnabled ?? false
      };

      // Ensure cached in registered list with latest password
      const matchIdx = savedUsers.findIndex(u => u.id === appUser.id || (u.email && u.email.toLowerCase() === appUser.email.toLowerCase()));
      if (matchIdx >= 0) {
        savedUsers[matchIdx] = { ...savedUsers[matchIdx], ...appUser };
      } else {
        savedUsers.push(appUser);
      }
      localStorage.setItem('socialcart_registered_users', JSON.stringify(savedUsers));

      // Persist to server
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appUser)
      }).catch(() => {});

      setSuccessMsg(`أهلاً بك مجدداً يا ${appUser.displayName}! تم تسجيل الدخول بنجاح 🛡️`);
      setTimeout(() => {
        onLoginSuccess(appUser);
        onClose();
        setSuccessMsg(null);
      }, 600);
    } catch (fbErr: any) {
      console.warn('Firebase Email sign-in:', fbErr);

      // Check locally registered accounts in browser cache
      const savedUsersStr = localStorage.getItem('socialcart_registered_users');
      const savedUsers: any[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      let localMatched = savedUsers.find(
        u => (u.email?.toLowerCase() === identifier.toLowerCase() || u.username?.toLowerCase() === identifier.toLowerCase()) && u.password === loginPassword
      );

      // If not found in local cache, check server database
      if (!localMatched) {
        try {
          const srvUserRes = await fetch(`/api/users/${encodeURIComponent(identifier)}`);
          if (srvUserRes.ok) {
            const srvUser = await srvUserRes.json();
            if (srvUser && srvUser.password === loginPassword) {
              localMatched = srvUser;
              // Cache locally
              savedUsers.push(srvUser);
              localStorage.setItem('socialcart_registered_users', JSON.stringify(savedUsers));
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (localMatched) {
        setSuccessMsg(`أهلاً بك مجدداً يا ${localMatched.displayName}! تم تسجيل الدخول بنجاح.`);
        setTimeout(() => {
          onLoginSuccess(localMatched);
          onClose();
          setSuccessMsg(null);
        }, 600);
        return;
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        setIsLockedOut(true);
        setErrorMsg('🛡️ تم قفل تسجيل الدخول مؤقتاً بعد 5 محاولات خاطئة متتالية تفعيلاً لسياسة الأمان.');
        setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
        }, 60000);
        return;
      }

      if (fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/user-not-found') {
        setErrorMsg(`بيانات تسجيل الدخول غير صحيحة. متبقي لديك (${5 - nextAttempts}) محاولات.`);
      } else if (fbErr.code === 'auth/invalid-email') {
        setErrorMsg('صيغة البريد الإلكتروني غير صالحة.');
      } else {
        setErrorMsg(fbErr.message || 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const savedUsersStr = localStorage.getItem('socialcart_registered_users');
      const savedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const userMatch = savedUsers.find(u => 
        u.id === fbUser.uid || 
        (u.email && fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase())
      );

      const appUser: User = {
        id: fbUser.uid,
        username: userMatch?.username || (fbUser.displayName || 'user').toLowerCase().replace(/\s+/g, '_'),
        displayName: userMatch?.displayName || fbUser.displayName || 'مستخدم جوجل',
        email: fbUser.email || userMatch?.email || 'user@example.com',
        avatar: userMatch?.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: userMatch?.bio !== undefined ? userMatch.bio : 'عضو في منصة سوشيال كارت.',
        savedCard: userMatch?.savedCard,
        password: userMatch?.password,
        joinedDate: userMatch?.joinedDate || 'سبتمبر 2026',
        isVerifiedSeller: userMatch?.isVerifiedSeller ?? false,
        sellerRating: userMatch?.sellerRating ?? 0,
        sellerReviewsCount: userMatch?.sellerReviewsCount ?? 0,
        totalSales: userMatch?.totalSales ?? 0,
        trustScore: userMatch?.trustScore ?? 100,
        isEmailVerified: fbUser.emailVerified ?? userMatch?.isEmailVerified ?? false,
        twoFactorEnabled: userMatch?.twoFactorEnabled ?? false
      };

      const matchIdx = savedUsers.findIndex(u => u.id === appUser.id || (u.email && u.email.toLowerCase() === appUser.email.toLowerCase()));
      if (matchIdx >= 0) {
        savedUsers[matchIdx] = { ...savedUsers[matchIdx], ...appUser };
      } else {
        savedUsers.push(appUser);
      }
      localStorage.setItem('socialcart_registered_users', JSON.stringify(savedUsers));

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appUser)
      }).catch(() => {});

      setSuccessMsg(`أهلاً بك يا ${appUser.displayName}! تم تسجيل الدخول عبر Google بنجاح 🛡️`);
      setTimeout(() => {
        onLoginSuccess(appUser);
        onClose();
        setSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      console.warn('Firebase Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول من قِبلك.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('النطاق غير مصرح به بعد في Firebase: يرجى إضافة دومين موقعك (مثل socialcart-five.vercel.app) داخل Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('المتصفح منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة (Popups) للموقع.');
      } else {
        setErrorMsg(`تنبيه مصادقة Firebase: ${err.message || 'يرجى التأكد من تفعيل موفر Google في لوحة تحكم Firebase.'}`);
      }
    }
  };

  const handleForgotPassword = async () => {
    const email = loginIdentifier.trim();
    if (!email || !email.includes('@')) {
      setErrorMsg('يرجى كتابة بريدك الإلكتروني أولاً في الحقل أعلاه لإرسال رابط استعادة كلمة المرور.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email} بنجاح.`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إرسال رابط الاستعادة حالياً. يرجى التأكد من صحة البريد.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Enforce username has no spaces whatsoever
    const cleanUsername = regUsername.toLowerCase().replace(/\s+/g, '');
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regDisplayName.trim();

    if (!cleanName || !cleanUsername || !cleanEmail || !regPassword) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (/\s/.test(regUsername)) {
      setErrorMsg('اسم المستخدم يجب أن يكون متصلاً تماماً بدون أي مسافات.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setErrorMsg('اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية، أرقام، أو الرموز (_ . -).');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('صيغة البريد الإلكتروني غير صالحة.');
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

    // 1. STRICT LOCAL & PROPS UNIQUENESS CHECK
    const savedUsersStr = localStorage.getItem('socialcart_registered_users');
    const savedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];

    const emailTakenLocally = savedUsers.some(u => u.email && u.email.trim().toLowerCase() === cleanEmail) ||
      registeredEmails.some(em => em.trim().toLowerCase() === cleanEmail);

    if (emailTakenLocally) {
      setErrorMsg(`⚠️ البريد الإلكتروني (${cleanEmail}) مسجل مسبقاً لدينا! لا يمكن إنشاء حساب جديد بنفس البريد.`);
      return;
    }

    const usernameTakenLocally = savedUsers.some(u => u.username && u.username.trim().toLowerCase().replace(/\s+/g, '') === cleanUsername) ||
      registeredUsernames.some(un => un.trim().toLowerCase().replace(/\s+/g, '') === cleanUsername);

    if (usernameTakenLocally) {
      setErrorMsg(`⚠️ اسم المستخدم (@${cleanUsername}) محجوز ومستخدم بالفعل لحساب آخر. يرجى اختيار اسم مستخدم متاح.`);
      return;
    }

    setIsSubmitting(true);

    // 2. STRICT SERVER UNIQUENESS CHECK
    try {
      const checkRes = await fetch(`/api/auth/check-unique?username=${encodeURIComponent(cleanUsername)}&email=${encodeURIComponent(cleanEmail)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.emailTaken) {
          setErrorMsg(`⚠️ البريد الإلكتروني (${cleanEmail}) مسجل مسبقاً بحساب آخر. لا يمكن تكرار البريد.`);
          setIsSubmitting(false);
          return;
        }
        if (checkData.usernameTaken) {
          setErrorMsg(`⚠️ اسم المستخدم (@${cleanUsername}) محجوز بالفعل لمستخدم آخر. يرجى اختيار اسم مستخدم متاح.`);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (chkErr) {
      console.warn('Server uniqueness check notice:', chkErr);
    }

    // 3. Clear any previous session and sign out of Firebase before creating a new account
    localStorage.removeItem('socialcart_user');
    try {
      await signOut(auth);
    } catch {}

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
      const fbUser = userCredential.user;

      try {
        await updateProfile(fbUser, { displayName: cleanName });
      } catch (profErr) {
        console.warn('Could not update profile name immediately:', profErr);
      }

      const newUser: User = {
        id: fbUser.uid,
        username: cleanUsername,
        displayName: cleanName,
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'عضو جديد في منصة سوشيال كارت.',
        joinedDate: 'سبتمبر 2026',
        isVerifiedSeller: false,
        sellerRating: 0,
        sellerReviewsCount: 0,
        totalSales: 0,
        trustScore: 100,
        password: regPassword,
        isEmailVerified: fbUser.emailVerified,
        twoFactorEnabled: false
      };

      // Ensure local state is immediately assigned to this brand-new user
      localStorage.setItem('socialcart_user', JSON.stringify(newUser));
      localStorage.setItem('socialcart_logged_in', 'true');

      // Also persist locally for fast offline retrieval and to server
      savedUsers.push(newUser);
      localStorage.setItem('socialcart_registered_users', JSON.stringify(savedUsers));

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, isRegistration: true })
      }).catch(() => {});

      setSuccessMsg(`تهانينا يا ${cleanName}! تم إنشاء حسابك الجديد بنجاح 🛡️`);
      setTimeout(() => {
        onLoginSuccess(newUser);
        onClose();
        setSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      console.warn('Firebase registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg(`⚠️ البريد الإلكتروني (${cleanEmail}) مسجل مسبقاً بالفعل! لا يمكن إنشاء حساب جديد بنفس البريد.`);
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى (6 أحرف على الأقل).');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('صيغة البريد الإلكتروني غير صالحة.');
      } else {
        // Fallback local registration ONLY if Firebase network failed AND not an existing user
        // Double-check local storage again to never create duplicate
        const freshUsers: User[] = JSON.parse(localStorage.getItem('socialcart_registered_users') || '[]');
        if (freshUsers.some(u => (u.email && u.email.toLowerCase() === cleanEmail) || (u.username && u.username.toLowerCase().replace(/\s+/g, '') === cleanUsername))) {
          setErrorMsg('⚠️ هذا الحساب مسجل مسبقاً! يرجى الانتقال إلى تسجيل الدخول.');
          return;
        }

        const newUser: User = {
          id: `usr_${Date.now()}`,
          username: cleanUsername,
          displayName: cleanName,
          email: cleanEmail,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: 'عضو جديد في منصة سوشيال كارت.',
          joinedDate: 'سبتمبر 2026',
          isVerifiedSeller: false,
          sellerRating: 0,
          sellerReviewsCount: 0,
          totalSales: 0,
          trustScore: 100,
          password: regPassword,
          isEmailVerified: false,
          twoFactorEnabled: false
        };

        // Ensure local state is immediately assigned to this brand-new user
        localStorage.setItem('socialcart_user', JSON.stringify(newUser));
        localStorage.setItem('socialcart_logged_in', 'true');

        // Try backend registration with isRegistration flag
        try {
          const srvRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newUser, isRegistration: true })
          });
          if (!srvRes.ok) {
            const srvData = await srvRes.json().catch(() => ({}));
            if (srvRes.status === 409) {
              setErrorMsg(`⚠️ ${srvData.message || 'هذا الحساب مسجل مسبقاً بحساب آخر.'}`);
              return;
            }
          }
        } catch (e) {
          console.warn('Backend user registration error:', e);
        }

        freshUsers.push(newUser);
        localStorage.setItem('socialcart_registered_users', JSON.stringify(freshUsers));

        setSuccessMsg(`تم إنشاء حسابك الجديد بنجاح يا ${cleanName}!`);
        setTimeout(() => {
          onLoginSuccess(newUser);
          onClose();
          setSuccessMsg(null);
        }, 700);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative my-auto mx-auto"
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
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
            {mode === 'register' && (errorMsg.includes('مسجل مسبقاً') || errorMsg.includes('تسجيل الدخول') || errorMsg.includes('محجوز')) && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginIdentifier(regEmail || regUsername);
                  setLoginPassword('');
                  setErrorMsg(null);
                }}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>الانتقال لتسجيل الدخول بهذا الحساب</span>
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Firebase Google Auth Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>تسجيل الدخول عبر Google</span>
          </button>
          
          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-2 text-[10px] text-slate-400 font-bold">أو بالبيانات التقليدية</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          </div>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="name@example.com أو اسم المستخدم"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
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
                  onClick={handleForgotPassword}
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
                  required
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
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 mt-4"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الاسم الشخصي أو اسم المتجر (الاسم الظاهر)
                </label>
                <span className="text-[10px] text-slate-400 font-normal">يظهر في ملفك ومنشوراتك</span>
              </div>
              <input
                type="text"
                value={regDisplayName}
                onChange={e => setRegDisplayName(e.target.value)}
                placeholder="مثال: عبد الله السعيد"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اسم المستخدم الفريد (@Username)
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">معرّف خاص بك لا يتكرر</span>
              </div>
              <input
                type="text"
                value={regUsername}
                onChange={e => {
                  const noSpaces = e.target.value.replace(/\s+/g, '');
                  setRegUsername(noSpaces);
                }}
                onKeyDown={e => {
                  if (e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();
                  }
                }}
                placeholder="abdullah_dev"
                autoComplete="username"
                dir="ltr"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                معرف إنجليزي متصل تماماً بدون مسافات، يخص حسابك هذا فقط ولا يمكن أن يتطابق مع مستخدم آخر.
              </p>
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
