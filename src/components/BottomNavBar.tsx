import React from 'react';
import { 
  Globe, 
  Store, 
  MessageSquare, 
  ShoppingCart, 
  PackageCheck, 
  Plus, 
  LogIn
} from 'lucide-react';
import { User } from '../types';

interface BottomNavBarProps {
  activeSection: 'social' | 'market';
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSwitchSection?: (section: 'social' | 'market') => void;
  cartBadgeCount: number;
  unreadMessagesCount: number;
  unreadMarketMessagesCount?: number;
  onOpenCreateModal: () => void;
  isLoggedIn: boolean;
  currentUser: User;
  onOpenAccountMenu: () => void;
  onOpenAuthModal: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeSection,
  activeTab,
  onSelectTab,
  onSwitchSection,
  cartBadgeCount,
  unreadMessagesCount,
  unreadMarketMessagesCount,
  onOpenCreateModal,
  isLoggedIn,
  currentUser,
  onOpenAccountMenu,
  onOpenAuthModal
}) => {
  const marketUnread = unreadMarketMessagesCount !== undefined ? unreadMarketMessagesCount : unreadMessagesCount;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors duration-200">
      <div className="max-w-xl mx-auto px-2 sm:px-4">
        
        {/* ========================================================================= */}
        {/* CASE 1: SOCIAL BUTTONS (أزرار قسم المجتمع المخصصة فقط عند تفعيل المجتمع) */}
        {/* ========================================================================= */}
        {activeSection === 'social' ? (
          <div className="flex items-center justify-around h-16 sm:h-18">
            
            {/* 1. Feed / Home */}
            <button
              onClick={() => onSelectTab('feed')}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition select-none ${
                activeTab === 'feed'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Globe className={`w-5 h-5 transition-transform ${activeTab === 'feed' ? 'scale-110 stroke-[2.5]' : ''}`} />
              <span className="text-[11px] font-bold mt-1">الرئيسية</span>
            </button>

            {/* 2. CENTER ACTION BUTTON: + New Social Post */}
            <div className="flex flex-col items-center justify-center px-2">
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    onOpenAuthModal();
                  } else {
                    onOpenCreateModal();
                  }
                }}
                title="إضافة منشور جديد في المجتمع"
                className="w-12 h-12 -mt-5 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 bg-gradient-to-tr from-indigo-600 to-indigo-500 transition-transform active:scale-95 hover:scale-105"
              >
                <Plus className="w-6 h-6 stroke-[2.8]" />
              </button>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                + منشور
              </span>
            </div>

            {/* 3. Messages / Direct Chat (Requires Login) */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuthModal();
                } else {
                  if (onSwitchSection) onSwitchSection('social');
                  onSelectTab('messages');
                }
              }}
              title={unreadMessagesCount > 0 ? `${unreadMessagesCount} أشخاص أرسلوا لك رسائل غير مقروءة` : 'الرسائل'}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 relative transition select-none ${
                activeTab === 'messages'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <MessageSquare className={`w-5 h-5 transition-transform ${activeTab === 'messages' ? 'scale-110 stroke-[2.5]' : ''}`} />
                {unreadMessagesCount > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-xs"
                    title={`${unreadMessagesCount} رسائل غير مقروءة`}
                  >
                    {unreadMessagesCount > 99 ? '+99' : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold mt-1">الرسائل</span>
            </button>

            {/* 4. Account / Profile */}
            {isLoggedIn ? (
              <button
                onClick={() => onSelectTab('profile')}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 transition select-none ${
                  activeTab === 'profile'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.displayName}
                  className={`w-6 h-6 rounded-full object-cover ring-2 transition-transform ${
                    activeTab === 'profile'
                      ? 'ring-indigo-600 scale-110'
                      : 'ring-transparent hover:ring-slate-300'
                  }`}
                />
                <span className="text-[11px] font-bold mt-1">الملف</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex flex-col items-center justify-center flex-1 py-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition select-none"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-[11px] font-bold mt-1">دخول</span>
              </button>
            )}

          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: MARKETPLACE BUTTONS (أزرار قسم المتجر المخصصة فقط عند تفعيل المتجر) */
          /* ========================================================================= */
          <div className="flex items-center justify-around h-16 sm:h-18">
            
            {/* 1. Browse Market */}
            <button
              onClick={() => onSelectTab('marketplace')}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition select-none ${
                activeTab === 'marketplace'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Store className={`w-5 h-5 transition-transform ${activeTab === 'marketplace' ? 'scale-110 stroke-[2.5]' : ''}`} />
              <span className="text-[10px] sm:text-[11px] font-bold mt-1">المتجر</span>
            </button>

            {/* 2. Cart (Requires Login) */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuthModal();
                } else {
                  onSelectTab('cart');
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 relative transition select-none ${
                activeTab === 'cart'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <ShoppingCart className={`w-5 h-5 transition-transform ${activeTab === 'cart' ? 'scale-110 stroke-[2.5]' : ''}`} />
                {isLoggedIn && cartBadgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-xs">
                    {cartBadgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold mt-1">السلة</span>
            </button>

            {/* 3. CENTER ACTION BUTTON: + Sell Digital Product */}
            <div className="flex flex-col items-center justify-center px-0.5">
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    onOpenAuthModal();
                  } else {
                    onOpenCreateModal();
                  }
                }}
                title="عرض منتج رقمي للبيع في المتجر"
                className="w-11 h-11 sm:w-12 sm:h-12 -mt-5 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 bg-gradient-to-tr from-emerald-600 to-emerald-500 transition-transform active:scale-95 hover:scale-105"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
              </button>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                + بيع
              </span>
            </div>

            {/* 4. Store Messages (Requires Login) */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuthModal();
                } else {
                  if (onSwitchSection) onSwitchSection('market');
                  onSelectTab('messages');
                }
              }}
              title={marketUnread > 0 ? `${marketUnread} أشخاص أرسلوا لك استفسارات غير مقروءة في المتجر` : 'رسائل المتجر'}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 relative transition select-none ${
                activeTab === 'messages'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <MessageSquare className={`w-5 h-5 transition-transform ${activeTab === 'messages' ? 'scale-110 stroke-[2.5]' : ''}`} />
                {marketUnread > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-xs"
                    title={`${marketUnread} استفسارات ورسائل غير مقروءة`}
                  >
                    {marketUnread > 99 ? '+99' : marketUnread}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold mt-1">الرسائل</span>
            </button>

            {/* 5. Purchases (Requires Login) */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  onOpenAuthModal();
                } else {
                  onSelectTab('purchases');
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition select-none ${
                activeTab === 'purchases'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <PackageCheck className={`w-5 h-5 transition-transform ${activeTab === 'purchases' ? 'scale-110 stroke-[2.5]' : ''}`} />
              <span className="text-[10px] sm:text-[11px] font-bold mt-1">مشترياتي</span>
            </button>

            {/* 6. Profile / الملف (Requires Login) */}
            {isLoggedIn ? (
              <button
                onClick={() => onSelectTab('profile')}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 transition select-none ${
                  activeTab === 'profile'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.displayName}
                  className={`w-6 h-6 rounded-full object-cover ring-2 transition-transform ${
                    activeTab === 'profile'
                      ? 'ring-emerald-600 scale-110'
                      : 'ring-transparent hover:ring-slate-300'
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] font-bold mt-1">الملف</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex flex-col items-center justify-center flex-1 py-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition select-none"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-[10px] sm:text-[11px] font-bold mt-1">دخول</span>
              </button>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
