import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ShieldAlert, 
  Image as ImageIcon, 
  Video, 
  Send, 
  BadgeCheck,
  Check,
  Sparkles,
  Play,
  Maximize2,
  Trash2,
  Search,
  X,
  Hash,
  Filter,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Post, User, MediaItem } from '../types';
import { MediaLightboxModal } from './MediaLightboxModal';
import { formatRelativeTime } from '../utils/dateUtils';
import { isPostLikedByUser } from '../utils/likeUtils';

interface SocialFeedProps {
  posts: Post[];
  currentUser: User;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onOpenCreatePost: () => void;
  onOpenReportModal: (targetType: 'post' | 'product', targetId: string, targetName: string) => void;
  onOpenDirectChat: (username: string, displayName: string, avatar: string) => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({
  posts,
  currentUser,
  onLikePost,
  onAddComment,
  onDeleteComment,
  onOpenCreatePost,
  onOpenReportModal,
  onOpenDirectChat
}) => {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Auto-refresh relative times ('منذ ساعة', 'منذ 6 ساعات', etc.) every 30 seconds
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Extract all unique tags across all posts
  const availableTags = useMemo(() => {
    const tagCountMap: Record<string, number> = {};
    posts.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          const clean = t.trim().replace(/^#/, '');
          if (clean) {
            tagCountMap[clean] = (tagCountMap[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [posts]);

  // Filter posts based on search query (title, description, author name/username, tags) and selected tag
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // 1. Tag filter
      if (selectedTag) {
        const hasTag = post.tags?.some(t => t.trim().replace(/^#/, '').toLowerCase() === selectedTag.toLowerCase());
        if (!hasTag) return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchDesc = post.description?.toLowerCase().includes(q);
      const matchAuthor = post.author?.displayName?.toLowerCase().includes(q) ||
                          post.author?.username?.toLowerCase().includes(q);
      const matchTags = post.tags?.some(t => t.toLowerCase().includes(q.replace(/^#/, '')));

      return Boolean(matchTitle || matchDesc || matchAuthor || matchTags);
    });
  }, [posts, searchQuery, selectedTag]);

  // Lightbox Modal state for full screen image/video viewing
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

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleShare = (post: Post) => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedPostId(post.id);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 animate-fadeIn overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Feed Column (Full width on mobile/tablet, 8-cols on desktop) */}
        <div className="w-full lg:col-span-8 space-y-4 sm:space-y-6">
          {/* Quick Share Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.displayName}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
          />
          <button
            onClick={onOpenCreatePost}
            className="flex-1 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-medium border border-slate-200/70 dark:border-slate-700/70 transition truncate min-w-0"
          >
            ماذا يدور في ذهنك اليوم يا {currentUser.displayName.split(' ')[0]}؟ شارك منشوراً، صوراً أو فيديو...
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenCreatePost}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold transition text-[11px] sm:text-xs"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>صور وفيديو</span>
            </button>
            <button
              onClick={onOpenCreatePost}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-bold transition text-[11px] sm:text-xs"
            >
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>فيديو توضيحي</span>
            </button>
          </div>
          <button
            onClick={onOpenCreatePost}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 sm:px-4 py-1.5 rounded-xl text-xs shadow-sm transition shrink-0"
          >
            نشر الآن
          </button>
        </div>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 sm:space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في المنشورات، الكلمات المفتاحية، الوسوم #، أو أسماء الناشرين..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pr-10 pl-10 py-2 sm:py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Hashtags / Tags Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs -mx-1 px-1 scrollbar-none">
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 shrink-0 text-[11px] font-medium pl-1">
            <Filter className="w-3 h-3" />
            <span>الوسوم:</span>
          </div>

          <button
            onClick={() => setSelectedTag(null)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              selectedTag === null
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            الكل
          </button>

          {availableTags.map(tag => {
            const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(isSelected ? null : tag)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="w-3 h-3 opacity-70" />
                <span>{tag}</span>
              </button>
            );
          })}

          {(searchQuery || selectedTag) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag(null);
              }}
              className="shrink-0 text-[11px] text-rose-500 hover:underline mr-auto font-medium px-2 py-1"
            >
              إعادة ضبط الفلترة
            </button>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {searchQuery || selectedTag ? <Search className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {searchQuery || selectedTag ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد منشورات حتى الآن'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {searchQuery || selectedTag
                  ? `لم نتمكن من العثور على أي منشور يطابق "${searchQuery || selectedTag}". جرب البحث بكلمات أخرى أو اختر وسماً مختلفاً.`
                  : 'مجتمع سوشيال كارت جاهز لنشر أول محتوى حقيقي. كن أول من يشارك أفكاره، أعماله أو نصائحه!'}
              </p>
            </div>
            {searchQuery || selectedTag ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء البحث وعرض كل المنشورات</span>
              </button>
            ) : (
              <button
                onClick={onOpenCreatePost}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>نشر أول منشور الآن</span>
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map(post => {
          const activeIndex = activeMediaIndex[post.id] || 0;
          const currentMedia = post.media?.[activeIndex];
          const isGuest = !currentUser || !currentUser.id || currentUser.id === 'guest' || !currentUser.email;
          const isLiked = !isGuest && isPostLikedByUser(post, currentUser);

          return (
            <article 
              key={post.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition hover:shadow-md"
            >
              {/* Header: Author Info */}
              <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <img
                    src={post.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={post.author?.displayName || 'مستخدم'}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {post.author?.displayName || 'مستخدم'}
                      </span>
                      {post.author?.isVerified && (
                        <span title="ناشر موثوق" className="inline-flex">
                          <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span 
                        onClick={() => onOpenDirectChat(
                          post.author?.username || 'user',
                          post.author?.displayName || 'مستخدم',
                          post.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                        )}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-medium"
                      >
                        @{post.author?.username || 'user'}
                      </span>
                      <span>•</span>
                      <span>{formatRelativeTime(post.createdAt, post.id)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenDirectChat(
                      post.author?.username || 'user',
                      post.author?.displayName || 'مستخدم',
                      post.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                    )}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold px-2.5 py-1 rounded-lg transition"
                  >
                    مراسلة
                  </button>

                  <button
                    onClick={() => onOpenReportModal('post', post.id, post.title)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition"
                    title="إبلاغ عن محتوى أو شبهة احتيال"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3 space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {post.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {post.description}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tag, tIdx) => {
                      const cleanTag = tag.trim().replace(/^#/, '');
                      const isSelected = selectedTag?.toLowerCase() === cleanTag.toLowerCase();
                      return (
                        <button 
                          key={tIdx} 
                          type="button"
                          onClick={() => setSelectedTag(isSelected ? null : cleanTag)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                          }`}
                          title={`تصفية المنشورات حسب الوسم #${cleanTag}`}
                        >
                          #{cleanTag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Media Carousel / Viewer (Images and Videos) */}
              {post.media && post.media.length > 0 && (
                <div className="relative bg-slate-950 dark:bg-black overflow-hidden select-none">
                  {/* Ambient blurred backdrop for seamless edge aesthetics */}
                  {currentMedia?.type !== 'video' && currentMedia?.url && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-25 scale-110 pointer-events-none"
                      style={{ backgroundImage: `url(${currentMedia.url})` }}
                    />
                  )}

                  {/* Media Content with Natural Responsive Aspect Ratio */}
                  {currentMedia?.type === 'video' ? (
                    <div className="relative w-full flex items-center justify-center min-h-[260px] max-h-[520px] bg-black/90">
                      <video
                        src={currentMedia.url}
                        controls
                        playsInline
                        className="w-full max-h-[520px] object-contain mx-auto"
                        poster="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80"
                      />
                      {/* Fullscreen lightbox button for video */}
                      <button
                        onClick={() => handleOpenLightbox(post.media, activeIndex, post.title, post.author)}
                        className="absolute top-3 left-3 bg-black/70 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md border border-white/20 transition hover:scale-105 z-10 cursor-pointer shadow-lg"
                        title="عرض الفيديو بشاشة كاملة ومفردة"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleOpenLightbox(post.media, activeIndex, post.title, post.author)}
                      className="relative w-full flex items-center justify-center min-h-[260px] max-h-[520px] cursor-pointer group/media overflow-hidden"
                      title="انقر لرؤية الصورة لوحدها بالحجم الكامل"
                    >
                      <img
                        src={currentMedia?.url}
                        alt={post.title || 'صورة المنشور'}
                        className="relative z-10 w-auto h-auto max-w-full max-h-[520px] object-contain mx-auto transition-transform duration-300 group-hover/media:scale-[1.015]"
                      />

                      {/* Hover Hint Overlay */}
                      <div className="absolute inset-0 z-20 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                        <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-white/20">
                          <Maximize2 className="w-4 h-4 text-indigo-400" />
                          <span>انقر لرؤية الصورة بالحجم الكامل</span>
                        </div>
                      </div>

                      {/* Quick Expand Button in corner */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLightbox(post.media, activeIndex, post.title, post.author);
                        }}
                        className="absolute top-3 left-3 z-30 bg-black/60 hover:bg-black/90 text-white p-2 rounded-xl backdrop-blur-md border border-white/20 transition hover:scale-105 cursor-pointer shadow-lg"
                        title="تكبير وعرض بالحجم الكامل"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Multiple Media Counter Badge Only (no filenames or captions) */}
                  {post.media.length > 1 && (
                    <div className="absolute bottom-2 left-3 text-[11px] bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-bold pointer-events-none z-20 shadow-md">
                      <span>{activeIndex + 1} / {post.media.length}</span>
                    </div>
                  )}

                  {/* Thumbnails Navigator if multiple media items */}
                  {post.media.length > 1 && (
                    <div className="p-2 bg-slate-950/90 flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10 z-20">
                      {post.media.map((med, mIdx) => (
                        <button
                          key={med.id || mIdx}
                          onClick={() => setActiveMediaIndex(prev => ({ ...prev, [post.id]: mIdx }))}
                          className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                            activeIndex === mIdx ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/50' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          {med.type === 'video' ? (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                              <Play className="w-4 h-4 fill-white" />
                            </div>
                          ) : (
                            <img src={med.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Stats Bar */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">
                  ❤️ {post.likesCount || 0} إعجاب
                </span>
                <div className="flex items-center gap-3">
                  <span>💬 {(post.comments || []).length} تعليق</span>
                  <span>🔗 {post.sharesCount || 0} مشاركة</span>
                </div>
              </div>

              {/* Buttons Bar */}
              <div className="px-2 sm:px-4 py-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1 sm:gap-2">
                <button
                  onClick={() => onLikePost(post.id)}
                  className={`py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition ${
                    isLiked
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isLiked ? 'معجب' : 'أعجبني'}</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById(`comment-input-${post.id}`);
                    el?.focus();
                  }}
                  className="py-2 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 sm:gap-1.5 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>تعليق</span>
                </button>

                <button
                  onClick={() => handleShare(post)}
                  className="py-2 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 sm:gap-1.5 transition"
                >
                  {copiedPostId === post.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>مشاركة</span>
                    </>
                  )}
                </button>
              </div>

              {/* Comments Section */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Add comment input */}
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <input
                    id={`comment-input-${post.id}`}
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommentSubmit(post.id);
                    }}
                    placeholder="اكتب تعليقاً محترماً باسمك..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                  <button
                    onClick={() => handleCommentSubmit(post.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition"
                    title="إرسال التعليق"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Comments list */}
                <div className="space-y-2">
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map(comment => {
                      // Strictly restrict comment deletion to the comment author only
                      const canDelete = currentUser && currentUser.id !== 'guest' && (
                        (comment.username && currentUser.username && comment.username.toLowerCase() === currentUser.username.toLowerCase()) ||
                        (comment.userId && currentUser.id && comment.userId === currentUser.id)
                      );

                      return (
                        <div 
                          key={comment.id}
                          className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 group"
                        >
                          <img
                            src={comment.userAvatar}
                            alt={comment.username}
                            onClick={() => onOpenDirectChat(comment.username, comment.username, comment.userAvatar)}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 mt-0.5 cursor-pointer hover:opacity-80 transition shrink-0"
                            title={`مراسلة @${comment.username}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span 
                                onClick={() => onOpenDirectChat(comment.username, comment.username, comment.userAvatar)}
                                className="font-bold text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                              >
                                @{comment.username}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-slate-400">{formatRelativeTime(comment.createdAt, comment.id)}</span>
                                {canDelete && onDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteComment(post.id, comment.id)}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md transition"
                                    title="حذف هذا التعليق"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 py-1">
                      كن أول من يترك تعليقاً على هذا المنشور!
                    </p>
                  )}
                </div>
              </div>

            </article>
          );
        })
      )}
          </div>
        </div>

        {/* Desktop Sidebar (Only visible on lg: and above screens) */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-20">
          {/* User Mini Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-3.5 mb-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {currentUser.displayName}
                  </h3>
                  {currentUser.isVerifiedSeller && (
                    <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">@{currentUser.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center mb-4">
              <div>
                <span className="block text-xs font-black text-slate-900 dark:text-white">
                  {currentUser.trustScore ?? 98}%
                </span>
                <span className="text-[10px] text-slate-400">معدل الثقة</span>
              </div>
              <div>
                <span className="block text-xs font-black text-slate-900 dark:text-white">
                  {posts.filter(p => p.author?.id === currentUser.id || p.userId === currentUser.id).length}
                </span>
                <span className="text-[10px] text-slate-400">المنشورات</span>
              </div>
              <div>
                <span className="block text-xs font-black text-slate-900 dark:text-white">
                  {currentUser.isVerifiedSeller ? 'بائع موثق' : 'عضو نشط'}
                </span>
                <span className="text-[10px] text-slate-400">الحالة</span>
              </div>
            </div>

            <button
              onClick={onOpenCreatePost}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>مشاركة منشور في المجتمع</span>
            </button>
          </div>

          {/* Trending Topics & Hashtags Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">الوسوم الرائجة</h4>
              </div>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {availableTags.slice(0, 6).map(tag => {
                const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition text-right cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{tag}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">تصفية</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escrow Guarantee Highlight Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-extrabold text-xs">ضمان المعاملات المالية Escrow</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              كل معاملة شراء لمنتج رقمي محمية تلقائياً. أموالك محفوظة في محفظة الضمان لمدة 14 يوماً مع إمكانية استرجاع الأموال فوراً إذا لم يطابق الملف الوصف.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>أمان بنكي 100%</span>
              <span className="text-emerald-400 font-bold">معتمد</span>
            </div>
          </div>
        </aside>

      </div>

      {/* Fullscreen Media Lightbox Viewer Modal */}
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
