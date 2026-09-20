import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Store, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Bell,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown,
  MessageSquare,
  ShoppingCart,
  ShoppingBag,
  Plus
} from 'lucide-react';
import { User, NotificationItem } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface HeaderProps {
  activeSection: 'social' | 'market';
  onSwitchSection: (section: 'social' | 'market') => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  isLoggedIn: boolean;
  onOpenAuthModal: () => void;
  onOpenAccountMenu: () => void;
  onLogout: () => void;
  unreadNotifsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead?: () => void;
  onMarkNotificationRead?: (notifId: string) => void;
  onSelectNotification?: (notif: NotificationItem) => void;
  cartBadgeCount?: number;
  unreadMessagesCount?: number;
  onOpenCreatePost?: () => void;
  onOpenSellModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onSwitchSection,
  activeTab,
  onSelectTab,
  currentUser,
  isLoggedIn,
  onOpenAuthModal,
  onOpenAccountMenu,
  onLogout,
  unreadNotifsCount,
  darkMode,
  onToggleDarkMode,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onSelectNotification,
  cartBadgeCount = 0,
  unreadMessagesCount = 0,
  onOpenCreatePost,
  onOpenSellModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Auto-refresh relative time labels periodically
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleNotifications = () => {
    if (!isLoggedIn) {
      onOpenAuthModal();
      return;
    }
    setShowNotifDropdown(prev => !prev);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-3 w-full">
          
          {/* Brand Logo & Top Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0 min-w-0">
            <div 
              onClick={() => onSelectTab(activeSection === 'social' ? 'feed' : 'marketplace')} 
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
              title="سوشيال كارت"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                {activeSection === 'social' ? (
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
              <div className="hidden lg:block">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                  سوشيال<span className="text-emerald-600 dark:text-emerald-400">كارت</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                  {activeSection === 'social' ? 'المجتمع والمنشورات' : 'السوق والمنتجات الرقمية'}
                </span>
              </div>
            </div>

            {/* MAIN TOP SWITCHER: Social vs Marketplace */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl flex items-center gap-0.5 sm:gap-1 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
              <button
                onClick={() => {
                  onSwitchSection('social');
                  onSelectTab('feed');
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  activeSection === 'social'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>المجتمع</span>
              </button>

              <button
                onClick={() => {
                  onSwitchSection('market');
                  onSelectTab('marketplace');
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  activeSection === 'market'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>المتجر</span>
              </button>
            </div>
          </div>

          {/* DESKTOP NAVIGATION TABS (Visible only on md: and above) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 flex-1 justify-center max-w-xl mx-2">
            {activeSection === 'social' ? (
              <>
                <button
                  onClick={() => onSelectTab('feed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none ${
                    activeTab === 'feed'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>الرئيسية</span>
                </button>

                <button
                  onClick={() => {
                    if (!isLoggedIn) onOpenAuthModal();
                    else onSelectTab('messages');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold relative transition select-none ${
                    activeTab === 'messages'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="relative">
                    <MessageSquare className="w-4 h-4" />
                    {isLoggedIn && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[9px] min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-bold shadow-xs">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span>الرسائل</span>
                </button>

                {isLoggedIn && (
                  <button
                    onClick={() => onSelectTab('profile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none ${
                      activeTab === 'profile'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>الملف الشخصي</span>
                  </button>
                )}

                {onOpenCreatePost && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) onOpenAuthModal();
                      else onOpenCreatePost();
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>منشور جديد</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectTab('marketplace')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none ${
                    activeTab === 'marketplace'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>تصفح السوق</span>
                </button>

                <button
                  onClick={() => {
                    if (!isLoggedIn) onOpenAuthModal();
                    else onSelectTab('cart');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold relative transition select-none ${
                    activeTab === 'cart'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    {isLoggedIn && cartBadgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-bold shadow-xs">
                        {cartBadgeCount}
                      </span>
                    )}
                  </div>
                  <span>السلة</span>
                </button>

                {isLoggedIn && (
                  <button
                    onClick={() => onSelectTab('purchases')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition select-none ${
                      activeTab === 'purchases'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>مشترياتي</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!isLoggedIn) onOpenAuthModal();
                    else onSelectTab('messages');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold relative transition select-none ${
                    activeTab === 'messages'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="relative">
                    <MessageSquare className="w-4 h-4" />
                    {isLoggedIn && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-bold shadow-xs">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span>مراسلات السوق</span>
                </button>

                {onOpenSellModal && (
                  <button
                    onClick={() => {
                      if (!isLoggedIn) onOpenAuthModal();
                      else onOpenSellModal();
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>بيع منتج</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right Action Tools: Dark Mode, Notifications, Login / Account */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              aria-label="تبديل الوضع الليلي والنهاري"
              title={darkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300 transition-transform -rotate-12 hover:rotate-0" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className={`p-1.5 sm:p-2 rounded-xl transition relative ${
                  showNotifDropdown
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="الإشعارات والتنبيهات"
                title="الإشعارات"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {isLoggedIn && unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center font-bold animate-pulse shadow-sm">
                    {unreadNotifsCount > 99 ? '+99' : unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div 
                  className="absolute left-0 mt-2 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الإشعارات والتنبيهات</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkAllNotificationsRead) onMarkAllNotificationsRead();
                      }}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      تحديد الكل كمقروء
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">لا توجد إشعارات حالياً</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            if (!isLoggedIn) {
                              onOpenAuthModal();
                              setShowNotifDropdown(false);
                              return;
                            }
                            if (onMarkNotificationRead) onMarkNotificationRead(notif.id);
                            if (onSelectNotification) {
                              onSelectNotification(notif);
                            } else if (notif.linkTab) {
                              onSelectTab(notif.linkTab);
                            }
                            setShowNotifDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl text-xs cursor-pointer transition ${
                            notif.isRead 
                              ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400' 
                              : 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-[11px] mb-0.5">{notif.title}</p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] leading-snug">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">
                            {formatRelativeTime(notif.createdAt, notif.id)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AUTH SECTION: LOGIN BUTTON OR ACCOUNT MENU */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Account Button */}
                <button
                  onClick={onOpenAccountMenu}
                  className={`flex items-center gap-1.5 p-1 sm:px-3 sm:py-1.5 rounded-xl border transition ${
                    activeTab === 'profile'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="إدارة الحساب"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="hidden md:block text-right">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block leading-tight truncate max-w-[90px]">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5 truncate">
                      @{currentUser.username}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Direct Logout Button on desktop */}
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="hidden md:flex p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* LOGIN / REGISTER BUTTON */
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
                <span className="sm:hidden text-[11px]">دخول</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-3 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn">
            {/* Account Options in Mobile */}
            {isLoggedIn ? (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onSelectTab('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    حسابي: {currentUser.displayName}
                  </span>
                  <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول / إنشاء حساب
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
