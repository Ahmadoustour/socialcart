import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Conversation, User, MediaItem } from '../types';
import { scanUrlOrFile } from '../utils/security';

interface MessagesHubProps {
  conversations: Conversation[];
  currentUser: User;
  mode: 'social' | 'market';
  onSendMessage: (conversationId: string, text: string, media?: MediaItem[]) => void;
  onStartNewConversation: (participantUsername: string, participantName: string, avatar: string, type: 'social' | 'market', initialMessage: string, productTitle?: string) => void;
  initialActiveConvId?: string;
  onMarkConversationRead?: (conversationId: string) => void;
  onMarkAllConversationsRead?: (type?: 'social' | 'market') => void;
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
  onMarkConversationRead,
  onMarkAllConversationsRead,
  onNavigateToMarket,
  onNavigateToFeed
}) => {
  // Only show conversations matching the current active section (social or market)
  const isMarket = mode === 'market';
  const modeConversations = conversations.filter(c => c.type === mode);

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (initialActiveConvId && modeConversations.some(c => c.id === initialActiveConvId)) {
      return initialActiveConvId;
    }
    return modeConversations[0]?.id || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Media attachment state in chat
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [newChatProductTitle, setNewChatProductTitle] = useState('');
  const [newChatInitialText, setNewChatInitialText] = useState('');

  // Auto-switch active conversation if not in current mode
  useEffect(() => {
    const currentMatches = modeConversations.some(c => c.id === activeConvId);
    if (!currentMatches) {
      setActiveConvId(modeConversations[0]?.id || '');
    }
  }, [mode, conversations]);

  // Mark all unread conversations of this section as read on mount
  const onMarkAllRef = useRef(onMarkAllConversationsRead);
  useEffect(() => {
    onMarkAllRef.current = onMarkAllConversationsRead;
  }, [onMarkAllConversationsRead]);

  useEffect(() => {
    if (onMarkAllRef.current) {
      onMarkAllRef.current(mode);
    }
  }, [mode]);

  // Mark active conversation as read
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
    const matchSearch = c.participantDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.participantUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.relatedProductTitle && c.relatedProductTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  const activeConversation = conversations.find(c => c.id === activeConvId);

  const handleSend = () => {
    if (!messageInput.trim() && attachedMedia.length === 0) return;
    if (!activeConvId) return;

    onSendMessage(activeConvId, messageInput.trim(), attachedMedia.length > 0 ? attachedMedia : undefined);
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

  const unreadSectionCount = modeConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="max-w-6xl mx-auto pb-16 animate-fadeIn">
      
      {/* Header: Customized purely for Market or Social */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {isMarket ? 'رسائل واستفسارات المتجر' : 'المحادثات والرسائل الاجتماعية'}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isMarket 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}>
                {isMarket ? 'مخصصة للمتجر فقط' : 'محادثات مباشرة فقط'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isMarket 
                ? 'استفسارات المنتجات الرقمية، والتواصل بين المشترين والبائعين وحماية الضمان' 
                : 'الرسائل والمحادثات المباشرة مع الأصدقاء والمبدعين وصناع المحتوى'}
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
            <span>{isMarket ? 'استفسار جديد في المتجر' : 'محادثة اجتماعية جديدة'}</span>
          </button>
        </div>
      </div>

      {/* Main Container: Left Side (Conversation Cards) & Right Side (Chat View) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Col: Conversation Cards (Single Dedicated Section, No Mixed Tabs) */}
        <div className="lg:col-span-4 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/40 dark:bg-slate-900/40">
          
          {/* Search bar */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isMarket ? "ابحث في البائعين أو اسم المنتج..." : "ابحث في الأصدقاء والمحادثات..."}
                className={`w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 transition ${
                  isMarket ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500'
                }`}
              />
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
                        <span>استكشاف منشورات السوشيال</span>
                      </button>
                    )
                  )
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConvId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      if (onMarkConversationRead) onMarkConversationRead(conv.id);
                    }}
                    className={`p-3 rounded-2xl cursor-pointer transition border flex items-start gap-3 select-none ${
                      isActive 
                        ? (isMarket 
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs' 
                            : 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs')
                        : 'bg-white dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={conv.participantAvatar}
                        alt={conv.participantDisplayName}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
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
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {conv.participantDisplayName}
                          </span>
                          {conv.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageTime}</span>
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className={`text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold shrink-0 mr-1 ${
                            isMarket ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Active Chat Thread View */}
        <div className="lg:col-span-8 flex flex-col h-[600px] bg-white dark:bg-slate-900">
          {activeConversation ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConversation.participantAvatar}
                    alt={activeConversation.participantDisplayName}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {activeConversation.participantDisplayName}
                      </span>
                      {activeConversation.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-emerald-500" />
                      )}
                      <span className="text-xs text-slate-400 font-normal">
                        (@{activeConversation.participantUsername})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
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

                <div className="text-left text-xs">
                  {isMarket && activeConversation.relatedProductTitle && (
                    <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      {activeConversation.relatedProductTitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages Bubbles Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
                {activeConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 max-w-[80%] ${
                      msg.isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'
                    }`}
                  >
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderUsername}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 mt-0.5"
                    />

                    <div className="space-y-1">
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          msg.isMe
                            ? (isMarket 
                                ? 'bg-emerald-600 text-white rounded-tr-none' 
                                : 'bg-indigo-600 text-white rounded-tr-none')
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Media items */}
                        {msg.media && msg.media.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.media.map(m => (
                              <div key={m.id} className="rounded-xl overflow-hidden border border-white/20">
                                {m.type === 'video' ? (
                                  <video src={m.url} controls className="w-full max-h-48 rounded-lg bg-black" />
                                ) : (
                                  <img src={m.url} alt={m.caption || ''} className="w-full max-h-48 object-cover" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className={`text-[9px] text-slate-400 block px-1 ${msg.isMe ? 'text-left' : 'text-right'}`}>
                        {msg.createdAt}
                      </span>
                    </div>
                  </div>
                ))}
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
                  placeholder={isMarket ? "مثال: sara_design" : "مثال: omar_coder"}
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

    </div>
  );
};
