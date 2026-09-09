import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  ShoppingCart, 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  BadgeCheck, 
  MessageSquare, 
  Sparkles, 
  Download,
  Eye,
  SlidersHorizontal,
  Play
} from 'lucide-react';
import { Product, User } from '../types';

interface MarketplaceProps {
  products: Product[];
  currentUser: User;
  onAddToCart: (product: Product) => void;
  onDirectBuy: (product: Product) => void;
  onOpenSellModal: () => void;
  onOpenReportModal: (targetType: 'post' | 'product', targetId: string, targetName: string) => void;
  onOpenDirectChat: (username: string, displayName: string, avatar: string, productTitle?: string) => void;
  onViewProductReviews: (product: Product) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({
  products,
  currentUser,
  onAddToCart,
  onDirectBuy,
  onOpenSellModal,
  onOpenReportModal,
  onOpenDirectChat,
  onViewProductReviews
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState<'rating' | 'price-asc' | 'price-desc' | 'sales'>('rating');

  const CATEGORIES = ['الكل', 'تصاميم وجرافيك', 'برمجة وتطوير', 'كتب وأدلة رقمية', 'قوالب وأدوات'];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'الكل' || p.category === selectedCategory;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.seller.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.seller.rating - a.seller.rating;
      if (sortBy === 'sales') return b.salesCount - a.salesCount;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });
  }, [products, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-14 animate-fadeIn">
      
      {/* Marketplace Banner / Escrow Guarantee Hero */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-400/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-200 border border-emerald-300/30">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>حماية الضمان المالي Escrow 100% لجميع المعاملات</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            سوق المنتجات الرقمية الموثوقة والآمنة
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            اشترِ القوالب البرمجية، التصاميم والكتب الرقمية مع ضمان استرجاع الأموال خلال 14 يوماً. يتم حجز أموالك في محفظة الضمان حتى تتأكد من سلامة الملف.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
            <button
              onClick={onOpenSellModal}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>ابدأ بيع منتجاتك الرقمية الآن</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن قوالب، أكواد برمجية، تصاميم، أو اسم البائع..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="rating">الأعلى تقييماً للبائع ⭐</option>
              <option value="sales">الأكثر مبيعاً 📈</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 font-bold shrink-0 ml-1">التصنيفات:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => {
          const mainMedia = product.media?.[0];
          const hasVideo = product.media?.some(m => m.type === 'video');

          return (
            <div 
              key={product.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                {/* Product Media Cover */}
                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={mainMedia?.url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />

                  {/* Escrow Guarantee Pill */}
                  <div className="absolute top-2.5 right-2.5 bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>حماية الضمان 100%</span>
                  </div>

                  {/* Has Video Preview indicator */}
                  {hasVideo && (
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Play className="w-3 h-3 fill-white" />
                      <span>معاينة فيديو</span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md">
                    {product.category}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3">
                  
                  {/* Seller Profile Mini Row + Ratings */}
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => onOpenDirectChat(product.seller.username, product.seller.displayName, product.seller.avatar, product.title)}
                      className="flex items-center gap-2 cursor-pointer group/seller"
                      title="مراسلة البائع والاستفسار"
                    >
                      <img
                        src={product.seller.avatar}
                        alt={product.seller.displayName}
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover/seller:text-emerald-600 transition">
                            {product.seller.displayName}
                          </span>
                          {product.seller.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">@{product.seller.username}</span>
                      </div>
                    </div>

                    {/* Seller Rating Badge (Clickable to view reviews) */}
                    <button
                      onClick={() => onViewProductReviews(product)}
                      className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
                      title="عرض تقييمات العملاء لهذا البائع"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{product.seller.rating}</span>
                      <span className="text-[10px] text-slate-400">({product.seller.reviewsCount})</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Digital Specs (Size & Sales) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>📦 حجم الملف: {product.downloadSize || '50 MB'}</span>
                    <span>🔥 تم بيع {product.salesCount} مرة</span>
                  </div>

                </div>
              </div>

              {/* Footer: Price + The 2 Distinct Action Buttons */}
              <div className="p-4 pt-0 space-y-3">
                
                {/* Price Display */}
                <div className="flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">السعر النهائي:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        ${product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Report Scammer / Refund guarantee button */}
                  <button
                    onClick={() => onOpenReportModal('product', product.id, product.title)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 font-semibold transition"
                    title="إبلاغ عن شبهة احتيال أو طلب استرجاع"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>إبلاغ / استرجاع</span>
                  </button>
                </div>

                {/* THE 2 DISTINCT BUTTONS REQUESTED BY USER */}
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Button 1: Add to Cart */}
                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>+ للسلة</span>
                  </button>

                  {/* Button 2: Direct Buy Now */}
                  <button
                    onClick={() => onDirectBuy(product)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>شراء فوري</span>
                  </button>

                </div>

                {/* Contact Seller Inquiry */}
                <button
                  onClick={() => onOpenDirectChat(product.seller.username, product.seller.displayName, product.seller.avatar, product.title)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>الاستفسار والمراسلة الفورية للبائع</span>
                </button>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
