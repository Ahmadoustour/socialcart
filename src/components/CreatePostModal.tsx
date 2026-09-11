import React, { useState } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Video, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { MediaItem } from '../types';
import { scanUrlOrFile, scanUrlLive, scanContentLive } from '../utils/security';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, media: MediaItem[], tags: string[]) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  
  // Media input state
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaCaptionInput, setMediaCaptionInput] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  // Preset media quick picks for testing
  const PRESETS = [
    { type: 'image' as const, url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80', label: 'صورة عمل' },
    { type: 'image' as const, url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80', label: 'رسم بياني' },
    { type: 'video' as const, url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-keyboard-and-writing-code-41480-large.mp4', label: 'فيديو برمجي' },
  ];

  const isVideoUrl = (url: string) => {
    return /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url) || url.includes('youtube.com') || url.includes('vimeo.com');
  };

  const handleAddMedia = async (urlToAdd?: string, typeToAdd?: 'image' | 'video', captionToAdd?: string) => {
    const url = urlToAdd || mediaUrlInput.trim();
    const type = typeToAdd || (isVideoUrl(url) ? 'video' : 'image');
    const caption = captionToAdd || mediaCaptionInput.trim();

    if (!url) return;

    setIsScanning(true);
    setSecurityError(null);

    // Run deep security scan on URL or media link
    const scan = await scanUrlLive(url, type);
    setIsScanning(false);

    if (!scan.isSafe) {
      setSecurityError(scan.threats.join(' - '));
      return;
    }

    const newItem: MediaItem = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      url,
      caption: caption || (type === 'video' ? 'مقطع فيديو توضيحي' : 'صورة مرفقة')
    };

    // Adds to the list without clearing existing ones!
    setMediaList(prev => [...prev, newItem]);
    setMediaUrlInput('');
    setMediaCaptionInput('');
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security check on extension and file name
    const scan = scanUrlOrFile(file.name);
    if (!scan.isSafe) {
      setSecurityError(scan.threats.join(' - '));
      return;
    }

    const isVid = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleAddMedia(result, isVid ? 'video' : 'image', file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (idToRemove: string) => {
    // Only removes THIS specific item! (Fixes bug reported by user)
    setMediaList(prev => prev.filter(item => item.id !== idToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('يرجى كتابة عنوان وتفاصيل للمنشور');
      return;
    }

    // Scan the whole post text and media links for malicious content
    setIsScanning(true);
    setSecurityError(null);
    const contentCheck = await scanContentLive(
      `${title} ${description}`,
      mediaList.map(m => m.url)
    );
    setIsScanning(false);

    if (!contentCheck.isSafe) {
      setSecurityError(`تم منع النشر: ${contentCheck.threats.join(' | ')}`);
      return;
    }

    const tags = tagsInput
      .split(/[\s,#]+/)
      .map(t => t.trim())
      .filter(Boolean);

    onSubmit(title.trim(), description.trim(), mediaList, tags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              ✍️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إنشاء منشور جديد في المجتمع
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                شارك أفكارك وتجاربك مع مجتمعك باسمك الموثوق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              عنوان المنشور:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تجربتي في بناء وتصميم المنتجات الرقمية الحديثة..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-xs font-semibold"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              نص المنشور والتفاصيل:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="اكتب ما يدور في ذهنك... يمكنك مشاركة نصائح، روابط، أو شروحات تفاعلية"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-xs leading-relaxed"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              الوسوم والهاشتاغات (افصل بمسافة):
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="تصميم برمجة تجارة_رقمية استراتيجيات"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white text-xs"
            />
          </div>

          {/* Media Attachments Section (Multiple Images and Videos) */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                إرفاق الصور والفيديوهات المتعددة ({mediaList.length} مرفقة)
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> فحص أمني تلقائي
              </span>
            </div>

            {/* Existing added media list with INDIVIDUAL delete buttons! */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {mediaList.map((item) => (
                  <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-black">
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                    
                    {/* Badge */}
                    <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/80 text-white px-1.5 py-0.5 rounded font-bold">
                      {item.type === 'video' ? 'فيديو' : 'صورة'}
                    </span>

                    {/* Single remove button! */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute top-1 left-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md shadow-md transition"
                      title="إزالة هذا الملف فقط"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Direct File Picker & URL input */}
            <div className="space-y-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
              {/* Primary: Direct Local File Upload */}
              <label className="flex items-center justify-center gap-2 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 font-bold transition">
                <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs">اختيار صورة أو فيديو مباشرة من الملفات</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Optional: Add via web URL */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => {
                    setMediaUrlInput(e.target.value);
                    setSecurityError(null);
                  }}
                  placeholder="أو ضع رابط صورة / فيديو خارجي (https://...)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />

                <button
                  type="button"
                  onClick={() => handleAddMedia()}
                  disabled={!mediaUrlInput.trim() || isScanning}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Quick Presets for Demo */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">عينات سريعة:</span>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddMedia(p.url, p.type, p.label)}
                    className="text-[10px] bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-300"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Security error warning */}
              {securityError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>تحذير أمني: {securityError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>نشر المنشور الآن</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
