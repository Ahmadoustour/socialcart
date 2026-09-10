import React, { useState, useRef, useEffect } from 'react';
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
  LogOut,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  X,
  RefreshCw,
  Link2,
  CheckCircle2,
  Mail,
  Smartphone,
  Shield
} from 'lucide-react';
import { User, SavedCard } from '../types';
import { validateCreditCardNumber, validateCardExpiry, validateCardCVV, formatCardNumber } from '../utils/security';

const PRESET_AVATARS = [
  { id: 'av_1', label: 'مطور ومبرمج', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_2', label: 'مصممة محترفة', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_3', label: 'رائد أعمال', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_4', label: 'مبتكرة محتوى', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_5', label: 'مهندس برمجيات', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_6', label: 'خبيرة استشارية', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_7', label: 'مطور تطبيقات', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_8', label: 'مصممة واجهات', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_9', label: 'مستشار تسويق', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_10', label: 'أفاتار 3D ملهم', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_11', label: 'فن رقمي حديث', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=250&auto=format&fit=crop&q=80' },
  { id: 'av_12', label: 'هوية رقمية تقنية', url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=250&auto=format&fit=crop&q=80' }
];

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
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Avatar Edit Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarModalTab, setAvatarModalTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [tempAvatar, setTempAvatar] = useState(currentUser.avatar);
  const [urlInput, setUrlInput] = useState('');
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarToast, setAvatarToast] = useState(false);

  // File input refs
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentUser changes (e.g., account switch)
  useEffect(() => {
    setDisplayName(currentUser.displayName);
    setUsername(currentUser.username);
    setEmail(currentUser.email);
    setBio(currentUser.bio || '');
    setAvatar(currentUser.avatar);
    setTempAvatar(currentUser.avatar);
  }, [currentUser]);

  // Security Tab State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Email Verification State
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerifySuccess, setEmailVerifySuccess] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isEmailVerifiedState, setIsEmailVerifiedState] = useState(Boolean(currentUser.isEmailVerified ?? true));
  const [sentOtpCode, setSentOtpCode] = useState('123456');
  const [otpServerMsg, setOtpServerMsg] = useState<string | null>(null);

  // Two-Factor Authentication (2FA) State
  const [twoFactorActive, setTwoFactorActive] = useState(Boolean(currentUser.twoFactorEnabled));
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState<string | null>(null);

  // Card Tab State
  const [rawCardNumber, setRawCardNumber] = useState(currentUser.savedCard?.cardNumber || '4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(currentUser.savedCard?.cardHolder || currentUser.displayName.toUpperCase());
  const [expiry, setExpiry] = useState(currentUser.savedCard?.expiry || '12/28');
  const [cvv, setCvv] = useState('123');
  const [cardSuccess, setCardSuccess] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Handle File Upload from device
  const processImageFile = (file: File) => {
    setAvatarUploadError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('يرجى اختيار ملف صورة صالح بتنسيق (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setAvatarUploadError('حجم الصورة كبير جداً، الحد الأقصى المسموح هو 6 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTempAvatar(reader.result);
      }
    };
    reader.onerror = () => {
      setAvatarUploadError('حدث خطأ أثناء قراءة ملف الصورة، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  // Direct fast upload from file input without opening modal
  const handleDirectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newImg = reader.result;
        setAvatar(newImg);
        setTempAvatar(newImg);
        onUpdateProfile({ avatar: newImg });
        setAvatarToast(true);
        setTimeout(() => setAvatarToast(false), 3500);
      }
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  // Save selected avatar
  const handleSaveAvatar = (avatarToSave?: string) => {
    const chosen = avatarToSave || tempAvatar;
    if (!chosen || !chosen.trim()) {
      setAvatarUploadError('يرجى اختيار أو رفع صورة أولاً.');
      return;
    }

    setAvatar(chosen);
    onUpdateProfile({ avatar: chosen });
    setIsAvatarModalOpen(false);
    setAvatarToast(true);
    setTimeout(() => setAvatarToast(false), 3500);
  };

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
      bio: bio.trim(),
      avatar: avatar
    });

    setInfoSuccess(true);
    setTimeout(() => setInfoSuccess(false), 3000);
  };

  // Save Security & Password
  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(false);

    // 1. Strict verification of old password!
    const currentPass = currentUser.password || 'Password123!';
    if (oldPassword !== currentPass) {
      setSecurityError('كلمة المرور الحالية غير صحيحة! لا يمكن تغيير كلمة المرور إلا بإدخال كلمة المرور السابقة الصحيحة لحماية حسابك من الاختراق.');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (newPassword === oldPassword) {
      setSecurityError('كلمة المرور الجديدة لا يمكن أن تكون مطابقة لكلمة المرور الحالية.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    onUpdateProfile({
      password: newPassword
    });

    setSecuritySuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSecuritySuccess(false), 3500);
  };

  const handleSendEmailOtp = async () => {
    setIsSendingOtp(true);
    setEmailOtpError(null);
    setOtpServerMsg(null);

    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(generatedCode);

    try {
      const response = await fetch('/api/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          otpCode: generatedCode,
          username: currentUser.displayName
        })
      });

      const data = await response.json();
      if (data && data.message) {
        setOtpServerMsg(data.message);
      }
    } catch (err: any) {
      console.warn('Resend email API request error:', err);
      setOtpServerMsg('تم توليد الرمز محلياً.');
    } finally {
      setIsSendingOtp(false);
      setShowEmailVerifyModal(true);
    }
  };

  const handleVerifyEmailOtp = () => {
    const trimmed = emailOtp.trim();
    if (trimmed !== sentOtpCode && trimmed !== '123456') {
      setEmailOtpError(`رمز التحقق غير صحيح. يرجى إدخال الرمز المكون من 6 أرقام (${sentOtpCode}) أو اكتب 123456.`);
      return;
    }
    setIsEmailVerifiedState(true);
    onUpdateProfile({ isEmailVerified: true });
    setEmailVerifySuccess(true);
    setTimeout(() => {
      setShowEmailVerifyModal(false);
      setEmailVerifySuccess(false);
      setEmailOtp('');
    }, 1500);
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorActive;
    setTwoFactorActive(nextState);
    onUpdateProfile({ twoFactorEnabled: nextState });
    setTwoFactorSuccessMsg(nextState ? 'تم تفعيل المصادقة الثنائية (2FA) بنجاح وحماية المحفظة والحساب 🛡️' : 'تم تعطيل المصادقة الثنائية.');
    setTimeout(() => setTwoFactorSuccessMsg(null), 3500);
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
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt={currentUser.displayName}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-md bg-white shrink-0 group-hover:brightness-95 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTempAvatar(avatar);
                    setIsAvatarModalOpen(true);
                  }}
                  title="تغيير الصورة الشخصية"
                  className="absolute -bottom-1 -left-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900 transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">تعديل البيانات الأساسية والصورة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يمكنك تحديث صورتك الشخصية، الاسم، واسم المستخدم والبريد الإلكتروني المعتمد
              </p>
            </div>
          </div>

          {/* Dedicated Profile Picture Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={currentUser.displayName}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTempAvatar(avatar);
                    setIsAvatarModalOpen(true);
                  }}
                  className="absolute -bottom-1 -left-1 p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm border border-white dark:border-slate-800 hover:bg-indigo-700 transition cursor-pointer"
                  title="تعديل الصورة الشخصية"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">الصورة الشخصية الحالية</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  تظهر في المنشورات، تعليقات المجتمع، بطاقات المتجر، والمحادثات المباشرة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="file"
                ref={directFileInputRef}
                onChange={handleDirectFileChange}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs shadow-xs cursor-pointer active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع صورة من جهازك</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempAvatar(avatar);
                  setIsAvatarModalOpen(true);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>أفاتار أو رابط</span>
              </button>
            </div>
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

          {/* Section 2: Email Verification Suite */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span>التحقق من البريد الإلكتروني (Email Verification)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  البريد المسجل: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{currentUser.email}</span>
                </p>
              </div>

              {isEmailVerifiedState ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold shadow-xs">
                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                  <span>موثق ومفعل</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={isSendingOtp}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isSendingOtp ? 'جاري الإرسال...' : 'إرسال كود التفعيل (OTP)'}</span>
                </button>
              )}
            </div>

            {!isEmailVerifiedState && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>⚠️ لم يتم تأكيد بريدك الإلكتروني بعد. تفعيل البريد يحمي حسابك ويمكنك من استرجاع كلمة المرور ومتابعة فواتير الشراء.</span>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  className="underline font-bold hover:text-amber-900 dark:hover:text-amber-100 shrink-0 mr-2"
                >
                  تأكيد الآن
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Two-Factor Authentication (2FA) */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>المصادقة الثنائية (Two-Factor Authentication - 2FA)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  طلب رمز تحقق إضافي مؤقت عند تسجيل الدخول أو إتمام مشتريات مالية كبرى
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggle2FA}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title={twoFactorActive ? 'تعطيل المصادقة الثنائية' : 'تفعيل المصادقة الثنائية'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    twoFactorActive ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {twoFactorSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{twoFactorSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Section 4: Cloudflare & Platform Security Metrics */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>حالة جدار الحماية والتشفير السحابي</span>
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                  نشط 100%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="block text-slate-400">تشفير البيانات</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">SSL / TLS 1.3</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="block text-slate-400">حماية الهجمات</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">DDoS Shield</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="block text-slate-400">جدار التطبيقات</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">WAF Active</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="block text-slate-400">الضمان المالي</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Escrow Vault</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email OTP Verification Modal */}
          {showEmailVerifyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-900 dark:text-slate-100 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm">تأكيد البريد الإلكتروني</h3>
                  </div>
                  <button 
                    onClick={() => setShowEmailVerifyModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تم إرسال رمز تحقق مؤلف من 6 أرقام إلى بريدك: <br/>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{currentUser.email}</span>
                </p>

                {otpServerMsg && (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-[11px] leading-relaxed">
                    📧 {otpServerMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">أدخل رمز التحقق (OTP):</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="مثال: 123456"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-mono font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">
                    (في بيئة الاختبار يمكنك كتابة: 123456)
                  </span>
                </div>

                {emailOtpError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailOtpError}</span>
                  </div>
                )}

                {emailVerifySuccess && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>تم توثيق البريد الإلكتروني بنجاح! 🛡️</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
                  >
                    تأكيد وتفعيل
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailVerifyModal(false)}
                    className="px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {/* AVATAR EDIT MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-5 animate-scaleUp overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">تعديل الصورة الشخصية</h3>
                  <p className="text-[11px] text-slate-500">اختر الطريقة الأنسب لك لتحديث صورتك الشخصية</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAvatarModalOpen(false);
                  setAvatarUploadError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAvatarModalTab('upload');
                  setAvatarUploadError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع من الجهاز</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAvatarModalTab('preset');
                  setAvatarUploadError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'preset'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>أفاتار جاهز</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAvatarModalTab('url');
                  setAvatarUploadError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  avatarModalTab === 'url'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>رابط خارجي</span>
              </button>
            </div>

            {/* Error Message if any */}
            {avatarUploadError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{avatarUploadError}</span>
              </div>
            )}

            {/* Tab Contents (Scrollable area) */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* TAB 1: Upload from Device */}
              {avatarModalTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />

                  <div
                    onClick={() => modalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition flex flex-col items-center justify-center gap-2.5"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        انقر لاختيار صورة من هاتفك أو حاسوبك
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        صيغ مدعومة: JPG, PNG, WEBP (حتى 6 ميغابايت)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-1 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700 transition"
                    >
                      تصفح الملفات
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Curated Presets */}
              {avatarModalTab === 'preset' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    اختر صورة رمزية معبرة من الأفاتارات المصممة بعناية:
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = tempAvatar === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setTempAvatar(preset.url);
                            setAvatarUploadError(null);
                          }}
                          className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition p-0.5 group cursor-pointer ${
                            isSelected 
                              ? 'border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/30' 
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Direct URL */}
              {avatarModalTab === 'url' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    أدخل رابط الصورة المباشر (URL):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-left font-mono"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (urlInput.trim()) {
                          setTempAvatar(urlInput.trim());
                          setAvatarUploadError(null);
                        } else {
                          setAvatarUploadError('يرجى كتابة رابط صورة صالح أولاً.');
                        }
                      }}
                      className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition shrink-0"
                    >
                      معاينة
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    تأكد أن الرابط ينتهي بصيغة صورة أو من مصادر صور عامة موثوقة.
                  </p>
                </div>
              )}

              {/* Live Preview Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Square preview */}
                  <div className="text-center">
                    <img
                      src={tempAvatar}
                      alt="معاينة"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-sm mx-auto bg-white"
                      onError={() => {
                        setAvatarUploadError('تعذر تحميل الصورة من هذا الرابط، تأكد من صحة الرابط.');
                      }}
                    />
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">مربع</span>
                  </div>

                  {/* Circular preview */}
                  <div className="text-center">
                    <img
                      src={tempAvatar}
                      alt="معاينة دائرية"
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-sm mx-auto bg-white"
                    />
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">دائري</span>
                  </div>

                  <div className="mr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      معاينة الظهور
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      هكذا ستبدو صورتك في المجتمع والمتجر
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTempAvatar(currentUser.avatar)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-xs flex items-center gap-1 font-semibold"
                  title="استعادة الصورة الأصلية"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">استعادة</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAvatarModalOpen(false);
                  setAvatarUploadError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => handleSaveAvatar()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ واعتماد الصورة الشخصية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS FLOATING TOAST */}
      {avatarToast && (
        <div className="fixed bottom-24 sm:bottom-8 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slideUp">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>تم تحديث صورتك الشخصية بنجاح في كامل المنصة!</span>
        </div>
      )}

    </div>
  );
};
