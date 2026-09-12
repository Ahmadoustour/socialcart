import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { User, NotificationItem } from '../types';

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
  onSelectNotification
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleToggleNotifications = () => {
    if (!isLoggedIn) {
      onOpenAuthModal();
      return;
    }
    setShowNotifDropdown(prev => !prev);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Top Switcher (PERFECTLY PRESERVED AS REQUESTED) */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div 
              onClick={() => onSelectTab(activeSection === 'social' ? 'feed' : 'marketplace')} 
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                {activeSection === 'social' ? (
                  <Globe className="w-5 h-5 text-white" />
                ) : (
                  <Store className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="hidden xs:block sm:block">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                  سوشيال<span className="text-emerald-600 dark:text-emerald-400">كارت</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                  {activeSection === 'social' ? 'المجتمع والمنشورات' : 'السوق والمنتجات الرقمية'}
                </span>
              </div>
            </div>

            {/* MAIN TOP SWITCHER: Social vs Marketplace - KEPT IN PLACE */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => {
                  onSwitchSection('social');
                  onSelectTab('feed');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSection === 'social'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>المجتمع</span>
              </button>

              <button
                onClick={() => {
                  onSwitchSection('market');
                  onSelectTab('marketplace');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSection === 'market'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>المتجر</span>
              </button>
            </div>
          </div>

          {/* Right Action Tools: Dark Mode, Notifications, Login / Account */}
          <div className="flex items-center gap-2">
            
            {/* Dark Mode Toggle - FIXED TO WORK INSTANTLY */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              aria-label="تبديل الوضع الليلي والنهاري"
              title={darkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform -rotate-12 hover:rotate-0" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className={`p-2 rounded-xl transition relative ${
                  showNotifDropdown
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="الإشعارات والتنبيهات"
                title="الإشعارات"
              >
                <Bell className="w-5 h-5" />
                {isLoggedIn && unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center font-bold animate-pulse shadow-sm">
                    {unreadNotifsCount > 99 ? '+99' : unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div 
                  className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fadeIn"
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
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">{notif.createdAt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AUTH SECTION: LOGIN BUTTON OR ACCOUNT MENU */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5">
                {/* Account Button */}
                <button
                  onClick={onOpenAccountMenu}
                  className={`flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-xl border transition ${
                    activeTab === 'profile'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="إدارة الحساب"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="hidden sm:block text-right">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-3 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn">
            {/* Quick Switcher */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                onClick={() => {
                  onSwitchSection('social');
                  onSelectTab('feed');
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
                  activeSection === 'social'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                قسم المجتمع
              </button>
              <button
                onClick={() => {
                  onSwitchSection('market');
                  onSelectTab('marketplace');
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
                  activeSection === 'market'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Store className="w-4 h-4" />
                قسم المتجر
              </button>
            </div>

            {/* Account Options in Mobile */}
            {isLoggedIn ? (
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    onSelectTab('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  حسابي: {currentUser.displayName}
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
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
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
