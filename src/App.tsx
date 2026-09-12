import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, updatePassword, updateProfile, updateEmail } from 'firebase/auth';
import { 
  User, 
  SavedCard,
  Post, 
  Product, 
  CartItem, 
  Order, 
  Conversation, 
  Message,
  NotificationItem, 
  MediaItem,
  SellerReview
} from './types';

const GUEST_USER: User = {
  id: 'guest',
  username: 'guest',
  displayName: 'زائر',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  joinedDate: '2026',
  isVerifiedSeller: false,
  sellerRating: 0,
  sellerReviewsCount: 0,
  totalSales: 0,
  trustScore: 100,
  isEmailVerified: false,
  twoFactorEnabled: false
};

// Safe per-user local storage key generator
const getUserStorageKey = (prefix: string, userId: string) => {
  const safeId = userId ? userId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'guest';
  return `${prefix}_${safeId}`;
};

function loadUserCart(userId: string): CartItem[] {
  // Clean up legacy unpartitioned cart key to prevent cross-account contamination
  try {
    localStorage.removeItem('socialcart_cart');
  } catch {}

  const userKey = getUserStorageKey('socialcart_cart', userId);
  const saved = localStorage.getItem(userKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter(c => c && c.product && c.product.id);
    } catch {}
  }
  return [];
}

function loadUserOrders(userId: string, userEmail?: string): Order[] {
  // Clean up legacy unpartitioned orders key
  try {
    localStorage.removeItem('socialcart_orders');
  } catch {}

  const userKey = getUserStorageKey('socialcart_orders', userId);
  const saved = localStorage.getItem(userKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(o => 
          o && o.id && (
            o.buyerId === userId || 
            (userEmail && o.buyerEmail?.toLowerCase() === userEmail.toLowerCase())
          )
        );
      }
    } catch {}
  }
  return [];
}

function loadUserConversations(userId: string, username?: string): Conversation[] {
  // Clean up dangerous legacy shared key so it can never leak to new accounts
  try {
    localStorage.removeItem('socialcart_conversations');
  } catch {}

  const cleanUser = (username || '').replace(/^@/, '').toLowerCase().trim();
  const userKey = getUserStorageKey('socialcart_conversations', userId);
  let userList: Conversation[] = [];

  // 1. Check user-specific storage key
  const saved = localStorage.getItem(userKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        userList = parsed.filter(c => {
          if (!c || !c.id) return false;
          // STRICT PRIVACY ISOLATION:
          // A conversation belongs to this user ONLY if they are the owner, creator, or participant!
          if (cleanUser) {
            const hasParticipant = c.participants && Array.isArray(c.participants) 
              ? c.participants.map((p: string) => p.toLowerCase()).includes(cleanUser)
              : false;
            const isTarget = c.participantUsername?.toLowerCase() === cleanUser;
            const isCreator = c.creatorUsername?.toLowerCase() === cleanUser;
            const isOwner = c.userId === userId;
            return isOwner || isTarget || isCreator || hasParticipant;
          }
          return c.userId === userId;
        });
      }
    } catch {}
  }

  // 2. Also check shared conversation registry for cross-user routing
  try {
    const shared = localStorage.getItem('socialcart_shared_conversations_pool');
    if (shared && cleanUser) {
      const parsedShared: Conversation[] = JSON.parse(shared);
      if (Array.isArray(parsedShared)) {
        parsedShared.forEach(poolConv => {
          if (!poolConv || !poolConv.id) return;
          const participants = (poolConv.participants || [
            poolConv.creatorUsername || '',
            poolConv.participantUsername || ''
          ]).map(p => p.toLowerCase());

          if (participants.includes(cleanUser)) {
            const existingIdx = userList.findIndex(c => c.id === poolConv.id);
            let adapted = { ...poolConv };
            // If this user is the recipient (not creator), adjust recipient labels to show creator
            if (poolConv.participantUsername?.toLowerCase() === cleanUser && poolConv.creatorUsername) {
              adapted = {
                ...adapted,
                participantUsername: poolConv.creatorUsername,
                participantDisplayName: poolConv.creatorDisplayName || poolConv.creatorUsername,
                participantAvatar: poolConv.creatorAvatar || poolConv.participantAvatar,
              };
            }
            if (existingIdx >= 0) {
              userList[existingIdx] = adapted;
            } else {
              userList.push(adapted);
            }
          }
        });
      }
    }
  } catch {}

  return userList;
}

function loadUserNotifications(userId: string): NotificationItem[] {
  // Clean up legacy key
  try {
    localStorage.removeItem('socialcart_notifications');
  } catch {}

  const userKey = getUserStorageKey('socialcart_notifications', userId);
  const saved = localStorage.getItem(userKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Only load pure notifications (orders, security, disputes); never message notifications
        return parsed.filter(n => n && n.id && !n.id.startsWith('notif_msg_') && !n.targetConvId);
      }
    } catch {}
  }
  return [];
}

export default function App() {
  // Navigation & Modes
  const [activeSection, setActiveSection] = useState<'social' | 'market'>('social');
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('socialcart_theme') === 'dark';
  });

  // Auth & Account State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const userStr = localStorage.getItem('socialcart_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.username === 'ahmed_dev' || u.id === 'usr_me' || !u.id || u.id === 'guest') {
          localStorage.removeItem('socialcart_user');
          localStorage.setItem('socialcart_logged_in', 'false');
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    return localStorage.getItem('socialcart_logged_in') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Collect all known usernames and emails for strict registration uniqueness validation
  const allRegisteredUsernames = useMemo(() => {
    const list: string[] = [];
    const registeredStr = localStorage.getItem('socialcart_registered_users');
    if (registeredStr) {
      try {
        const parsed = JSON.parse(registeredStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            if (u && u.username) list.push(u.username);
          });
        }
      } catch {}
    }
    return list;
  }, [isAuthModalOpen]);

  const allRegisteredEmails = useMemo(() => {
    const list: string[] = [];
    const registeredStr = localStorage.getItem('socialcart_registered_users');
    if (registeredStr) {
      try {
        const parsed = JSON.parse(registeredStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: any) => {
            if (u && u.email) list.push(u.email);
          });
        }
      } catch {}
    }
    return list;
  }, [isAuthModalOpen]);

  // Core State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('socialcart_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.username === 'ahmed_dev' || u.id === 'usr_me' || !u.id || u.id === 'guest') {
          return GUEST_USER;
        }
        if (!u.sellerReviewsCount || u.sellerReviewsCount === 0) {
          u.sellerRating = 0;
        }
        return u;
      } catch (e) {
        return GUEST_USER;
      }
    }
    return GUEST_USER;
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('socialcart_posts');
    if (!saved) return [];
    try {
      const parsed: Post[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const sampleIds = new Set(['demo_post_1', 'demo_post_2', 'demo_post_3', 'post_init_1', 'post_init_2']);
      const clean = parsed
        .filter(p => p && p.id && !sampleIds.has(p.id))
        .map(p => ({
          ...p,
          author: p.author || {
            username: 'member',
            displayName: 'عضو المنصة',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            isVerified: false
          },
          media: Array.isArray(p.media) ? p.media : [],
          comments: Array.isArray(p.comments) ? p.comments : [],
          likesCount: typeof p.likesCount === 'number' ? p.likesCount : 0,
          sharesCount: typeof p.sharesCount === 'number' ? p.sharesCount : 0,
          tags: Array.isArray(p.tags) ? p.tags : []
        }));
      try {
        localStorage.setItem('socialcart_posts', JSON.stringify(clean));
      } catch {}
      return clean;
    } catch {
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('socialcart_products');
    if (!saved) return [];
    try {
      const parsed: Product[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const sampleProdIds = new Set(['demo_prod_1', 'demo_prod_2', 'demo_prod_3', 'prod_1', 'prod_2', 'prod_3']);
      const clean = parsed
        .filter(p => p && p.id && !sampleProdIds.has(p.id))
        .map(p => {
          const revs = Array.isArray(p.reviews) ? p.reviews : [];
          const actualCount = revs.length;
          const actualRating = actualCount > 0
            ? Number((revs.reduce((s, r) => s + Number(r.rating || 0), 0) / actualCount).toFixed(1))
            : (actualCount === 0 ? 0 : (p.seller?.rating || 5.0));

          return {
            ...p,
            media: Array.isArray(p.media) ? p.media : [],
            reviews: revs,
            rating: actualRating,
            seller: {
              ...(p.seller || {
                username: 'seller',
                displayName: 'بائع معتمد',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                isVerified: true,
                rating: actualRating,
                reviewsCount: actualCount,
                trustScore: 98
              }),
              rating: actualRating,
              reviewsCount: actualCount
            }
          };
        });
      try {
        localStorage.setItem('socialcart_products', JSON.stringify(clean));
      } catch {}
      return clean;
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    return loadUserOrders(currentUser.id, currentUser.email);
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    return loadUserCart(currentUser.id);
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return loadUserConversations(currentUser.id, currentUser.username);
  });

  const [selectedSocialConvId, setSelectedSocialConvId] = useState<string | null>(null);
  const [selectedMarketConvId, setSelectedMarketConvId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return loadUserNotifications(currentUser.id);
  });

  // Track user switches to smoothly swap cart, orders, and messages
  const previousUserIdRef = useRef<string>(currentUser.id);

  useEffect(() => {
    const prevId = previousUserIdRef.current;
    const currentId = currentUser.id;

    if (prevId !== currentId) {
      // 1. Cart: If logging in from guest with items in guest cart, merge them into user cart!
      if (prevId === 'guest' && currentId !== 'guest') {
        const guestCart = loadUserCart('guest');
        const userCart = loadUserCart(currentId);
        if (guestCart.length > 0) {
          const mergedCart = [...userCart];
          guestCart.forEach(gItem => {
            const existingIdx = mergedCart.findIndex(i => i.product.id === gItem.product.id);
            if (existingIdx >= 0) {
              mergedCart[existingIdx].quantity += gItem.quantity;
            } else {
              mergedCart.push(gItem);
            }
          });
          setCartItems(mergedCart);
          localStorage.setItem(getUserStorageKey('socialcart_cart', currentId), JSON.stringify(mergedCart));
          localStorage.removeItem(getUserStorageKey('socialcart_cart', 'guest'));
        } else {
          setCartItems(userCart);
        }
      } else {
        setCartItems(loadUserCart(currentId));
      }

      // 2. Orders / Purchases: Load user-specific orders
      setOrders(loadUserOrders(currentId, currentUser.email));

      // 3. Conversations / Messages: Load user-specific conversations isolated to current user
      setConversations(loadUserConversations(currentId, currentUser.username));

      // 4. Notifications: Load user-specific notifications
      setNotifications(loadUserNotifications(currentId));

      // 5. Update posts likedByMe flag for current user
      setPosts(prev => prev.map(p => {
        const likedIds = Array.isArray(p.likedUserIds) ? p.likedUserIds : [];
        return {
          ...p,
          likedByMe: likedIds.includes(currentId)
        };
      }));

      previousUserIdRef.current = currentId;
    }
  }, [currentUser.id, currentUser.username, currentUser.email]);

  // Save per-user changes to storage (strictly scoped to current user ID)
  useEffect(() => {
    if (previousUserIdRef.current !== currentUser.id) return;
    const key = getUserStorageKey('socialcart_cart', currentUser.id);
    localStorage.setItem(key, JSON.stringify(cartItems));
  }, [cartItems, currentUser.id]);

  useEffect(() => {
    if (previousUserIdRef.current !== currentUser.id) return;
    const key = getUserStorageKey('socialcart_orders', currentUser.id);
    localStorage.setItem(key, JSON.stringify(orders));
  }, [orders, currentUser.id]);

  useEffect(() => {
    localStorage.setItem('socialcart_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('socialcart_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    // Prevent race condition: if user just changed, do NOT save old user conversations into new user key
    if (previousUserIdRef.current !== currentUser.id) return;

    const key = getUserStorageKey('socialcart_conversations', currentUser.id);
    localStorage.setItem(key, JSON.stringify(conversations));

    // Also sync to shared pool with participant tags
    try {
      const existingPoolRaw = localStorage.getItem('socialcart_shared_conversations_pool');
      const existingPool: Conversation[] = existingPoolRaw ? JSON.parse(existingPoolRaw) : [];
      const poolMap = new Map<string, Conversation>();
      if (Array.isArray(existingPool)) {
        existingPool.forEach(c => { if (c && c.id) poolMap.set(c.id, c); });
      }
      conversations.forEach(c => {
        if (c && c.id) {
          const participants = Array.from(new Set([
            (currentUser.username || '').toLowerCase(),
            (c.participantUsername || '').toLowerCase(),
            ...(c.participants || []).map(p => p.toLowerCase())
          ].filter(Boolean)));

          poolMap.set(c.id, {
            ...c,
            participants,
            creatorUsername: c.creatorUsername || currentUser.username,
            creatorDisplayName: c.creatorDisplayName || currentUser.displayName,
            creatorAvatar: c.creatorAvatar || currentUser.avatar
          });
        }
      });
      localStorage.setItem('socialcart_shared_conversations_pool', JSON.stringify(Array.from(poolMap.values())));
    } catch {}
  }, [conversations, currentUser.id, currentUser.username, currentUser.displayName, currentUser.avatar]);

  useEffect(() => {
    if (previousUserIdRef.current !== currentUser.id) return;
    const key = getUserStorageKey('socialcart_notifications', currentUser.id);
    localStorage.setItem(key, JSON.stringify(notifications));
  }, [notifications, currentUser.id]);

  // Load persistent posts and products from server API
  useEffect(() => {
    fetch('/api/posts')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch posts');
        return res.json();
      })
      .then((serverData: any) => {
        const serverPosts: Post[] = Array.isArray(serverData) ? serverData : (serverData?.posts || []);
        if (Array.isArray(serverPosts) && serverPosts.length > 0) {
          setPosts(prev => {
            const map = new Map<string, Post>();
            serverPosts.forEach(p => { if (p && p.id) map.set(p.id, p); });
            prev.forEach(p => { if (p && p.id && !map.has(p.id)) map.set(p.id, p); });
            return Array.from(map.values());
          });
        }
      })
      .catch(err => console.log('Notice: using local posts cache:', err));

    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then((serverData: any) => {
        const serverProducts: Product[] = Array.isArray(serverData) ? serverData : (serverData?.products || []);
        if (Array.isArray(serverProducts) && serverProducts.length > 0) {
          setProducts(prev => {
            const map = new Map<string, Product>();
            serverProducts.forEach(p => { if (p && p.id) map.set(p.id, p); });
            prev.forEach(p => { if (p && p.id && !map.has(p.id)) map.set(p.id, p); });
            return Array.from(map.values());
          });
        }
      })
      .catch(err => console.log('Notice: using local products cache:', err));
  }, []);

  // Load persistent orders for current user from server API
  useEffect(() => {
    if (currentUser.id && currentUser.id !== 'guest') {
      fetch(`/api/orders?userId=${encodeURIComponent(currentUser.id)}`)
        .then(res => res.ok ? res.json() : [])
        .then((serverOrders: Order[]) => {
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            setOrders(prev => {
              const map = new Map<string, Order>();
              serverOrders.forEach(o => { 
                if (o && o.id && (o.buyerId === currentUser.id || (currentUser.email && o.buyerEmail?.toLowerCase() === currentUser.email.toLowerCase()))) {
                  map.set(o.id, o);
                }
              });
              prev.forEach(o => { 
                if (o && o.id && (o.buyerId === currentUser.id || (currentUser.email && o.buyerEmail?.toLowerCase() === currentUser.email.toLowerCase())) && !map.has(o.id)) {
                  map.set(o.id, o);
                }
              });
              const combined = Array.from(map.values());
              const key = getUserStorageKey('socialcart_orders', currentUser.id);
              localStorage.setItem(key, JSON.stringify(combined));
              return combined;
            });
          }
        })
        .catch(() => {});
    }
  }, [currentUser.id]);

  // Sync Firebase Auth state & merge with local/server profiles to preserve password, card, bio, etc.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const savedUserStr = localStorage.getItem('socialcart_user');
        let existingUser: Partial<User> = {};
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            // CRITICAL BUGFIX: Never ever use parsed user data unless the ID or email matches fbUser!
            // Otherwise switching users or registering a new account gets contaminated with the previous user!
            if (
              parsed &&
              parsed.id !== 'guest' &&
              (parsed.id === fbUser.uid || (parsed.email && fbUser.email && parsed.email.toLowerCase() === fbUser.email.toLowerCase()))
            ) {
              existingUser = parsed;
            }
          } catch {}
        }

        const registeredStr = localStorage.getItem('socialcart_registered_users');
        let registeredUsers: User[] = [];
        if (registeredStr) {
          try { registeredUsers = JSON.parse(registeredStr); } catch {}
        }
        const matchedReg = registeredUsers.find(u => 
          (u.id && u.id === fbUser.uid) || 
          (fbUser.email && u.email && u.email.toLowerCase() === fbUser.email.toLowerCase())
        );

        // Also check if server has saved profile for this specific user
        let serverUser: Partial<User> = {};
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(fbUser.uid)}`);
          if (res.ok) {
            serverUser = await res.json();
          } else if (fbUser.email) {
            const res3 = await fetch(`/api/users/${encodeURIComponent(fbUser.email)}`);
            if (res3.ok) serverUser = await res3.json();
          }
        } catch {}

        // Priority resolution: Firebase auth email or explicit matched email
        const resolvedEmail = fbUser.email || existingUser.email || serverUser.email || matchedReg?.email || '';

        // Card state must strictly respect explicit deletions (null) and updates
        let resolvedCard: SavedCard | null = null;
        if (existingUser.savedCard !== undefined) {
          resolvedCard = existingUser.savedCard;
        } else if (serverUser.savedCard !== undefined) {
          resolvedCard = serverUser.savedCard;
        } else if (matchedReg?.savedCard !== undefined) {
          resolvedCard = matchedReg.savedCard;
        }

        const resolvedUsername = matchedReg?.username || serverUser.username || existingUser.username || (fbUser.displayName ? fbUser.displayName.toLowerCase().replace(/\s+/g, '_') : (resolvedEmail ? resolvedEmail.split('@')[0] : 'user'));
        const resolvedDisplayName = fbUser.displayName || matchedReg?.displayName || serverUser.displayName || existingUser.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'مستخدم مسجل');

        const mergedUser: User = {
          id: fbUser.uid,
          username: resolvedUsername,
          displayName: resolvedDisplayName,
          email: resolvedEmail,
          avatar: existingUser.avatar || matchedReg?.avatar || serverUser.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: existingUser.bio !== undefined ? existingUser.bio : (matchedReg?.bio !== undefined ? matchedReg.bio : (serverUser.bio !== undefined ? serverUser.bio : '')),
          savedCard: resolvedCard,
          password: existingUser.password || matchedReg?.password || serverUser.password,
          joinedDate: existingUser.joinedDate || matchedReg?.joinedDate || serverUser.joinedDate || 'سبتمبر 2026',
          isVerifiedSeller: existingUser.isVerifiedSeller ?? matchedReg?.isVerifiedSeller ?? serverUser.isVerifiedSeller ?? false,
          sellerRating: existingUser.sellerRating ?? matchedReg?.sellerRating ?? serverUser.sellerRating ?? 0,
          sellerReviewsCount: existingUser.sellerReviewsCount ?? matchedReg?.sellerReviewsCount ?? serverUser.sellerReviewsCount ?? 0,
          totalSales: existingUser.totalSales ?? matchedReg?.totalSales ?? serverUser.totalSales ?? 0,
          trustScore: existingUser.trustScore ?? matchedReg?.trustScore ?? serverUser.trustScore ?? 100,
          isEmailVerified: existingUser.isEmailVerified ?? fbUser.emailVerified ?? matchedReg?.isEmailVerified ?? false,
          twoFactorEnabled: existingUser.twoFactorEnabled ?? matchedReg?.twoFactorEnabled ?? false
        };

        setCurrentUser(mergedUser);
        setIsLoggedIn(true);
        localStorage.setItem('socialcart_logged_in', 'true');
        localStorage.setItem('socialcart_user', JSON.stringify(mergedUser));

        // Update in registered users list
        const regIdx = registeredUsers.findIndex(u => 
          u.id === mergedUser.id || 
          (existingUser.email && u.email && u.email.toLowerCase() === existingUser.email.toLowerCase()) ||
          (mergedUser.email && u.email && u.email.toLowerCase() === mergedUser.email.toLowerCase())
        );
        if (regIdx >= 0) {
          registeredUsers[regIdx] = { ...registeredUsers[regIdx], ...mergedUser };
        } else {
          registeredUsers.push(mergedUser);
        }
        localStorage.setItem('socialcart_registered_users', JSON.stringify(registeredUsers));

        // Persist to server
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mergedUser)
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync server profile on mount if already logged in
  useEffect(() => {
    const savedUserStr = localStorage.getItem('socialcart_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && u.id && u.id !== 'guest') {
          fetch(`/api/users/${encodeURIComponent(u.id)}`)
            .then(res => res.ok ? res.json() : null)
            .then(serverUser => {
              if (serverUser) {
                setCurrentUser(prev => {
                  const merged: User = {
                    ...serverUser,
                    ...prev,
                    email: prev.email || serverUser.email || '',
                    displayName: prev.displayName || serverUser.displayName || '',
                    username: prev.username || serverUser.username || '',
                    savedCard: prev.savedCard !== undefined ? prev.savedCard : (serverUser.savedCard ?? null)
                  };
                  localStorage.setItem('socialcart_user', JSON.stringify(merged));
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      } catch {}
    }
  }, []);

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
    const registeredStr = localStorage.getItem('socialcart_registered_users');
    let registeredUsers: User[] = [];
    if (registeredStr) {
      try { registeredUsers = JSON.parse(registeredStr); } catch {}
    }
    // Only match existing user by EXACT id or EXACT email.
    // NEVER match by username alone when receiving an authenticated user object!
    const existing = registeredUsers.find(u => 
      (u.id && user.id && u.id === user.id) || 
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
    );

    const mergedUser: User = existing ? {
      ...existing,
      ...user,
      id: user.id || existing.id,
      email: user.email || existing.email,
      username: user.username || existing.username,
      displayName: user.displayName || existing.displayName,
      password: user.password || existing.password,
      savedCard: user.savedCard !== undefined ? user.savedCard : (existing.savedCard ?? null),
      bio: user.bio !== undefined ? user.bio : existing.bio,
    } : user;

    setCurrentUser(mergedUser);
    setIsLoggedIn(true);
    localStorage.setItem('socialcart_logged_in', 'true');
    localStorage.setItem('socialcart_user', JSON.stringify(mergedUser));

    const idx = registeredUsers.findIndex(u => (u.id && mergedUser.id && u.id === mergedUser.id) || (u.email && mergedUser.email && u.email.toLowerCase() === mergedUser.email.toLowerCase()));
    if (idx >= 0) {
      registeredUsers[idx] = { ...registeredUsers[idx], ...mergedUser };
    } else {
      registeredUsers.push(mergedUser);
    }
    localStorage.setItem('socialcart_registered_users', JSON.stringify(registeredUsers));

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedUser)
    }).catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }
    setIsLoggedIn(false);
    setCurrentUser(GUEST_USER);
    localStorage.setItem('socialcart_logged_in', 'false');
    localStorage.removeItem('socialcart_user');
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
    localStorage.setItem('socialcart_user', JSON.stringify(user));
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
    }
  }, [activeTab]);

  // Derived counts with dynamic clearing when opened (and 0 when logged out)
  // Explicit requirement: The bottom tab badge displays the count of distinct PEOPLE who messaged me
  const unreadSocialSendersCount = isLoggedIn 
    ? conversations.filter(c => c.type === 'social' && c.unreadCount > 0).length 
    : 0;
  const unreadMarketSendersCount = isLoggedIn 
    ? conversations.filter(c => c.type === 'market' && c.unreadCount > 0).length 
    : 0;
  const totalUnreadSendersCount = isLoggedIn
    ? conversations.filter(c => c.unreadCount > 0).length
    : 0;
  const unreadSendersCount = activeSection === 'market' ? unreadMarketSendersCount : unreadSocialSendersCount;

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
  const handleLikePost = async (postId: string) => {
    let targetPost: Post | null = null;
    const currentUserId = currentUser.id;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        // Derive likedUserIds array safely
        const existingLikedUserIds: string[] = Array.isArray(p.likedUserIds)
          ? p.likedUserIds
          : (p.likedByMe ? [currentUserId] : []);

        const isCurrentlyLikedByMe = existingLikedUserIds.includes(currentUserId) || (p.likedByMe && existingLikedUserIds.length === 0);

        let newLikedUserIds: string[];
        let newLikesCount: number;

        if (isCurrentlyLikedByMe) {
          // Remove like for current user
          newLikedUserIds = existingLikedUserIds.filter(id => id !== currentUserId);
          newLikesCount = Math.max(0, (typeof p.likesCount === 'number' ? p.likesCount : existingLikedUserIds.length) - 1);
        } else {
          // Add like for current user
          newLikedUserIds = Array.from(new Set([...existingLikedUserIds, currentUserId]));
          newLikesCount = Math.max(newLikedUserIds.length, (typeof p.likesCount === 'number' ? p.likesCount : 0) + 1);
        }

        const updated: Post = {
          ...p,
          likedUserIds: newLikedUserIds,
          likedByMe: !isCurrentlyLikedByMe,
          likesCount: newLikesCount
        };
        targetPost = updated;
        return updated;
      }
      return p;
    }));

    if (targetPost) {
      try {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetPost)
        });
      } catch (err) {
        console.error('Failed to persist like to server:', err);
      }
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    const newComment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      text,
      createdAt: 'الآن'
    };

    let targetPost: Post | null = null;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const updated = {
          ...p,
          comments: [newComment, ...p.comments]
        };
        targetPost = updated;
        return updated;
      }
      return p;
    }));

    if (targetPost) {
      try {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetPost)
        });
      } catch (err) {
        console.error('Failed to persist comment to server:', err);
      }
    }
  };

  const handleCreatePost = async (title: string, description: string, media: MediaItem[], tags: string[]) => {
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

    // Optimistic UI update
    setPosts(prev => [newPost, ...prev]);
    setActiveSection('social');
    setActiveTab('feed');

    // Server-side persistence
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      if (res.ok) {
        const data = await res.json();
        const savedPost: Post = (data && data.post) ? data.post : data;
        if (savedPost && savedPost.id) {
          setPosts(prev => {
            const exists = prev.some(p => p.id === savedPost.id);
            if (exists) {
              return prev.map(p => p.id === savedPost.id ? savedPost : p);
            }
            return [savedPost, ...prev.filter(p => p.id !== newPost.id)];
          });
        }
      }
    } catch (err) {
      console.error('Failed to persist post to server:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete post on server:', err);
    }
  };

  // 2. Marketplace Handlers
  const handleAddToCart = (product: Product) => {
    // Prevent self-purchase: user cannot add their own products to cart
    const isOwnProduct = Boolean(
      currentUser && 
      currentUser.id !== 'guest' && 
      (
        (product.sellerId && currentUser.id && product.sellerId === currentUser.id) ||
        (product.seller?.username && currentUser.username && product.seller.username.toLowerCase() === currentUser.username.toLowerCase())
      )
    );

    if (isOwnProduct) {
      alert('⚠️ لا يمكنك إضافة منتجك المعروض للبيع إلى سلة الشراء (أنت صاحب هذا المنتج).');
      return;
    }

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
    // Prevent self-purchase: user cannot buy their own product
    const isOwnProduct = Boolean(
      currentUser && 
      currentUser.id !== 'guest' && 
      (
        (product.sellerId && currentUser.id && product.sellerId === currentUser.id) ||
        (product.seller?.username && currentUser.username && product.seller.username.toLowerCase() === currentUser.username.toLowerCase())
      )
    );

    if (isOwnProduct) {
      alert('⚠️ لا يمكنك شراء منتجك الخاص المعروض للبيع (أنت صاحب هذا العرض).');
      return;
    }

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
  const handleCreateProduct = async (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    originalPrice?: number;
    media: MediaItem[];
    fileUrl: string;
    downloadSize: string;
  }) => {
    const hasExistingSellerReviews = Boolean(currentUser.sellerReviewsCount && currentUser.sellerReviewsCount > 0);
    const initialRating = hasExistingSellerReviews ? (currentUser.sellerRating || 0) : 0;
    const initialReviewsCount = hasExistingSellerReviews ? currentUser.sellerReviewsCount! : 0;

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      sellerId: currentUser.id,
      seller: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        isVerified: true,
        rating: initialRating,
        reviewsCount: initialReviewsCount,
        trustScore: 100
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
      createdAt: new Date().toISOString(),
      escrowProtected: true,
      reviews: []
    };

    // Optimistic UI update
    setProducts(prev => [newProduct, ...prev]);
    setActiveSection('market');
    setActiveTab('marketplace');

    // Server-side persistence
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        const data = await res.json();
        const savedProduct: Product = (data && data.product) ? data.product : data;
        if (savedProduct && savedProduct.id) {
          setProducts(prev => {
            const exists = prev.some(p => p.id === savedProduct.id);
            if (exists) {
              return prev.map(p => p.id === savedProduct.id ? savedProduct : p);
            }
            return [savedProduct, ...prev.filter(p => p.id !== newProduct.id)];
          });
        }
      }
    } catch (err) {
      console.error('Failed to persist product to server:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete product on server:', err);
    }
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
      buyerId: currentUser.id,
      buyerUsername: currentUser.username,
      buyerEmail: currentUser.email,
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

    // Persist to server
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrders)
    }).catch(err => console.log('Notice: using local storage fallback for orders:', err));

    // ACCURATE SALES COUNT & REVENUE UPDATE FOR PURCHASED PRODUCTS
    const boughtQtyMap = new Map<string, number>();
    ordersData.items.forEach(it => {
      boughtQtyMap.set(it.product.id, (boughtQtyMap.get(it.product.id) || 0) + it.quantity);
    });

    let updatedProductsToSync: Product[] = [];
    setProducts(prev => {
      const next = prev.map(p => {
        const addQty = boughtQtyMap.get(p.id);
        if (addQty) {
          const updatedProd: Product = {
            ...p,
            salesCount: (p.salesCount || 0) + addQty,
            seller: {
              ...p.seller,
              totalSales: (p.seller?.totalSales || 0) + addQty
            }
          };
          updatedProductsToSync.push(updatedProd);
          return updatedProd;
        }
        return p;
      });
      return next;
    });

    // Sync updated product sales to backend
    for (const prod of updatedProductsToSync) {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod)
      }).catch(err => console.log('Products sync error:', err));
    }

    // ACCURATE REVENUE & SELLER SALES UPDATE IF CURRENT USER IS THE SELLER
    let userSalesAdded = 0;
    const soldTitles: string[] = [];
    ordersData.items.forEach(it => {
      const isSeller = Boolean(
        currentUser && currentUser.id !== 'guest' && (
          (it.product.sellerId && currentUser.id && it.product.sellerId === currentUser.id) ||
          (it.product.seller?.username && currentUser.username && it.product.seller.username.toLowerCase() === currentUser.username.toLowerCase())
        )
      );
      if (isSeller) {
        userSalesAdded += it.quantity;
        soldTitles.push(it.product.title);
      }
    });

    if (userSalesAdded > 0) {
      setCurrentUser(prev => {
        const updated = {
          ...prev,
          totalSales: (prev.totalSales || 0) + userSalesAdded
        };
        localStorage.setItem('socialcart_user', JSON.stringify(updated));
        return updated;
      });

      const sellerNotif: NotificationItem = {
        id: `notif_sale_${Date.now()}`,
        title: '💰 مبيعات جديدة أضيفت لمحفظتك!',
        message: `تم شراء (${userSalesAdded}) نسخة من منتجاتك (${soldTitles.join(', ')}). زاد إجمالي مبيعاتك وأرباحك بحماية الضمان Escrow.`,
        type: 'market',
        isRead: false,
        createdAt: 'الآن',
        linkTab: 'profile'
      };
      setNotifications(prev => [sellerNotif, ...prev]);
    }

    // Remove bought items from cart
    const boughtIds = new Set(ordersData.items.map(i => i.product.id));
    setCartItems(prev => prev.filter(i => !boughtIds.has(i.product.id)));

    // Add security notification for the buyer
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
  const handleRateSellerSubmit = async (orderId: string, rating: number, comment: string) => {
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

    // Update product reviews & seller rating mathematically
    let updatedProductsToSync: Product[] = [];
    setProducts(prev => {
      const next = prev.map(p => {
        if (p.seller.username.toLowerCase() === targetOrder.sellerUsername.toLowerCase()) {
          const updatedReviews = [newReview, ...(p.reviews || [])];
          const avg = Number((updatedReviews.reduce((s, r) => s + Number(r.rating || 0), 0) / updatedReviews.length).toFixed(1));
          const updatedProd = {
            ...p,
            rating: avg,
            reviews: updatedReviews,
            seller: {
              ...p.seller,
              rating: avg,
              reviewsCount: updatedReviews.length
            }
          };
          updatedProductsToSync.push(updatedProd);
          return updatedProd;
        }
        return p;
      });
      return next;
    });

    // If target seller is the current logged in user, update their sellerRating & reviewsCount
    if (currentUser && currentUser.username.toLowerCase() === targetOrder.sellerUsername.toLowerCase()) {
      setCurrentUser(prev => {
        const nextReviewsCount = (prev.sellerReviewsCount || 0) + 1;
        const prevSum = (prev.sellerRating || 5) * (prev.sellerReviewsCount || 0);
        const newAvg = Number(((prevSum + rating) / nextReviewsCount).toFixed(1));
        const updated = {
          ...prev,
          sellerRating: newAvg,
          sellerReviewsCount: nextReviewsCount
        };
        localStorage.setItem('socialcart_user', JSON.stringify(updated));
        return updated;
      });
    }

    for (const prod of updatedProductsToSync) {
      try {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
      } catch (err) {
        console.error('Failed to sync updated product review to server:', err);
      }
    }
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
    const nowIso = new Date().toISOString();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      text,
      media,
      createdAt: nowIso,
      isMe: true
    };

    let targetConv = conversations.find(c => c.id === conversationId);

    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: text || (media?.length ? 'ملف وسائط مرفق' : ''),
          lastMessageTime: nowIso,
          unreadCount: 0,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    }));
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== conversationId);
      const userKey = getUserStorageKey('socialcart_conversations', currentUser.id);
      localStorage.setItem(userKey, JSON.stringify(filtered));
      return filtered;
    });

    if (selectedMarketConvId === conversationId) {
      setSelectedMarketConvId(null);
    }
    if (selectedSocialConvId === conversationId) {
      setSelectedSocialConvId(null);
    }

    // Also remove notifications related to this deleted conversation
    setNotifications(prev => prev.filter(n => n.targetConvId !== conversationId));
  };

  const handleStartNewConversation = (
    participantUsername: string,
    participantDisplayName: string,
    participantAvatar: string,
    type: 'social' | 'market',
    initialMessage?: string,
    productTitle?: string
  ) => {
    // Switch active section to match target conversation type
    setActiveSection(type);

    const cleanUsername = participantUsername.replace(/^@/, '').trim();
    // Strictly find matching conversation of the EXACT same type
    const existing = conversations.find(
      c => c.participantUsername.toLowerCase() === cleanUsername.toLowerCase() && c.type === type
    );

    if (existing) {
      if (initialMessage && initialMessage.trim()) {
        handleSendMessage(existing.id, initialMessage.trim());
      }
      if (productTitle && existing.relatedProductTitle !== productTitle) {
        setConversations(prev => prev.map(c => c.id === existing.id ? { ...c, relatedProductTitle: productTitle, type } : c));
      }
      if (type === 'market') {
        setSelectedMarketConvId(existing.id);
      } else {
        setSelectedSocialConvId(existing.id);
      }
      handleMarkConversationRead(existing.id);
      setActiveTab('messages');
      return;
    }

    const nowIso = new Date().toISOString();
    const newConvId = `conv_${Date.now()}`;
    const trimmedMessage = initialMessage?.trim();
    const newConv: Conversation = {
      id: newConvId,
      userId: currentUser.id,
      creatorId: currentUser.id,
      creatorUsername: currentUser.username,
      creatorDisplayName: currentUser.displayName,
      creatorAvatar: currentUser.avatar,
      participantId: `usr_${cleanUsername}`,
      participantUsername: cleanUsername,
      participantDisplayName,
      participantAvatar,
      participants: Array.from(new Set([currentUser.username.toLowerCase(), cleanUsername.toLowerCase()])),
      isVerified: true,
      type,
      relatedProductTitle: type === 'market' ? productTitle : undefined,
      lastMessage: trimmedMessage || (type === 'market' && productTitle ? `استفسار: ${productTitle}` : (type === 'market' ? 'استفسار جديد في المتجر' : 'محادثة اجتماعية جديدة')),
      lastMessageTime: nowIso,
      unreadCount: 0,
      messages: trimmedMessage
        ? [
            {
              id: `msg_init_${Date.now()}`,
              senderId: currentUser.id,
              senderUsername: currentUser.username,
              senderAvatar: currentUser.avatar,
              text: trimmedMessage,
              createdAt: nowIso,
              isMe: true
            }
          ]
        : []
    };

    setConversations(prev => [newConv, ...prev]);
    if (type === 'market') {
      setSelectedMarketConvId(newConvId);
    } else {
      setSelectedSocialConvId(newConvId);
    }
    setActiveTab('messages');
  };

  const handleOpenDirectChat = (
    username: string, 
    displayName: string, 
    avatar: string, 
    productTitle?: string
  ) => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    // A chat opened with a productTitle is a store/market inquiry.
    // A chat opened without productTitle (from Social Feed, author profile, comments, stories) is strictly SOCIAL!
    const targetType: 'social' | 'market' = productTitle ? 'market' : 'social';
    setActiveSection(targetType);

    const cleanUsername = username.replace(/^@/, '').trim();
    
    // Find conversation strictly matching targetType.
    // NEVER allow a social chat action to redirect or match a marketplace store inquiry!
    const existing = targetType === 'market'
      ? (
          conversations.find(
            c => c.participantUsername.toLowerCase() === cleanUsername.toLowerCase() && 
                 c.type === 'market' && 
                 productTitle && c.relatedProductTitle === productTitle
          ) ||
          conversations.find(
            c => c.participantUsername.toLowerCase() === cleanUsername.toLowerCase() && 
                 c.type === 'market'
          )
        )
      : conversations.find(
          c => c.participantUsername.toLowerCase() === cleanUsername.toLowerCase() && 
               c.type === 'social'
        );

    if (existing) {
      if (productTitle && existing.relatedProductTitle !== productTitle) {
        setConversations(prev => prev.map(c => c.id === existing.id ? { ...c, relatedProductTitle: productTitle, type: 'market' } : c));
      }
      if (targetType === 'market') {
        setSelectedMarketConvId(existing.id);
      } else {
        setSelectedSocialConvId(existing.id);
      }
      handleMarkConversationRead(existing.id);
      setActiveTab('messages');
      return;
    }

    // Start completely clean conversation of the target type without sending any random/automated message
    handleStartNewConversation(
      cleanUsername,
      displayName,
      avatar,
      targetType,
      '',
      targetType === 'market' ? productTitle : undefined
    );
  };

  // 8. Profile Update Handler (Saves Name, Username, Bio, Password, Card, Email locally & to server)
  const handleUpdateProfile = (updated: Partial<User>) => {
    let nextUser: User = { ...currentUser, ...updated };
    if ('savedCard' in updated) {
      nextUser.savedCard = updated.savedCard ?? null;
    }

    setCurrentUser(prev => {
      const merged = { ...prev, ...updated };
      if ('savedCard' in updated) {
        merged.savedCard = updated.savedCard ?? null;
      }
      return merged;
    });

    // 1. Immediately persist to active user localStorage
    localStorage.setItem('socialcart_user', JSON.stringify(nextUser));

    // 2. Persist to registered users list for multi-account / relogin caching
    const registeredStr = localStorage.getItem('socialcart_registered_users');
    let registeredUsers: User[] = [];
    if (registeredStr) {
      try { registeredUsers = JSON.parse(registeredStr); } catch {}
    }
    const idx = registeredUsers.findIndex(u => 
      (nextUser.id && u.id === nextUser.id) || 
      (currentUser.id && u.id === currentUser.id) ||
      (currentUser.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (nextUser.email && u.email && u.email.toLowerCase() === nextUser.email.toLowerCase()) ||
      (nextUser.username && u.username && u.username.toLowerCase() === nextUser.username.toLowerCase())
    );
    if (idx >= 0) {
      registeredUsers[idx] = { 
        ...registeredUsers[idx], 
        ...nextUser,
        savedCard: nextUser.savedCard ?? null
      };
    } else {
      registeredUsers.push(nextUser);
    }
    localStorage.setItem('socialcart_registered_users', JSON.stringify(registeredUsers));

    // 3. Persist to server REST API in data/users.json
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextUser)
    }).catch(err => console.warn('Server user persistence note:', err));

    // 4. If logged into Firebase Auth, synchronize credentials safely
    if (auth.currentUser) {
      if (updated.password) {
        updatePassword(auth.currentUser, updated.password).catch(err => 
          console.log('Notice: Firebase password update:', err.message)
        );
      }
      if (updated.displayName || updated.avatar) {
        updateProfile(auth.currentUser, {
          displayName: updated.displayName || auth.currentUser.displayName,
          photoURL: updated.avatar || auth.currentUser.photoURL
        }).catch(err => console.log('Notice: Firebase profile update:', err.message));
      }
      if (updated.email && updated.email !== auth.currentUser.email) {
        updateEmail(auth.currentUser, updated.email).catch(err => 
          console.log('Notice: Firebase email update:', err.message)
        );
      }
    }

    // 5. If avatar, displayName or username changed, synchronize authored posts & products
    if (updated.avatar || updated.displayName || updated.username) {
      const oldUsername = currentUser.username;
      const newUsername = updated.username || oldUsername;
      const newDisplayName = updated.displayName || currentUser.displayName;
      const newAvatar = updated.avatar || currentUser.avatar;

      setPosts(prevPosts => {
        const nextPosts = prevPosts.map(post => {
          if (post.author.id === currentUser.id || post.author.username === oldUsername) {
            return {
              ...post,
              author: {
                ...post.author,
                displayName: newDisplayName,
                username: newUsername,
                avatar: newAvatar,
              }
            };
          }
          return post;
        });
        nextPosts.forEach(p => {
          if (p.author.id === currentUser.id || p.author.username === newUsername) {
            fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p)
            }).catch(() => {});
          }
        });
        return nextPosts;
      });

      setProducts(prevProducts => {
        const nextProds = prevProducts.map(prod => {
          if (prod.seller?.username === oldUsername || prod.seller?.username === newUsername) {
            return {
              ...prod,
              seller: {
                ...prod.seller,
                displayName: newDisplayName,
                username: newUsername,
                avatar: newAvatar,
              }
            };
          }
          return prod;
        });
        nextProds.forEach(p => {
          if (p.seller?.username === newUsername) {
            fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p)
            }).catch(() => {});
          }
        });
        return nextProds;
      });
    }
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
        onSelectNotification={(notif) => {
          if (notif.linkTab) {
            handleSelectTab(notif.linkTab);
          }
        }}
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

        {/* TAB: Messages Hub (Separated per section: Social vs Market) */}
        {activeTab === 'messages' && (
          isLoggedIn ? (
            <MessagesHub
              conversations={conversations}
              currentUser={currentUser}
              mode={activeSection}
              onSendMessage={handleSendMessage}
              onStartNewConversation={handleStartNewConversation}
              initialActiveConvId={(activeSection === 'market' ? selectedMarketConvId : selectedSocialConvId) || undefined}
              onSelectConversation={(convId) => {
                if (activeSection === 'market') {
                  setSelectedMarketConvId(convId);
                } else {
                  setSelectedSocialConvId(convId);
                }
                handleMarkConversationRead(convId);
              }}
              onBackToList={() => {
                if (activeSection === 'market') {
                  setSelectedMarketConvId(null);
                } else {
                  setSelectedSocialConvId(null);
                }
              }}
              onMarkConversationRead={handleMarkConversationRead}
              onMarkAllConversationsRead={handleMarkAllConversationsRead}
              onDeleteConversation={handleDeleteConversation}
              onNavigateToMarket={() => {
                setActiveSection('market');
                setActiveTab('marketplace');
              }}
              onNavigateToFeed={() => {
                setActiveSection('social');
                setActiveTab('feed');
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
              orders={orders.filter(o => 
                !o.buyerId || 
                o.buyerId === currentUser.id || 
                (currentUser.email && o.buyerEmail?.toLowerCase() === currentUser.email.toLowerCase())
              )}
              onDownloadFile={handleDownloadFile}
              onRateSeller={(order) => setReviewOrderTarget(order)}
              onRequestRefund={(order) => {
                setReportTarget({ type: 'order', id: order.id, title: order.productTitle });
              }}
              onExploreMarket={() => {
                setActiveSection('market');
                setActiveTab('marketplace');
              }}
              onOpenDirectChat={handleOpenDirectChat}
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
              onLogout={handleLogout}
              posts={posts}
              products={products}
              onDeletePost={handleDeletePost}
              onDeleteProduct={handleDeleteProduct}
              onOpenCreatePost={() => setIsCreatePostOpen(true)}
              onOpenCreateProduct={() => setIsCreateProductOpen(true)}
              initialTab={activeSection === 'market' ? 'my-products' : 'my-posts'}
              onNavigateToFeed={() => {
                setActiveSection('social');
                setActiveTab('feed');
              }}
              onNavigateToMarket={() => {
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
        onSwitchSection={(section) => setActiveSection(section)}
        cartBadgeCount={cartBadgeCount}
        unreadMessagesCount={unreadSocialSendersCount}
        unreadMarketMessagesCount={unreadMarketSendersCount}
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
        onUpdateProfile={handleUpdateProfile}
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
        onOpenDirectChat={handleOpenDirectChat}
      />

      {/* 7. Authentication Modal (Firebase Login / Register / Google Auth) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        registeredUsernames={allRegisteredUsernames}
        registeredEmails={allRegisteredEmails}
      />

      {/* 8. Account Menu Drawer (Profile, Orders, Logout) */}
      <AccountMenuModal
        isOpen={isAccountMenuOpen}
        onClose={() => setIsAccountMenuOpen(false)}
        currentUser={currentUser}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
      />

    </div>
  );
}

