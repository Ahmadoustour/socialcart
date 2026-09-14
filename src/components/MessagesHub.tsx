import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Send, 
  Image as ImageIcon, 
  BadgeCheck, 
  MessageSquare, 
  Store, 
  Plus, 
  X,
  CheckCheck,
  PackageCheck,
  Sparkles,
  ArrowRight,
  ArrowDown,
  Play,
  Maximize2,
  Trash2,
  Mail
} from 'lucide-react';
import { Conversation, User, MediaItem } from '../types';
import { scanUrlOrFile } from '../utils/security';
import { formatMessageTime, formatConversationTime } from '../utils/dateUtils';
import { MediaLightboxModal } from './MediaLightboxModal';

// Helper to determine the OTHER participant in a conversation relative to the active user
export function getConversationPartner(conv: Conversation, currentUser?: User) {
  const cleanCurrent = (currentUser?.username || '').replace(/^@/, '').toLowerCase().trim();
  const cleanCurrentId = (currentUser?.id || '').trim();

  const isCreatorMe = Boolean(
    (cleanCurrentId && conv.creatorId && conv.creatorId === cleanCurrentId) ||
    (cleanCurrent && conv.creatorUsername && conv.creatorUsername.replace(/^@/, '').toLowerCase().trim() === cleanCurrent)
  );

  const isParticipantMe = Boolean(
    (cleanCurrentId && conv.participantId && conv.participantId === cleanCurrentId) ||
    (cleanCurrent && conv.participantUsername && conv.participantUsername.replace(/^@/, '').toLowerCase().trim() === cleanCurrent)
  );

  if (isCreatorMe && !isParticipantMe) {
    return {
      username: conv.participantUsername,
      displayName: conv.participantDisplayName,
      avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      id: conv.participantId,
      isVerified: conv.isVerified
    };
  }

  if (isParticipantMe && !isCreatorMe) {
    return {
      username: conv.creatorUsername || conv.participantUsername,
      displayName: conv.creatorDisplayName || conv.participantDisplayName,
      avatar: conv.creatorAvatar || conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      id: conv.creatorId || conv.participantId,
      isVerified: conv.isVerified
    };
  }

  return {
    username: conv.participantUsername,
    displayName: conv.participantDisplayName,
    avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    id: conv.participantId,
    isVerified: conv.isVerified
  };
}

interface MessagesHubProps {
  conversations: Conversation[];
  currentUser: User;
  mode: 'social' | 'market';
  onSwitchMode?: (mode: 'social' | 'market') => void;
  onSendMessage: (conversationId: string, text: string, media?: MediaItem[]) => void;
  onStartNewConversation: (participantUsername: string, participantName: string, avatar: string, type: 'social' | 'market', initialMessage: string, productTitle?: string) => void;
  initialActiveConvId?: string;
  onSelectConversation?: (convId: string) => void;
  onBackToList?: () => void;
  onMarkConversationRead?: (conversationId: string) => void;
  onMarkAllConversationsRead?: (type?: 'social' | 'market') => void;
  onDeleteConversation?: (conversationId: string) => void;
  onToggleUnread?: (conversationId: string) => void;
  onNavigateToMarket?: () => void;
  onNavigateToFeed?: () => void;
}

export const MessagesHub: React.FC<MessagesHubProps> = ({
  conversations,
  currentUser,
  mode,
  onSendMessage,
  onStartNewConversation,
  initialActiveConvId,
  onSelectConversation,
  onBackToList,
  onMarkConversationRead,
  onMarkAllConversationsRead,
  onDeleteConversation,
  onToggleUnread,
  onNavigateToMarket,
  onNavigateToFeed
}) => {
  const isMarket = mode === 'market';
  // Strictly filter conversations by the current mode ONLY using useMemo
  const modeConversations = useMemo(() => {
    return conversations.filter(c => c.type === mode);
  }, [conversations, mode]);

  // Active conversation state:
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (initialActiveConvId && modeConversations.some(c => c.id === initialActiveConvId)) {
      return initialActiveConvId;
    }
    return '';
  });

  const [showMobileChat, setShowMobileChat] = useState<boolean>(() => {
    return Boolean(initialActiveConvId && modeConversations.some(c => c.id === initialActiveConvId));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Media attachment state in chat
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Controlled chat scrolling - NEVER force scroll whole page or yank user down when reading history
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const prevActiveConvIdRef = useRef<string>('');
  const prevMessagesLengthRef = useRef<number>(0);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);

  const handleContainerScroll = () => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom <= 120;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowScrollBottomBtn(false);
    }
  };

  const scrollToBottom = (smooth = false) => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    setShowScrollBottomBtn(false);
    isNearBottomRef.current = true;
  };

  // Fullscreen Media Lightbox Viewer Modal for chat images & videos
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    mediaList: MediaItem[];
    initialIndex: number;
    title?: string;
    author?: { displayName: string; avatar: string; username?: string };
  }>({
    isOpen: false,
    mediaList: [],
    initialIndex: 0
  });

  const handleOpenLightbox = (
    mediaList: MediaItem[],
    initialIndex: number,
    title?: string,
    author?: { displayName: string; avatar: string; username?: string }
  ) => {
    setLightboxState({
      isOpen: true,
      mediaList,
      initialIndex,
      title,
      author
    });
  };

  // Periodic re-render every 30s so relative times ('الآن', 'منذ 5 دقائق') stay fresh
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [newChatProductTitle, setNewChatProductTitle] = useState('');
  const [newChatInitialText, setNewChatInitialText] = useState('');

  // Track previous initialActiveConvId and mode so we ONLY open mobile chat when a NEW initialActiveConvId is explicitly requested from outside
  const prevInitialIdRef = useRef<string | undefined>(initialActiveConvId);
  const prevModeRef = useRef<string>(mode);

  useEffect(() => {
    const isNewInitialId = Boolean(initialActiveConvId && initialActiveConvId !== prevInitialIdRef.current);
    const isModeChanged = mode !== prevModeRef.current;

    prevInitialIdRef.current = initialActiveConvId;
    prevModeRef.current = mode;

    if (isNewInitialId && initialActiveConvId) {
      if (modeConversations.some(c => c.id === initialActiveConvId)) {
        setActiveConvId(initialActiveConvId);
        setShowMobileChat(true);
      }
    } else if (isModeChanged || !initialActiveConvId) {
      setShowMobileChat(false);
      setActiveConvId('');
    }
  }, [mode, initialActiveConvId, modeConversations]);

  // Controlled scroll effect: only scroll within the message container, NEVER the whole page!
  const activeConversation = modeConversations.find(c => c.id === activeConvId);
  const currentMessagesCount = activeConversation?.messages?.length || 0;

  // 1. When switching conversation: jump to bottom once
  useEffect(() => {
    if (!activeConvId) return;
    if (activeConvId !== prevActiveConvIdRef.current) {
      prevActiveConvIdRef.current = activeConvId;
      prevMessagesLengthRef.current = currentMessagesCount;
      isNearBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setTimeout(() => {
        scrollToBottom(false);
      }, 40);
    }
  }, [activeConvId, currentMessagesCount]);

  // 2. When new messages arrive in the active conversation
  useEffect(() => {
    if (!activeConvId || !activeConversation) return;

    if (currentMessagesCount > prevMessagesLengthRef.current) {
      const lastMsg = activeConversation.messages[activeConversation.messages.length - 1];
      const cleanCurUser = (currentUser?.username || '').replace(/^@/, '').toLowerCase().trim();
      const cleanCurId = (currentUser?.id || '').trim();
      const senderU = (lastMsg?.senderUsername || '').replace(/^@/, '').toLowerCase().trim();
      const senderId = (lastMsg?.senderId || '').trim();

      const isMyMsg = Boolean(
        (cleanCurId && senderId && cleanCurId === senderId) ||
        (cleanCurUser && senderU && cleanCurUser === senderU) ||
        (lastMsg?.isMe)
      );

      if (isMyMsg) {
        // User sent a message -> scroll to bottom
        setTimeout(() => scrollToBottom(true), 30);
      } else {
        // Incoming message: ONLY auto-scroll if user is already at the bottom
        if (isNearBottomRef.current) {
          setTimeout(() => scrollToBottom(true), 30);
        } else {
          // Keep user at current scroll position so they can read comfortably
          setShowScrollBottomBtn(true);
        }
      }
    }
    prevMessagesLengthRef.current = currentMessagesCount;
  }, [currentMessagesCount, activeConvId]);

  // Mark active conversation as read when selected
  const onMarkReadRef = useRef(onMarkConversationRead);
  useEffect(() => {
    onMarkReadRef.current = onMarkConversationRead;
  }, [onMarkConversationRead]);

  useEffect(() => {
    if (activeConvId && onMarkReadRef.current) {
      onMarkReadRef.current(activeConvId);
    }
  }, [activeConvId]);

  const filteredConversations = modeConversations.filter(c => {
    const partner = getConversationPartner(c, currentUser);
    const matchSearch = partner.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        partner.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.relatedProductTitle && c.relatedProductTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  const handleSelectConversation = (convId: string) => {
    if (!modeConversations.some(c => c.id === convId)) return;
    setActiveConvId(convId);
    setShowMobileChat(true);
    if (onSelectConversation) {
      onSelectConversation(convId);
    }
    if (onMarkConversationRead) {
      onMarkConversationRead(convId);
    }
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setActiveConvId('');
    if (onBackToList) {
      onBackToList();
    }
  };

  const handleSend = () => {
    if (!messageInput.trim() && attachedMedia.length === 0) return;
    if (!activeConversation) return;

    onSendMessage(activeConversation.id, messageInput.trim(), attachedMedia.length > 0 ? attachedMedia : undefined);
    setMessageInput('');
    setAttachedMedia([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const scan = scanUrlOrFile(file.name);
    if (!scan.isSafe) {
      alert(`تحذير أمني: ${scan.threats.join(' - ')}`);
      e.target.value = '';
      return;
    }

    const isVid = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const item: MediaItem = {
          id: `chat_med_${Date.now()}`,
          type: isVid ? 'video' : 'image',
          url: result,
          caption: file.name
        };
        setAttachedMedia(prev => [...prev, item]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateNewChat = () => {
    if (!newChatUsername.trim() || !newChatInitialText.trim()) {
      alert('يرجى كتابة اسم المستخدم والرسالة الأولى');
      return;
    }

    const cleanUsername = newChatUsername.trim().replace(/^@/, '');
    onStartNewConversation(
      cleanUsername,
      `@${cleanUsername}`,
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      mode,
      newChatInitialText.trim(),
      isMarket ? (newChatProductTitle.trim() || undefined) : undefined
    );

    setShowNewChatModal(false);
    setNewChatUsername('');
    setNewChatProductTitle('');
    setNewChatInitialText('');
  };

  // Delete chat confirmation modal state
  const [chatToDelete, setChatToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleConfirmDeleteChat = () => {
    if (!chatToDelete) return;
    if (onDeleteConversation) {
      onDeleteConversation(chatToDelete.id);
    }
    if (activeConvId === chatToDelete.id) {
      setActiveConvId('');
      setShowMobileChat(false);
      if (onBackToList) onBackToList();
    }
    setChatToDelete(null);
  };

  const unreadSectionCount = modeConversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const unreadSectionSendersCount = modeConversations.filter(c => c.unreadCount > 0).length;

  return (
    <div className="max-w-6xl mx-auto pb-16 animate-fadeIn">
      
      {/* Header: Purely contextual for Market or Social with no annoying tab switchers */}
      <div className="mb-5 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isMarket 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
            }`}>
              {isMarket ? (
                <Store className="w-6 h-6" />
              ) : (
                <MessageSquare className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {isMarket ? 'استفسارات المتجر والمنتجات' : 'المحادثات الاجتماعية'}
                </h2>
                {unreadSectionSendersCount > 0 ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs flex items-center gap-1">
                    <span>{unreadSectionSendersCount}</span>
                    <span>{unreadSectionSendersCount === 1 ? 'شخص راسلك' : 'أشخاص راسلوك'}</span>
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isMarket 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  }`}>
                    {isMarket ? '💡 استفسارات البائعين' : '💬 محادثات مباشرة'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isMarket 
                  ? 'استفسارات المنتجات الرقمية والتواصل المباشر مع البائعين' 
                  : 'الرسائل والمحادثات المباشرة مع الأصدقاء وصناع المحتوى في المجتمع'}
              </p>
            </div>
          </div>

          {/* Actions for current section */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {unreadSectionCount > 0 && onMarkAllConversationsRead && (
              <button
                onClick={() => onMarkAllConversationsRead(mode)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                title="تحديد كل رسائل هذا القسم كمقروءة"
              >
                <CheckCheck className={`w-4 h-4 ${isMarket ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span className="hidden sm:inline">تحديد الكل كمقروء</span>
              </button>
            )}

            <button
              onClick={() => setShowNewChatModal(true)}
              className={`font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm text-white transition ${
                isMarket 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isMarket ? 'استفسار جديد' : 'محادثة جديدة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Left Side (Cards) & Right Side (Chat View) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Col: Conversation Cards (Master List) */}
        <div className={`lg:col-span-4 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 ${
          showMobileChat ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Search bar */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isMarket ? "ابحث في البائعين أو اسم المنتج..." : "ابحث في الأصدقاء والمحادثات..."}
                className={`w-full pr-9 pl-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 transition ${
                  isMarket ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center ${
                  isMarket ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                }`}>
                  {isMarket ? <Store className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'لا توجد نتائج تطابق بحثك' : (isMarket ? 'لا توجد استفسارات في المتجر حالياً' : 'لا توجد محادثات اجتماعية حالياً')}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    {isMarket 
                      ? 'عند الاستفسار عن أي منتج رقمي في صفحة المتجر ستظهر محادثتك المباشرة مع البائع هنا.'
                      : 'ابدأ بالتواصل مع المبدعين أو شارك منشوراتك لاستقبال الرسائل المباشرة.'}
                  </p>
                </div>

                {!searchQuery && (
                  isMarket ? (
                    onNavigateToMarket && (
                      <button
                        onClick={onNavigateToMarket}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>تصفح منتجات المتجر</span>
                      </button>
                    )
                  ) : (
                    onNavigateToFeed && (
                      <button
                        onClick={onNavigateToFeed}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>استكشاف منشورات المجتمع</span>
                      </button>
                    )
                  )
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const partner = getConversationPartner(conv, currentUser);
                const isActive = conv.id === activeConvId;

                // 1. Calculate unread count specifically for current user
                const myU = (currentUser?.username || '').toLowerCase().trim().replace(/^@/, '');
                const userUnread = (myU && conv.unreadCountBy && typeof conv.unreadCountBy[myU] === 'number')
                  ? conv.unreadCountBy[myU]
                  : (conv.unreadCount || 0);
                const hasUnread = userUnread > 0;

                // 2. Sort messages to reliably identify the latest message
                const sortedMsgs = Array.isArray(conv.messages) && conv.messages.length > 0
                  ? conv.messages.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  : [];
                const latestMsg = sortedMsgs.length > 0 ? sortedMsgs[sortedMsgs.length - 1] : null;

                const isLastMsgFromMe = latestMsg 
                  ? (latestMsg.senderId === currentUser?.id || 
                     (latestMsg.senderUsername && myU && latestMsg.senderUsername.toLowerCase().trim().replace(/^@/, '') === myU) ||
                     Boolean(latestMsg.isMe))
                  : false;

                const displayLastMessage = latestMsg
                  ? (latestMsg.text || (latestMsg.media?.length ? 'ملف وسائط مرفق' : ''))
                  : (conv.lastMessage || 'لا توجد رسائل');

                const displayTime = latestMsg?.createdAt || conv.lastMessageTime;
                const messageCount = sortedMsgs.length;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition border flex items-start gap-3 select-none ${
                      isActive 
                        ? (isMarket 
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs' 
                            : 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs')
                        : (hasUnread
                            ? 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-900/50 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent')
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatar}
                        alt={partner.displayName}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      {hasUnread && (
                        <span
                          className={`absolute -top-1.5 -right-1.5 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shadow-xs leading-none z-10 select-none ${
                            isMarket ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          title={`${userUnread} رسائل جديدة`}
                        >
                          {userUnread > 99 ? '+99' : userUnread}
                        </span>
                      )}
                      {isMarket ? (
                        <div className="absolute -bottom-1 -left-1 bg-emerald-600 text-white p-0.5 rounded-md text-[9px] shadow-xs">
                          <Store className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -left-1 bg-indigo-600 text-white p-0.5 rounded-md text-[9px] shadow-xs">
                          <MessageSquare className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`text-xs truncate ${hasUnread ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                            {partner.displayName}
                          </span>
                          {partner.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Message count badge on each chat */}
                          <span 
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 shrink-0 flex items-center gap-1"
                            title={`إجمالي عدد الرسائل: ${messageCount}`}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{messageCount}</span>
                          </span>

                          {/* Unread counter on the chat card - disappears on read */}
                          {hasUnread && (
                            <span 
                              className={`text-white text-[9px] min-w-[16px] h-4 px-1.5 rounded-full flex items-center justify-center font-bold shadow-xs leading-none select-none ${
                                isMarket ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              title={`${userUnread} رسائل غير مقروءة`}
                            >
                              {userUnread > 99 ? '+99' : userUnread}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatConversationTime(displayTime)}
                          </span>
                        </div>
                      </div>

                      {/* Related product pill if market inquiry */}
                      {isMarket && conv.relatedProductTitle && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded truncate max-w-full">
                            <PackageCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{conv.relatedProductTitle}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-[11px] truncate flex-1 ml-2 ${
                          hasUnread 
                            ? 'text-slate-900 dark:text-slate-100 font-bold' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {latestMsg && (
                            <span className={isLastMsgFromMe ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300 font-semibold'}>
                              {isLastMsgFromMe ? 'أنت: ' : ''}
                            </span>
                          )}
                          {displayLastMessage}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle unread status button */}
                          {onToggleUnread && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeConvId === conv.id) {
                                  setActiveConvId('');
                                }
                                onToggleUnread(conv.id);
                              }}
                              className={`p-1 rounded-lg transition ${
                                hasUnread
                                  ? (isMarket
                                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200'
                                      : 'text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200')
                                  : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={hasUnread ? 'تحديد كمقروء' : 'تحديد كغير مقروء'}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete conversation button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatToDelete({
                                id: conv.id,
                                name: partner.displayName
                              });
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-80 hover:opacity-100"
                            title="حذف هذه المحادثة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Active Chat Thread View */}
        <div className={`lg:col-span-8 flex flex-col h-[620px] bg-white dark:bg-slate-900 ${
          showMobileChat ? 'flex' : 'hidden lg:flex'
        }`}>
          {activeConversation ? (
            (() => {
              const activePartner = getConversationPartner(activeConversation, currentUser);
              return (
            <>
              {/* Chat Thread Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Back Button to return to list */}
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-bold shrink-0"
                    title="الرجوع إلى قائمة المحادثات"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>الرجوع</span>
                  </button>

                  <img
                    src={activePartner.avatar}
                    alt={activePartner.displayName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {activePartner.displayName}
                      </span>
                      {activePartner.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                        (@{activePartner.username})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">● متصل الآن</span>
                      {isMarket ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          استفسار منتج رقمي
                        </span>
                      ) : (
                        <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          محادثة اجتماعية
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isMarket && activeConversation.relatedProductTitle && (
                    <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/80 max-w-[220px] truncate">
                      {activeConversation.relatedProductTitle}
                    </span>
                  )}
                  {(() => {
                    const activeIncoming = (activeConversation.messages || []).filter(m => !m.isMe).length;
                    return activeIncoming > 0 ? (
                      <span 
                        className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700/80" 
                        title={`إجمالي الرسائل الواردة إليك في هذه المحادثة: ${activeIncoming}`}
                      >
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{activeIncoming}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{activeIncoming === 1 ? 'رسالة واردة لك' : 'رسائل واردة لك'}</span>
                      </span>
                    ) : null;
                  })()}
                  {onToggleUnread && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleUnread(activeConversation.id);
                        handleBackToList();
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      title="تحديد كغير مقروء والعودة للقائمة"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setChatToDelete({
                        id: activeConversation.id,
                        name: activeConversation.participantDisplayName
                      });
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="حذف هذه المحادثة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contextual Product Inquiry Banner if in Market mode with product title */}
              {isMarket && activeConversation.relatedProductTitle && (
                <div className="mx-3 sm:mx-4 mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                        موضوع الاستفسار الحالي:
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                        {activeConversation.relatedProductTitle}
                      </h4>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 font-bold px-2 py-1 rounded-lg">
                    حماية المشتري مفعلة 🛡️
                  </span>
                </div>
              )}

              {/* Messages Bubbles Area with controlled container scrolling */}
              <div 
                ref={chatScrollContainerRef} 
                onScroll={handleContainerScroll} 
                className="relative flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/30"
              >
                {(() => {
                  const sortedChatMessages = (activeConversation.messages || [])
                    .slice()
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                  if (sortedChatMessages.length === 0) {
                    return (
                      <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 my-auto text-slate-400">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                          isMarket 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' 
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                        }`}>
                          {isMarket ? <Store className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm mb-1">
                          {isMarket ? 'بدء استفسار جديد بخصوص المنتج' : 'بدء محادثة مباشرة جديدة'}
                        </h4>
                        <p className="text-[11px] text-slate-500 max-w-xs">
                          {isMarket 
                            ? `لا توجد رسائل سابقة. يمكنك كتابة استفسارك للبائع "${activePartner.displayName}" بالأسفل وإرساله مباشرة.` 
                            : `لا توجد رسائل سابقة. ابدأ المحادثة بكتابة رسالتك في الصندوق بالأسفل.`}
                        </p>
                      </div>
                    );
                  }

                  return sortedChatMessages.map(msg => {
                    const cleanCurUser = (currentUser?.username || '').replace(/^@/, '').toLowerCase().trim();
                    const cleanCurId = (currentUser?.id || '').trim();
                    const senderU = (msg.senderUsername || '').replace(/^@/, '').toLowerCase().trim();
                    const senderId = (msg.senderId || '').trim();

                    // SENDER DETERMINATION: strictly verify if this message belongs to currently logged in user
                    const isMsgMe = Boolean(
                      (cleanCurId && senderId && cleanCurId === senderId) ||
                      (cleanCurUser && senderU && cleanCurUser === senderU) ||
                      (Boolean(msg.isMe) && (!senderU || senderU === cleanCurUser))
                    );

                    // AVATAR: If I sent it, ALWAYS show my avatar. If the other person sent it, show their avatar!
                    const bubbleAvatar = isMsgMe 
                      ? (currentUser?.avatar || msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80')
                      : (msg.senderAvatar || activePartner.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');

                    const bubbleUsername = isMsgMe 
                      ? (currentUser?.displayName || currentUser?.username || 'أنا')
                      : (msg.senderUsername || activePartner.displayName || activePartner.username);

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 max-w-[80%] ${
                          isMsgMe ? 'mr-auto flex-row-reverse' : 'ml-auto'
                        }`}
                      >
                        <img
                          src={bubbleAvatar}
                          alt={bubbleUsername}
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 mt-0.5 shrink-0"
                        />

                        <div className="space-y-1 max-w-full">
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isMsgMe
                                ? (isMarket 
                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                    : 'bg-indigo-600 text-white rounded-tr-none')
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                            {/* Media items */}
                            {msg.media && msg.media.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.media.map((m, mIdx) => (
                                  <div 
                                    key={m.id || mIdx} 
                                    className="relative group rounded-xl overflow-hidden border border-white/20 cursor-pointer shadow-xs select-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenLightbox(
                                        msg.media || [],
                                        mIdx,
                                        msg.text || (m.type === 'video' ? 'مقطع فيديو' : 'صورة مرفقة'),
                                        {
                                          displayName: bubbleUsername,
                                          avatar: bubbleAvatar,
                                          username: bubbleUsername
                                        }
                                      );
                                    }}
                                  >
                                    {m.type === 'video' ? (
                                      <div className="relative bg-black group/vid">
                                        <video 
                                          src={m.url} 
                                          className="w-full max-h-56 rounded-lg bg-black object-contain pointer-events-none" 
                                          preload="metadata"
                                        />
                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-all group-hover:bg-black/55">
                                          <div className="w-11 h-11 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                                            <Play className="w-5 h-5 fill-slate-900 text-slate-900 mr-0.5" />
                                          </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs font-medium">
                                          <Maximize2 className="w-3 h-3" />
                                          <span>تشغيل وتكبير الفيديو</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="relative group/img overflow-hidden">
                                        <img 
                                          src={m.url} 
                                          alt={m.caption || ''} 
                                          className="w-full max-h-56 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105" 
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-xs font-medium">
                                            <Maximize2 className="w-3 h-3" />
                                            <span>عرض بالحجم الكامل</span>
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className={`text-[9px] text-slate-400 block px-1 ${isMsgMe ? 'text-left' : 'text-right'}`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
                {/* Floating button to jump to bottom when user scrolled up and new messages arrive */}
                {showScrollBottomBtn && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom(true)}
                    className={`sticky bottom-2 mx-auto left-0 right-0 w-fit text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20 transition ${
                      isMarket ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <span>رسائل جديدة بالأسفل</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Attached preview before sending */}
              {attachedMedia.length > 0 && (
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-slate-500">المرفقات:</span>
                  {attachedMedia.map((m) => (
                    <div key={m.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-black">
                      {m.type === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => setAttachedMedia(prev => prev.filter(i => i.id !== m.id))}
                        className="absolute top-0.5 left-0.5 bg-rose-600 text-white rounded-full p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input Box */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
                {/* Hidden File Input for Direct Device File Selection */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                    isMarket ? 'hover:text-emerald-600' : 'hover:text-indigo-600'
                  }`}
                  title="اختيار صورة أو فيديو مباشرة من جهازك"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder={`اكتب رسالتك إلى ${activeConversation.participantDisplayName}...`}
                  className={`flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white transition ${
                    isMarket ? 'focus:ring-2 focus:ring-emerald-500' : 'focus:ring-2 focus:ring-indigo-500'
                  }`}
                />

                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() && attachedMedia.length === 0}
                  className={`text-white font-bold p-2.5 rounded-xl transition shadow-xs disabled:opacity-50 ${
                    isMarket 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                  title="إرسال"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
              {isMarket ? (
                <Store className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
              ) : (
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
              )}
              <p className="text-xs">
                {isMarket 
                  ? 'اختر استفساراً من القائمة لعرض المراسلات السابقة مع البائع أو المشتري' 
                  : 'اختر محادثة من القائمة لعرض الرسائل السابقة'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* New Chat Modal: Specialized based on mode */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isMarket ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                }`}>
                  {isMarket ? <Store className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-sm">
                  {isMarket ? 'استفسار جديد في المتجر' : 'بدء محادثة اجتماعية جديدة'}
                </h3>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">
                  {isMarket ? 'اسم مستخدم البائع أو المشتري (@username):' : 'اسم المستخدم المستلم (@username):'}
                </label>
                <input
                  type="text"
                  value={newChatUsername}
                  onChange={(e) => setNewChatUsername(e.target.value)}
                  placeholder={isMarket ? "اسم مستخدم البائع أو المشتري..." : "اسم المستخدم المستلم..."}
                  className={`w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 outline-none transition ${
                    isMarket ? 'focus:ring-2 focus:ring-emerald-500' : 'focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              {isMarket && (
                <div>
                  <label className="block font-bold mb-1">عنوان المنتج الرقمي (اختياري):</label>
                  <input
                    type="text"
                    value={newChatProductTitle}
                    onChange={(e) => setNewChatProductTitle(e.target.value)}
                    placeholder="مثال: حزمة قوالب Figma، كورس البرمجة..."
                    className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">نص الرسالة الأولى:</label>
                <textarea
                  value={newChatInitialText}
                  onChange={(e) => setNewChatInitialText(e.target.value)}
                  rows={3}
                  placeholder={isMarket ? "مرحباً، أود الاستفسار عن تفاصيل المنتج ورخصة الاستخدام..." : "اكتب رسالتك الترحيبية..."}
                  className={`w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 outline-none transition ${
                    isMarket ? 'focus:ring-2 focus:ring-emerald-500' : 'focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              <button
                onClick={handleCreateNewChat}
                className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
                  isMarket 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isMarket ? 'إرسال وبدء استفسار المتجر' : 'إرسال وبدء المحادثة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Chat */}
      {chatToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">حذف المحادثة</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف محادثتك مع <span className="font-bold text-slate-900 dark:text-white">{chatToDelete.name}</span>؟ سيتم مسح الرسائل وسجل المحادثة بالكامل.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChat}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف المحادثة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Lightbox Viewer Modal for Chat Media */}
      <MediaLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
        mediaList={lightboxState.mediaList}
        initialIndex={lightboxState.initialIndex}
        title={lightboxState.title}
        author={lightboxState.author}
      />

    </div>
  );
};
