import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  Play,
  Maximize2
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaItem[];
  initialIndex?: number;
  title?: string;
  author?: {
    displayName: string;
    avatar: string;
    username?: string;
  };
}

// Helper to identify and suppress raw filenames or paths
const isFileName = (str?: string) => {
  if (!str) return false;
  const trimmed = str.trim();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|mov|webm|avi|mkv|pdf|heic)$/i.test(trimmed) ||
    /^(image|img|video|vid|file|photo|screenshot|media|chat_med)[\d_.-]/i.test(trimmed);
};

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  mediaList,
  initialIndex = 0,
  title,
  author
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Sync initial index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, mediaList.length - 1)));
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex, mediaList.length]);

  const currentMedia = mediaList[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoomLevel(1);
    }
  }, [currentIndex, mediaList.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoomLevel(1);
    }
  }, [currentIndex]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        // In Arabic RTL, right arrow normally moves to previous or next depending on layout
        handlePrev();
      } else if (e.key === 'ArrowLeft') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentMedia) return null;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.3, 0.7));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleDownload = () => {
    if (!currentMedia.url) return;
    const a = document.createElement('a');
    a.href = currentMedia.url;
    a.download = `media_${currentIndex + 1}.${currentMedia.type === 'video' ? 'mp4' : 'jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 backdrop-blur-sm border-b border-white/10 z-20">
        {/* Left / Author & Title info */}
        <div className="flex items-center gap-3 min-w-0">
          {author && (
            <img
              src={author.avatar}
              alt={author.displayName}
              className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
            />
          )}
          <div className="min-w-0">
            {author && (
              <div className="text-white font-bold text-xs sm:text-sm truncate">
                {author.displayName}
              </div>
            )}
            <div className="text-slate-400 text-[11px] truncate">
              {title && !isFileName(title)
                ? title
                : (currentMedia.caption && !isFileName(currentMedia.caption)
                    ? currentMedia.caption
                    : (currentMedia.type === 'video' ? 'مقطع فيديو' : 'صورة'))}
            </div>
          </div>
        </div>

        {/* Center: Counter if multiple items */}
        {mediaList.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-white text-xs font-bold">
            <span>{currentIndex + 1}</span>
            <span className="text-white/50">/</span>
            <span>{mediaList.length}</span>
          </div>
        )}

        {/* Right / Controls & Close button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls (for images only) */}
          {currentMedia.type === 'image' && (
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition text-[11px] font-bold flex items-center gap-1"
                  title="إعادة ضبط الحجم"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>100%</span>
                </button>
              )}
            </div>
          )}

          {/* Open in new tab / download */}
          <button
            onClick={handleDownload}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="تحميل / فتح الرابط المباشر"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={currentMedia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="فتح في نافذة منفصلة"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-rose-600/80 text-white rounded-xl transition ml-1"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Display Stage */}
      <div 
        className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Previous Button */}
        {mediaList.length > 1 && currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md border border-white/20 transition shadow-xl hover:scale-105 cursor-pointer"
            title="السابق"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Media Element Display */}
        <div className="relative max-h-[82vh] max-w-[94vw] flex items-center justify-center transition-all duration-200">
          {currentMedia.type === 'video' ? (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] max-w-[92vw] rounded-2xl shadow-2xl object-contain border border-white/10 bg-black"
            />
          ) : (
            <img
              key={currentMedia.url}
              src={currentMedia.url}
              alt={currentMedia.caption || title || 'صورة المنشور'}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-[80vh] max-w-[92vw] rounded-2xl shadow-2xl object-contain transition-transform duration-200 cursor-grab active:cursor-grabbing border border-white/10"
              draggable={false}
            />
          )}
        </div>

        {/* Next Button */}
        {mediaList.length > 1 && currentIndex < mediaList.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md border border-white/20 transition shadow-xl hover:scale-105 cursor-pointer"
            title="التالي"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Bar: Caption & Thumbnails */}
      <div className="bg-black/70 backdrop-blur-sm border-t border-white/10 px-4 py-3 z-20 space-y-2">
        {/* Caption text - suppressed if raw filename */}
        {currentMedia.caption && !isFileName(currentMedia.caption) && (
          <p className="text-center text-xs sm:text-sm text-slate-200 font-medium max-w-2xl mx-auto truncate">
            {currentMedia.caption}
          </p>
        )}

        {/* Thumbnails Carousel (when multiple media items) */}
        {mediaList.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {mediaList.map((item, idx) => (
              <button
                key={item.id || idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                }}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                  currentIndex === idx
                    ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/50'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
