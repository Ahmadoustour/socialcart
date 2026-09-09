import React, { useState, useEffect, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { Header } from './components/Header';
import { SocialFeed } from './components/SocialFeed';
import { Marketplace } from './components/Marketplace';
import { MessagesHub } from './components/MessagesHub';
import { CartView } from './components/CartView';
import { PurchasesView } from './components/PurchasesView';
import { ProfileView } from './components/ProfileView';
import { CreatePostModal } from './components/CreatePostModal';
import { CreateProductModal } from './components/CreateProductModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ReviewModal } from './components/ReviewModal';
import { ReportModal } from './components/ReportModal';
import { ProductReviewsModal } from './components/ProductReviewsModal';
import { BottomNavBar } from './components/BottomNavBar';
import { AuthModal } from './components/AuthModal';
import { AccountMenuModal } from './components/AccountMenuModal';

import { 
  CURRENT_USER, 
  SAMPLE_SELLERS, 
  INITIAL_POSTS, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_NOTIFICATIONS 
} from './mockData';
import { 
  User, 
  Post, 
  Product, 
  CartItem, 
  Order, 
  Conversation, 
  NotificationItem, 
  MediaItem,
  SellerReview
} from './types';

export default function App() {
  // Navigation & Modes
  const [activeSection, setActiveSection] = useState<'social' | 'market'>('social');
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('socialcart_theme') === 'dark';
  });

  // Auth & Account State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('socialcart_logged_in') !== 'false';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Core State
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { product: INITIAL_PRODUCTS[0], quantity: 1 }
  ]);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Registered users for uniqueness checks
  const registeredUsernames = ['ahmed_dev', 'sara_design', 'omar_coder', 'noura_academy', 'khalid_tech'];
  const registeredEmails = ['ahmed.dev@example.com', 'sara.studio@example.com', 'omar.tech@example.com', 'noura.academy@example.com'];

  // Modals
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [reviewOrderTarget, setReviewOrderTarget] = useState<Order | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'product' | 'order'; id: string; title: string } | null>(null);
  const [reviewsTargetProduct, setReviewsTargetProduct] = useState<Product | null>(null);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('socialcart_logged_in', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('socialcart_logged_in', 'false');
    setActiveTab('feed');
    setActiveSection('social');
  };

  // Protected Tab Navigation Handler: prevents accessing messages, cart, purchases, profile when logged out
  const handleSelectTab = (tab: string) => {
    if (!isLoggedIn && (tab === 'messages' || tab === 'cart' || tab === 'purchases' || tab === 'profile')) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('socialcart_logged_in', 'true');
  };

  // Apply dark mode class to HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('socialcart_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('socialcart_theme', 'light');
    }
  }, [darkMode]);

  // Cart badge state: clears badge when user views the cart tab
  const [cartSeen, setCartSeen] = useState(false);

  useEffect(() => {
    if (activeTab === 'cart') {
      setCartSeen(prev => (prev ? prev : true));
    } else if (activeTab === 'messages') {
      setConversations(prev => {
        const hasUnread = prev.some(c => c.type === activeSection && c.unreadCount > 0);
        if (!hasUnread) return prev;
        return prev.map(c => c.type === activeSection ? { ...c, unreadCount: 0 } : c);
      });
    }
  }, [activeTab, activeSection]);

  // Derived counts with dynamic clearing when opened (and 0 when logged out)
  const unreadSocialMessagesCount = isLoggedIn 
    ? conversations.filter(c => c.type === 'social').reduce((sum, c) => sum + c.unreadCount, 0) 
    : 0;
  const unreadMarketMessagesCount = isLoggedIn 
    ? conversations.filter(c => c.type === 'market').reduce((sum, c) => sum + c.unreadCount, 0) 
    : 0;
  const unreadMessagesCount = activeSection === 'market' ? unreadMarketMessagesCount : unreadSocialMessagesCount;

  const unreadNotifsCount = isLoggedIn ? notifications.filter(n => !n.isRead).length : 0;
  const cartTotalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartBadgeCount = isLoggedIn ? (cartSeen ? 0 : cartTotalCount) : 0;

  // Handlers for marking notifications as read
  const handleMarkAllNotificationsRead = useCallback(() => {
    setNotifications(prev => {
      const hasUnread = prev.some(n => !n.isRead);
      if (!hasUnread) return prev;
      return prev.map(n => ({ ...n, isRead: true }));
    });
  }, []);

  const handleMarkNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === notifId);
      if (!target || target.isRead) return prev;
      return prev.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    });
  }, []);

  // Handlers for marking conversations as read
  const handleMarkConversationRead = useCallback((convId: string) => {
    setConversations(prev => {
      const target = prev.find(c => c.id === convId);
      if (!target || target.unreadCount === 0) return prev;
      return prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c);
    });
  }, []);

  const handleMarkAllConversationsRead = useCallback((type?: 'social' | 'market') => {
    const targetType = type || activeSection;
    setConversations(prev => {
      const hasUnread = prev.some(c => c.type === targetType && c.unreadCount > 0);
      if (!hasUnread) return prev;
      return prev.map(c => c.type === targetType ? { ...c, unreadCount: 0 } : c);
    });
  }, [activeSection]);

  // 1. Social Interactions Handlers
  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likesCount: liked ? p.likesCount + 1 : p.likesCount - 1
        };
      }
      return p;
    }));
  };

  const handleAddComment = (postId: string, text: string) => {
    const newComment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      text,
      createdAt: 'الآن'
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [newComment, ...p.comments]
        };
      }
      return p;
    }));
  };

  const handleCreatePost = (title: string, description: string, media: MediaItem[], tags: string[]) => {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      userId: currentUser.id,
      author: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        isVerified: true
      },
      title,
      description,
      media,
      likesCount: 0,
      likedByMe: false,
      sharesCount: 0,
      comments: [],
      createdAt: 'الآن',
      tags
    };

    setPosts(prev => [newPost, ...prev]);
    setActiveSection('social');
    setActiveTab('feed');
  };

  // 2. Marketplace Handlers
  const handleAddToCart = (product: Product) => {
    setCartSeen(false); // Unseen items added to cart -> show badge until opened
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Add brief alert
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 left-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-fadeIn';
    toast.innerHTML = `<span>✓ تمت إضافة "${product.title.substring(0, 24)}..." إلى سلة المشتريات بنجاح!</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  };

  // Direct Buy Now: Opens Multi-step checkout directly for this single product
  const handleDirectBuy = (product: Product) => {
    setCheckoutItems([{ product, quantity: 1 }]);
    setIsCheckoutOpen(true);
  };

  // Proceed to checkout from cart
  const handleProceedFromCart = () => {
    if (cartItems.length === 0) return;
    setCheckoutItems(cartItems);
    setIsCheckoutOpen(true);
  };

  // Create Product handler
  const handleCreateProduct = (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    originalPrice?: number;
    media: MediaItem[];
    fileUrl: string;
    downloadSize: string;
  }) => {
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      sellerId: currentUser.id,
      seller: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        isVerified: true,
        rating: 5.0,
        reviewsCount: 1,
        trustScore: 99
      },
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      originalPrice: data.originalPrice,
      media: data.media,
      fileUrl: data.fileUrl,
      downloadSize: data.downloadSize,
      salesCount: 0,
      likesCount: 0,
      likedByMe: false,
      createdAt: 'الآن',
      escrowProtected: true,
      reviews: []
    };

    setProducts(prev => [newProduct, ...prev]);
    setActiveSection('market');
    setActiveTab('marketplace');
  };

  // Cart quantity update
  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // 3. Checkout Completion Handler (Multi-step result)
  const handleCheckoutComplete = (ordersData: {
    items: CartItem[];
    totalPaid: number;
    paymentMethod: string;
  }) => {
    const newOrders: Order[] = ordersData.items.map(item => ({
      id: `ord_${Math.floor(1000 + Math.random() * 9000)}`,
      productId: item.product.id,
      productTitle: item.product.title,
      productImage: item.product.media?.[0]?.url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      category: item.product.category,
      sellerUsername: item.product.seller.username,
      sellerDisplayName: item.product.seller.displayName,
      unitPrice: item.product.price,
      quantity: item.quantity,
      totalPaid: item.product.price * item.quantity, // CRITICAL: Fixes user bug #3
      purchasedAt: new Date().toLocaleDateString('ar-EG'),
      downloadUrl: item.product.fileUrl,
      isEscrowReleased: false,
      escrowReleaseDate: 'متبقي 14 يوماً بحماية الضمان Escrow',
      status: 'completed',
      hasRatedSeller: false
    }));

    // Prepend to orders
    setOrders(prev => [...newOrders, ...prev]);

    // Remove bought items from cart
    const boughtIds = new Set(ordersData.items.map(i => i.product.id));
    setCartItems(prev => prev.filter(i => !boughtIds.has(i.product.id)));

    // Add security notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title: '🎉 اكتملت عملية الشراء بنجاح بحماية الضمان',
      message: `تم تأكيد دفع $${ordersData.totalPaid} عبر ${ordersData.paymentMethod}. ملفاتك متاحة الآن في صفحة مشترياتي.`,
      type: 'market',
      isRead: false,
      createdAt: 'الآن',
      linkTab: 'purchases'
    };
    setNotifications(prev => [newNotif, ...prev]);

    setActiveTab('purchases');
  };

  // 4. Download file handler
  const handleDownloadFile = (order: Order) => {
    // Open the download link safely
    window.open(order.downloadUrl, '_blank', 'noopener,noreferrer');
    alert(`📥 بدأ تنزيل ملف "${order.productTitle}" بنجاح!\nالرابط مشفر ومحمي برقم الطلب #${order.id}`);
  };

  // 5. Rate seller handler
  const handleRateSellerSubmit = (orderId: string, rating: number, comment: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, hasRatedSeller: true } : o));

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const newReview: SellerReview = {
      id: `rev_${Date.now()}`,
      buyerUsername: currentUser.username,
      buyerAvatar: currentUser.avatar,
      rating,
      comment,
      date: 'اليوم',
      productTitle: targetOrder.productTitle
    };

    // Update product reviews & seller rating
    setProducts(prev => prev.map(p => {
      if (p.seller.username === targetOrder.sellerUsername) {
        const updatedReviews = [newReview, ...p.reviews];
        const avg = Number((updatedReviews.reduce((s, r) => s + r.rating, 0) / updatedReviews.length).toFixed(1));
        return {
          ...p,
          reviews: updatedReviews,
          seller: {
            ...p.seller,
            rating: avg,
            reviewsCount: updatedReviews.length
          }
        };
      }
      return p;
    }));
  };

  // 6. Report and Refund Submission
  const handleReportSubmit = (data: {
    targetType: string;
    targetId: string;
    reason: string;
    details: string;
    requestRefund: boolean;
  }) => {
    if (data.targetType === 'order' && data.requestRefund) {
      setOrders(prev => prev.map(o => o.id === data.targetId ? { ...o, status: 'refunded' } : o));
    }

    const notif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title: '🛡️ تم استلام بلاغك وطلب استرجاع الأموال',
      message: `تم فتح تذكرة نزاع أمنية بخصوص "${data.reason}". تم تجميد أموال البائع في محفظة الضمان لحمايتك.`,
      type: 'security',
      isRead: false,
      createdAt: 'الآن',
      linkTab: 'purchases'
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // 7. Messages Handlers
  const handleSendMessage = (conversationId: string, text: string, media?: MediaItem[]) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      text,
      media,
      createdAt: 'الآن',
      isMe: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: text || (media?.length ? 'ملف وسائط مرفق' : ''),
          lastMessageTime: 'الآن',
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));
  };

  const handleStartNewConversation = (
    participantUsername: string,
    participantDisplayName: string,
    participantAvatar: string,
    type: 'social' | 'market',
    initialMessage: string,
    productTitle?: string
  ) => {
    const existing = conversations.find(c => c.participantUsername === participantUsername);
    if (existing) {
      handleSendMessage(existing.id, initialMessage);
      setActiveTab('messages');
      return;
    }

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      participantId: `usr_${participantUsername}`,
      participantUsername,
      participantDisplayName,
      participantAvatar,
      isVerified: true,
      type,
      relatedProductTitle: productTitle,
      lastMessage: initialMessage,
      lastMessageTime: 'الآن',
      unreadCount: 0,
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          senderId: currentUser.id,
          senderUsername: currentUser.username,
          senderAvatar: currentUser.avatar,
          text: initialMessage,
          createdAt: 'الآن',
          isMe: true
        }
      ]
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveTab('messages');
  };

  const handleOpenDirectChat = (username: string, displayName: string, avatar: string, productTitle?: string) => {
    const existing = conversations.find(c => c.participantUsername === username);
    if (existing) {
      setActiveTab('messages');
      return;
    }

    handleStartNewConversation(
      username,
      displayName,
      avatar,
      productTitle ? 'market' : 'social',
      productTitle ? `مرحباً ${displayName}، أود الاستفسار عن منتجك: "${productTitle}"` : `مرحباً ${displayName}، سررت بالتواصل معك!`,
      productTitle
    );
  };

  // 8. Profile Update Handler
  const handleUpdateProfile = (updated: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Header with Unified Switcher (Social vs Market preserved at the top) */}
      <Header
        activeSection={activeSection}
        onSwitchSection={setActiveSection}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        isLoggedIn={isLoggedIn}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAccountMenu={() => setIsAccountMenuOpen(true)}
        onLogout={handleLogout}
        unreadNotifsCount={unreadNotifsCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Main View Container with bottom padding for BottomNavBar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-24">
        
        {/* TAB: Social Feed */}
        {activeTab === 'feed' && (
          <SocialFeed
            posts={posts}
            currentUser={currentUser}
            onLikePost={(id) => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              handleLikePost(id);
            }}
            onAddComment={(id, text) => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              handleAddComment(id, text);
            }}
            onOpenCreatePost={() => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsCreatePostOpen(true);
            }}
            onOpenReportModal={(targetType, targetId, targetName) => {
              setReportTarget({ type: targetType, id: targetId, title: targetName });
            }}
            onOpenDirectChat={handleOpenDirectChat}
          />
        )}

        {/* TAB: Marketplace Catalog */}
        {activeTab === 'marketplace' && (
          <Marketplace
            products={products}
            currentUser={currentUser}
            onAddToCart={(prod) => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              handleAddToCart(prod);
            }}
            onDirectBuy={(prod) => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              handleDirectBuy(prod);
            }}
            onOpenSellModal={() => {
              if (!isLoggedIn) {
                setIsAuthModalOpen(true);
                return;
              }
              setIsCreateProductOpen(true);
            }}
            onOpenReportModal={(targetType, targetId, targetName) => {
              setReportTarget({ type: targetType, id: targetId, title: targetName });
            }}
            onOpenDirectChat={handleOpenDirectChat}
            onViewProductReviews={(product) => setReviewsTargetProduct(product)}
          />
        )}

        {/* TAB: Messages Hub (Boxes per person + Old messages history) */}
        {activeTab === 'messages' && (
          isLoggedIn ? (
            <MessagesHub
              conversations={conversations}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onStartNewConversation={handleStartNewConversation}
              onMarkConversationRead={handleMarkConversationRead}
              onMarkAllConversationsRead={handleMarkAllConversationsRead}
            />
          ) : (
            <div className="max-w-md mx-auto my-14 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                تسجيل الدخول مطلوب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                لا يمكنك الدخول إلى الرسائل والمحادثات بدون تسجيل الدخول أولاً لحماية خصوصية محادثاتك.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  تسجيل الدخول / إنشاء حساب
                </button>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  العودة للرئيسية
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB: Direct Cart View */}
        {activeTab === 'cart' && (
          isLoggedIn ? (
            <CartView
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveFromCart}
              onProceedToCheckout={handleProceedFromCart}
              onContinueShopping={() => {
                setActiveSection('market');
                setActiveTab('marketplace');
              }}
            />
          ) : (
            <div className="max-w-md mx-auto my-14 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                تسجيل الدخول مطلوب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                سلة المشتريات خاصة بحسابك. يرجى تسجيل الدخول للوصول إلى مشترياتك وإتمام الطلب.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  تسجيل الدخول / إنشاء حساب
                </button>
                <button
                  onClick={() => {
                    setActiveSection('market');
                    setActiveTab('marketplace');
                  }}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  العودة للمتجر
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB: Purchases View */}
        {activeTab === 'purchases' && (
          isLoggedIn ? (
            <PurchasesView
              orders={orders}
              onDownloadFile={handleDownloadFile}
              onRateSeller={(order) => setReviewOrderTarget(order)}
              onRequestRefund={(order) => {
                setReportTarget({ type: 'order', id: order.id, title: order.productTitle });
              }}
              onExploreMarket={() => {
                setActiveSection('market');
                setActiveTab('marketplace');
              }}
            />
          ) : (
            <div className="max-w-md mx-auto my-14 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                تسجيل الدخول مطلوب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                سجل مشترياتك وملفاتك الرقمية مشفرة ومحمية ولا يمكن استعراضها إلا بعد تسجيل الدخول.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  تسجيل الدخول / إنشاء حساب
                </button>
                <button
                  onClick={() => {
                    setActiveSection('market');
                    setActiveTab('marketplace');
                  }}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  العودة للمتجر
                </button>
              </div>
            </div>
          )
        )}

        {/* TAB: Professional Profile View */}
        {activeTab === 'profile' && (
          isLoggedIn ? (
            <ProfileView
              currentUser={currentUser}
              onUpdateProfile={handleUpdateProfile}
              registeredUsernames={registeredUsernames}
              registeredEmails={registeredEmails}
              onLogout={handleLogout}
            />
          ) : (
            <div className="max-w-md mx-auto my-14 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                تسجيل الدخول مطلوب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                يرجى تسجيل الدخول لعرض وتعديل ملفك الشخصي وإعدادات حسابك.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  تسجيل الدخول / إنشاء حساب
                </button>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  العودة للرئيسية
                </button>
              </div>
            </div>
          )
        )}

      </main>

      {/* DOCKED BOTTOM NAVIGATION BAR (Separated Social vs Market, dynamic counters) */}
      <BottomNavBar
        activeSection={activeSection}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        cartBadgeCount={cartBadgeCount}
        unreadMessagesCount={unreadMessagesCount}
        onOpenCreateModal={() => {
          if (!isLoggedIn) {
            setIsAuthModalOpen(true);
            return;
          }
          if (activeSection === 'social') setIsCreatePostOpen(true);
          else setIsCreateProductOpen(true);
        }}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onOpenAccountMenu={() => setIsAccountMenuOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* ALL MODALS */}
      {/* 1. Create Social Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSubmit={handleCreatePost}
      />

      {/* 2. Create Market Product Modal */}
      <CreateProductModal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        onSubmit={handleCreateProduct}
      />

      {/* 3. Multi-Step Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={checkoutItems}
        currentUser={currentUser}
        onCheckoutComplete={handleCheckoutComplete}
      />

      {/* 4. Seller Rating & Review Modal */}
      <ReviewModal
        isOpen={!!reviewOrderTarget}
        onClose={() => setReviewOrderTarget(null)}
        order={reviewOrderTarget}
        onSubmitReview={handleRateSellerSubmit}
      />

      {/* 5. Report Scammer / Escrow Refund Modal */}
      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type || 'product'}
        targetId={reportTarget?.id || ''}
        targetTitle={reportTarget?.title || ''}
        onSubmitReport={handleReportSubmit}
      />

      {/* 6. Product Reviews Modal */}
      <ProductReviewsModal
        isOpen={!!reviewsTargetProduct}
        onClose={() => setReviewsTargetProduct(null)}
        product={reviewsTargetProduct}
      />

      {/* 7. Authentication Modal (Login / Register / Quick Demo Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        registeredUsernames={registeredUsernames}
        registeredEmails={registeredEmails}
      />

      {/* 8. Account Menu Drawer (Profile, Switch User, Logout) */}
      <AccountMenuModal
        isOpen={isAccountMenuOpen}
        onClose={() => setIsAccountMenuOpen(false)}
        currentUser={currentUser}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
      />

    </div>
  );
}

