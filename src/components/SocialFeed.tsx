import React, { useState } from 'react';
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
  Play
} from 'lucide-react';
import { Post, User } from '../types';

interface SocialFeedProps {
  posts: Post[];
  currentUser: User;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onOpenCreatePost: () => void;
  onOpenReportModal: (targetType: 'post' | 'product', targetId: string, targetName: string) => void;
  onOpenDirectChat: (username: string, displayName: string, avatar: string) => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({
  posts,
  currentUser,
  onLikePost,
  onAddComment,
  onOpenCreatePost,
  onOpenReportModal,
  onOpenDirectChat
}) => {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<Record<string, number>>({});

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
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fadeIn">
      
      {/* Creator Highlights / Stories Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            رواد المجتمع والناشرون الموثوقون
          </span>
          <span className="text-[11px] text-slate-400">قصص اليوم</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
          {/* Current user add story */}
          <div 
            onClick={onOpenCreatePost}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-600 dark:ring-indigo-500 p-0.5"
              />
              <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-1 shadow">
                <ImageIcon className="w-3 h-3" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">أضف قصتك</span>
          </div>

          {/* Sample creators */}
          {[
            { name: 'سارة', handle: 'sara_design', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80', active: true },
            { name: 'عمر', handle: 'omar_coder', img: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80', active: true },
            { name: 'نورة', handle: 'noura_academy', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80', active: false },
            { name: 'خالد', handle: 'khalid_tech', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', active: false },
          ].map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => onOpenDirectChat(item.handle, item.name, item.img)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 hover:opacity-90 transition"
              title={`مراسلة @${item.handle}`}
            >
              <div className="relative">
                <img
                  src={item.img}
                  alt={item.name}
                  className={`w-14 h-14 rounded-full object-cover p-0.5 ${
                    item.active 
                      ? 'ring-2 ring-emerald-500 shadow-sm' 
                      : 'ring-1 ring-slate-300 dark:ring-slate-700'
                  }`}
                />
                {item.active && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">@{item.handle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Share Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.displayName}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <button
            onClick={onOpenCreatePost}
            className="flex-1 text-right bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200/70 dark:border-slate-700/70 transition"
          >
            ماذا يدور في ذهنك اليوم يا {currentUser.displayName.split(' ')[0]}؟ شارك منشوراً، صوراً أو فيديو...
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreatePost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold transition"
            >
              <ImageIcon className="w-4 h-4" />
              صور وفيديو
            </button>
            <button
              onClick={onOpenCreatePost}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-bold transition"
            >
              <Video className="w-4 h-4" />
              فيديو توضيحي
            </button>
          </div>
          <button
            onClick={onOpenCreatePost}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-sm transition"
          >
            نشر الآن
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map(post => {
          const activeIndex = activeMediaIndex[post.id] || 0;
          const currentMedia = post.media?.[activeIndex];

          return (
            <article 
              key={post.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition hover:shadow-md"
            >
              {/* Header: Author Info */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={post.author.avatar}
                    alt={post.author.displayName}
                    className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {post.author.displayName}
                      </span>
                      {post.author.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-emerald-500" title="ناشر موثوق" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span 
                        onClick={() => onOpenDirectChat(post.author.username, post.author.displayName, post.author.avatar)}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-medium"
                      >
                        @{post.author.username}
                      </span>
                      <span>•</span>
                      <span>{post.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenDirectChat(post.author.username, post.author.displayName, post.author.avatar)}
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
                    {post.tags.map((tag, tIdx) => (
                      <span 
                        key={tIdx} 
                        className="text-[11px] bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Carousel / Viewer (Images and Videos) */}
              {post.media && post.media.length > 0 && (
                <div className="relative bg-black/95">
                  {currentMedia?.type === 'video' ? (
                    <div className="relative aspect-video max-h-96 flex items-center justify-center">
                      <video
                        src={currentMedia.url}
                        controls
                        className="w-full h-full object-contain max-h-96"
                        poster="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80"
                      />
                    </div>
                  ) : (
                    <div className="relative max-h-96 overflow-hidden flex items-center justify-center">
                      <img
                        src={currentMedia?.url}
                        alt={currentMedia?.caption || post.title}
                        className="w-full object-cover max-h-96 hover:scale-[1.01] transition duration-300"
                      />
                    </div>
                  )}

                  {/* Caption & Counter */}
                  <div className="absolute bottom-2 inset-x-3 flex items-center justify-between text-[11px] bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl pointer-events-none">
                    <span>{currentMedia?.caption || 'ملف وسائط مأمون'}</span>
                    {post.media.length > 1 && (
                      <span className="font-bold">{activeIndex + 1} / {post.media.length}</span>
                    )}
                  </div>

                  {/* Thumbnails Navigator if multiple media items */}
                  {post.media.length > 1 && (
                    <div className="p-2 bg-slate-950/80 flex items-center justify-center gap-2 overflow-x-auto">
                      {post.media.map((med, mIdx) => (
                        <button
                          key={med.id}
                          onClick={() => setActiveMediaIndex(prev => ({ ...prev, [post.id]: mIdx }))}
                          className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                            activeIndex === mIdx ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60'
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
                  ❤️ {post.likesCount} إعجاب
                </span>
                <div className="flex items-center gap-3">
                  <span>💬 {post.comments.length} تعليق</span>
                  <span>🔗 {post.sharesCount} مشاركة</span>
                </div>
              </div>

              {/* Buttons Bar */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                <button
                  onClick={() => onLikePost(post.id)}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    post.likedByMe
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{post.likedByMe ? 'معجب' : 'أعجبني'}</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById(`comment-input-${post.id}`);
                    el?.focus();
                  }}
                  className="py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تعليق</span>
                </button>

                <button
                  onClick={() => handleShare(post)}
                  className="py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition"
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
                    post.comments.map(comment => (
                      <div 
                        key={comment.id}
                        className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5"
                      >
                        <img
                          src={comment.userAvatar}
                          alt={comment.username}
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              @{comment.username}
                            </span>
                            <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 py-1">
                      كن أول من يترك تعليقاً على هذا المنشور!
                    </p>
                  )}
                </div>
              </div>

            </article>
          );
        })}
      </div>

    </div>
  );
};
