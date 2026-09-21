import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  Image as ImageIcon, 
  Video, 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  UploadCloud, 
  Sparkles 
} from 'lucide-react';
import { MediaItem } from '../types';
import { scanUrlOrFile, scanUrlLive, scanContentLive } from '../utils/security';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productData: {
    title: string;
    description: string;
    category: string;
    price: number;
    originalPrice?: number;
    media: MediaItem[];
    fileUrl: string;
    downloadSize: string;
  }) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('تصاميم وجرافيك');
  const [price, setPrice] = useState<number | ''>('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [fileUrl, setFileUrl] = useState('');
  const [downloadSize, setDownloadSize] = useState('45 MB');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  // Media input helper
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaCaptionInput, setMediaCaptionInput] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const CATEGORIES = ['تصاميم وجرافيك', 'برمجة وتطوير', 'كتب وأدلة رقمية', 'قوالب وأدوات'];

  const handleAddMedia = async (urlToAdd?: string, typeToAdd?: 'image' | 'video', captionToAdd?: string) => {
    const url = urlToAdd || mediaUrlInput.trim();
    const type = typeToAdd || mediaType;
    const caption = captionToAdd || mediaCaptionInput.trim();

    if (!url) return;

    // Deep Security check
    const scan = await scanUrlLive(url, type);
    if (!scan.isSafe) {
      setSecurityError(scan.threats.join(' - '));
      return;
    }

    setSecurityError(null);
    const newItem: MediaItem = {
      id: `prod_med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      url,
      caption: ''
    };

    setMediaList(prev => [...prev, newItem]);
    setMediaUrlInput('');
    setMediaCaptionInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        handleAddMedia(result, isVid ? 'video' : 'image', '');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (idToRemove: string) => {
    setMediaList(prev => prev.filter(item => item.id !== idToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim() || !description.trim() || !price || !fileUrl.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية وتوفير رابط الملف الرقمي');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Scan digital file URL for security
      const scan = await scanUrlLive(fileUrl, 'file');
      if (!scan.isSafe) {
        alert(`تحذير أمني بخصوص رابط الملف الرقمي:\n${scan.threats.join('\n')}`);
        return;
      }

      // 2. Scan entire description and media list for embedded threats
      const contentCheck = await scanContentLive(
        `${title} ${description}`,
        [fileUrl, ...mediaList.map(m => m.url)]
      );
      if (!contentCheck.isSafe) {
        alert(`تم رفض نشر المنتج بسبب محتوى غير آمن:\n${contentCheck.threats.join('\n')}`);
        return;
      }

      const defaultMedia: MediaItem[] = mediaList.length > 0 ? mediaList : [
        {
          id: 'default_img',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
          caption: 'غلاف المنتج الافتراضي'
        }
      ];

      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        media: defaultMedia,
        fileUrl: fileUrl.trim(),
        downloadSize: downloadSize.trim() || '50 MB'
      });

      onClose();
    } catch (err: any) {
      console.warn('Notice: Submit product error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto my-auto mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              🛍️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إدراج منتج رقمي جديد للبيع
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تسليم فوري للملف مع حماية كاملة لحقوق البائع والمشتري
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
              اسم المنتج الرقمي:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: حزمة أيقونات 3D عالية الدقة، أو كود متجر إلكتروني..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-semibold"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              وصف ومميزات المنتج بالتفصيل:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="اشرح للمشتري ما الذي سيحصل عليه وكيفية استخدام المنتج..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white leading-relaxed"
              required
            />
          </div>

          {/* Category & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                التصنيف:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                السعر ($ بالدولار):
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="25"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                السعر قبل الخصم (اختياري):
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="40"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
              />
            </div>
          </div>

          {/* File Link and Secret Protection */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <label className="font-bold text-emerald-900 dark:text-emerald-200">
                رابط الملف الرقمي السري (يُسلّم للمشتري فقط بعد الدفع):
              </label>
            </div>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/file/... أو رابط مباشر .zip / .pdf"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              🛡️ لن يظهر هذا الرابط في صفحة المنتج العامة مطلقاً، ويتم تشفيره بنكياً وحفظه في خوادمنا.
            </p>
          </div>

          {/* Multi-Media Gallery (Images and Demo Videos) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                معرض صور وفيديوهات المعاينة للمنتج ({mediaList.length} مرفقة)
              </span>
              <span className="text-[11px] text-slate-400">يدعم عدة صور وفيديو توضيحي</span>
            </div>

            {/* Existing previews with individual remove! */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {mediaList.map((item) => (
                  <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-black">
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] bg-slate-900/80 text-white px-1.5 py-0.5 rounded font-bold">
                      {item.type === 'video' ? 'فيديو' : 'صورة'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute top-1 left-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md transition"
                      title="حذف هذا العنصر فقط"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add media form */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                  className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="image">صورة</option>
                  <option value="video">فيديو</option>
                </select>

                <input
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => {
                    setMediaUrlInput(e.target.value);
                    setSecurityError(null);
                  }}
                  placeholder="ضع رابط صورة المعاينة أو الفيديو (https://...)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="button"
                  onClick={() => handleAddMedia()}
                  disabled={!mediaUrlInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Local File Upload Button */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold transition">
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span>أو ارفع من جهازك</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddMedia('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80', 'image', 'لقطة شاشة')}
                    className="text-[10px] bg-white dark:bg-slate-800 border px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300"
                  >
                    + عينة صورة لوحة تحكم
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMedia('https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1728-large.mp4', 'video', 'فيديو استعراض')}
                    className="text-[10px] bg-white dark:bg-slate-800 border px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300"
                  >
                    + عينة فيديو برمجي
                  </button>
                </div>
              </div>

              {securityError && (
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>تحذير أمني: {securityError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Guarantee Statement */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              إقرار البائع: أوافق على شروط حماية الضمان المالي Escrow. سيتم حجز قيمة الطلب لمدة 14 يوماً لصالح المشتري قبل تحريرها لمحفظتي لضمان جودة المنتج الرقمي.
            </span>
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
              disabled={isSubmitting}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 select-none ${
                isSubmitting ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري فحص وإدراج المنتج...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>إدراج المنتج في الماركت الآن</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
