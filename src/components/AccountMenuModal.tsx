import React from 'react';
import { 
  X, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Star, 
  PackageCheck, 
  Settings, 
  Users, 
  Check, 
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { User } from '../types';
import { CURRENT_USER, SAMPLE_SELLERS } from '../mockData';

interface AccountMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
}

export const AccountMenuModal: React.FC<AccountMenuModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTab,
  onLogout,
  onSwitchUser
}) => {
  if (!isOpen) return null;

  const demoAccounts: User[] = [CURRENT_USER, ...SAMPLE_SELLERS];

  return (
    <div className="fixed inset-0 z-50 flex items-center sm:items-start justify-center sm:justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative sm:mt-14"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Card Header */}
        <div 
          onClick={() => {
            onSelectTab('profile');
            onClose();
          }}
          className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-2 px-2 pt-1 rounded-2xl transition"
          title="انقر لفتح الملف الشخصي وتعديل الصورة"
        >
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-md shrink-0 group-hover:scale-105 transition"
            />
            <div className="absolute -bottom-1 -left-1 p-1 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-xs text-[10px]">
              ✏️
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {currentUser.displayName}
              </h3>
              {currentUser.isVerifiedSeller && (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              @{currentUser.username}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {currentUser.isVerifiedSeller ? 'حساب بائع موثق' : 'حساب مشتري'}
              </span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold group-hover:underline">
                تعديل الحساب ←
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold block">تقييم البائع</span>
            <span className="text-xs font-black text-amber-500 flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              {currentUser.sellerRating} / 5
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold block">نسبة الأمان</span>
            <span className="text-xs font-black text-emerald-500 mt-0.5 block">
              {currentUser.trustScore}% موثوق
            </span>
          </div>
        </div>

        {/* Navigation Quick Links */}
        <div className="space-y-1 mb-4">
          <button
            onClick={() => {
              onSelectTab('profile');
              onClose();
            }}
            className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              الملف الشخصي وإعدادات الحساب
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => {
              onSelectTab('purchases');
              onClose();
            }}
            className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              مشترياتي وطلباتي الرقمية
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Switch Account Section */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            تبديل الحساب (تجريبي سريع)
          </span>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {demoAccounts.map(account => (
              <button
                key={account.id}
                onClick={() => {
                  onSwitchUser(account);
                  onClose();
                }}
                className={`w-full text-right p-2 rounded-xl text-xs flex items-center justify-between transition ${
                  account.id === currentUser.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <img src={account.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  <span className="truncate">{account.displayName}</span>
                </div>
                {account.id === currentUser.id && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* LOGOUT BUTTON - Prominent & Red */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الحساب</span>
          </button>
        </div>

      </div>
    </div>
  );
};
