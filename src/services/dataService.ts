import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  Unsubscribe
} from 'firebase/firestore';
import { Post, Product, Conversation, Message, Order, User } from '../types';

/**
 * Checks if real Firebase credentials are configured in the environment
 */
export const isFirebaseReady = (): boolean => {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey || apiKey === 'demo-api-key' || apiKey.trim() === '') {
      return false;
    }
    return Boolean(db);
  } catch {
    return false;
  }
};

// ==========================================
// 1. POSTS PERSISTENCE & REALTIME SYNC
// ==========================================

export async function fetchRemotePosts(): Promise<Post[]> {
  let firestorePosts: Post[] = [];
  
  if (isFirebaseReady()) {
    try {
      const snap = await getDocs(collection(db, 'posts'));
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data() as Post;
          if (data && data.id) {
            firestorePosts.push(data);
          }
        });
      }
    } catch (err) {
      console.warn('Notice: Firestore posts fetch:', err);
    }
  }

  // Fetch server posts
  let serverPosts: Post[] = [];
  try {
    const res = await fetch('/api/posts');
    if (res.ok) {
      const data = await res.json();
      serverPosts = Array.isArray(data) ? data : (data?.posts || []);
    }
  } catch (err) {
    console.warn('Notice: Server posts fetch:', err);
  }

  // Merge results, preferring Firestore if both exist
  const postMap = new Map<string, Post>();
  serverPosts.forEach(p => { if (p && p.id) postMap.set(p.id, p); });
  firestorePosts.forEach(p => { if (p && p.id) postMap.set(p.id, p); });

  // If we got items from Firestore that weren't on server, sync them to server
  if (firestorePosts.length > 0) {
    firestorePosts.forEach(p => {
      if (!serverPosts.some(sp => sp.id === p.id)) {
        fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        }).catch(() => {});
      }
    });
  }

  return Array.from(postMap.values());
}

export async function saveRemotePost(post: Post): Promise<void> {
  // 1. Write to Firebase Firestore
  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'posts', post.id), post, { merge: true });
    } catch (err) {
      console.warn('Notice: Firestore save post:', err);
    }
  }

  // 2. Write to Express Backend
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
  } catch (err) {
    console.warn('Notice: Server save post:', err);
  }
}

export async function toggleRemotePostLike(
  postId: string,
  userId: string,
  username: string
): Promise<{ likedUserIds: string[]; likesCount: number } | null> {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        likedUserIds: Array.isArray(data.likedUserIds) ? data.likedUserIds : [],
        likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0
      };
    }
  } catch (err) {
    console.warn('Notice: Server toggle post like:', err);
  }
  return null;
}

export async function deleteRemotePost(postId: string): Promise<void> {
  if (isFirebaseReady()) {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn('Notice: Firestore delete post:', err);
    }
  }

  try {
    await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Notice: Server delete post:', err);
  }
}

export function subscribeToRemotePosts(onUpdate: (posts: Post[]) => void): () => void {
  let unsubFirestore: Unsubscribe | null = null;

  if (isFirebaseReady()) {
    try {
      unsubFirestore = onSnapshot(collection(db, 'posts'), (snap) => {
        if (!snap.empty) {
          const list: Post[] = [];
          snap.forEach(d => {
            const item = d.data() as Post;
            if (item && item.id) list.push(item);
          });
          onUpdate(list);
        }
      }, (err) => {
        console.warn('Firestore posts realtime subscription:', err);
      });
    } catch (err) {
      console.warn('Failed to attach Firestore posts listener:', err);
    }
  }

  // Periodic polling fallback for server API to keep different browsers in sync
  const pollInterval = setInterval(() => {
    fetch('/api/posts')
      .then(res => res.ok ? res.json() : [])
      .then((serverPosts: Post[]) => {
        if (Array.isArray(serverPosts) && serverPosts.length > 0) {
          onUpdate(serverPosts);
        }
      })
      .catch(() => {});
  }, 7000);

  return () => {
    if (unsubFirestore) unsubFirestore();
    clearInterval(pollInterval);
  };
}

// ==========================================
// 2. PRODUCTS PERSISTENCE & REALTIME SYNC
// ==========================================

export async function fetchRemoteProducts(): Promise<Product[]> {
  let firestoreProducts: Product[] = [];
  
  if (isFirebaseReady()) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data() as Product;
          if (data && data.id) {
            firestoreProducts.push(data);
          }
        });
      }
    } catch (err) {
      console.warn('Notice: Firestore products fetch:', err);
    }
  }

  // Fetch server products
  let serverProducts: Product[] = [];
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      serverProducts = Array.isArray(data) ? data : (data?.products || []);
    }
  } catch (err) {
    console.warn('Notice: Server products fetch:', err);
  }

  const prodMap = new Map<string, Product>();
  serverProducts.forEach(p => { if (p && p.id) prodMap.set(p.id, p); });
  firestoreProducts.forEach(p => { if (p && p.id) prodMap.set(p.id, p); });

  // Sync to server if found in Firestore
  if (firestoreProducts.length > 0) {
    firestoreProducts.forEach(p => {
      if (!serverProducts.some(sp => sp.id === p.id)) {
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        }).catch(() => {});
      }
    });
  }

  return Array.from(prodMap.values());
}

export async function saveRemoteProduct(product: Product): Promise<void> {
  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'products', product.id), product, { merge: true });
    } catch (err) {
      console.warn('Notice: Firestore save product:', err);
    }
  }

  try {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
  } catch (err) {
    console.warn('Notice: Server save product:', err);
  }
}

export async function deleteRemoteProduct(productId: string): Promise<void> {
  if (isFirebaseReady()) {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      console.warn('Notice: Firestore delete product:', err);
    }
  }

  try {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Notice: Server delete product:', err);
  }
}

export function subscribeToRemoteProducts(onUpdate: (products: Product[]) => void): () => void {
  let unsubFirestore: Unsubscribe | null = null;

  if (isFirebaseReady()) {
    try {
      unsubFirestore = onSnapshot(collection(db, 'products'), (snap) => {
        if (!snap.empty) {
          const list: Product[] = [];
          snap.forEach(d => {
            const item = d.data() as Product;
            if (item && item.id) list.push(item);
          });
          onUpdate(list);
        }
      }, (err) => {
        console.warn('Firestore products realtime subscription:', err);
      });
    } catch (err) {
      console.warn('Failed to attach Firestore products listener:', err);
    }
  }

  const pollInterval = setInterval(() => {
    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then((serverProds: Product[]) => {
        if (Array.isArray(serverProds) && serverProds.length > 0) {
          onUpdate(serverProds);
        }
      })
      .catch(() => {});
  }, 7000);

  return () => {
    if (unsubFirestore) unsubFirestore();
    clearInterval(pollInterval);
  };
}

// ==========================================
// 3. CONVERSATIONS & MESSAGES (CROSS-BROWSER)
// ==========================================

export async function fetchRemoteConversations(userId: string, username?: string): Promise<Conversation[]> {
  if (!userId || userId === 'guest') return [];

  const cleanUser = (username || '').replace(/^@/, '').toLowerCase().trim();
  let firestoreConvs: Conversation[] = [];

  if (isFirebaseReady()) {
    try {
      // 1. Fetch conversations from Firestore
      const snap = await getDocs(collection(db, 'conversations'));
      if (!snap.empty) {
        snap.forEach(d => {
          const conv = d.data() as Conversation;
          if (!conv || !conv.id) return;
          const participants = Array.isArray(conv.participants) 
            ? conv.participants.map(p => (p || '').toLowerCase()) 
            : [(conv.creatorUsername || '').toLowerCase(), (conv.participantUsername || '').toLowerCase()];

          const isMatch = (cleanUser && participants.includes(cleanUser)) ||
            conv.userId === userId ||
            conv.creatorId === userId ||
            conv.participantId === userId ||
            (cleanUser && conv.participantUsername?.toLowerCase() === cleanUser) ||
            (cleanUser && conv.creatorUsername?.toLowerCase() === cleanUser);

          if (isMatch) {
            firestoreConvs.push(conv);
          }
        });
      }
    } catch (err) {
      console.warn('Notice: Firestore conversations fetch:', err);
    }
  }

  // 2. Fetch conversations from Server API
  let serverConvs: Conversation[] = [];
  try {
    const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(cleanUser)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverConvs = data;
      }
    }
  } catch (err) {
    console.warn('Notice: Server conversations fetch:', err);
  }

  const convMap = new Map<string, Conversation>();
  serverConvs.forEach(c => { if (c && c.id) convMap.set(c.id, c); });
  firestoreConvs.forEach(c => { if (c && c.id) convMap.set(c.id, c); });

  // Sync to server if found in Firestore
  if (firestoreConvs.length > 0) {
    firestoreConvs.forEach(c => {
      if (!serverConvs.some(sc => sc.id === c.id)) {
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c)
        }).catch(() => {});
      }
    });
  }

  return Array.from(convMap.values());
}

export async function saveRemoteConversation(conv: Conversation): Promise<void> {
  // Ensure normalized participants array
  const participants = Array.from(new Set([
    conv.creatorUsername || '',
    conv.participantUsername || ''
  ].map(u => (u || '').replace(/^@/, '').toLowerCase().trim()).filter(Boolean)));

  const cleanConv: Conversation = {
    ...conv,
    participants: participants.length > 0 ? participants : (conv.participants || [])
  };

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'conversations', cleanConv.id), cleanConv, { merge: true });
    } catch (err) {
      console.warn('Notice: Firestore save conversation:', err);
    }
  }

  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanConv)
    });
  } catch (err) {
    console.warn('Notice: Server save conversation:', err);
  }
}

export async function sendRemoteMessage(
  convId: string, 
  message: Message, 
  unreadCountBy?: Record<string, number>,
  conversation?: Conversation
): Promise<void> {
  // 1. Firebase Firestore
  if (isFirebaseReady()) {
    try {
      const convRef = doc(db, 'conversations', convId);
      const docSnap = await getDoc(convRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Conversation;
        const currentMessages = Array.isArray(data.messages) ? data.messages : [];
        const updatedMessages = [...currentMessages, message];
        await updateDoc(convRef, {
          messages: updatedMessages,
          lastMessage: message.text || (message.media?.length ? 'ملف وسائط مرفق' : ''),
          lastMessageTime: message.createdAt,
          unreadCountBy: { ...(data.unreadCountBy || {}), ...unreadCountBy }
        });
      } else if (conversation) {
        await setDoc(convRef, {
          ...conversation,
          id: convId,
          messages: [message],
          lastMessage: message.text || (message.media?.length ? 'ملف وسائط مرفق' : ''),
          lastMessageTime: message.createdAt,
          unreadCountBy: unreadCountBy || {}
        });
      }
    } catch (err) {
      console.warn('Notice: Firestore send message:', err);
    }
  }

  // 2. Server API
  try {
    await fetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, unreadCountBy, conversation })
    });
    // Trigger immediate local sync across active tabs and components
    try {
      window.dispatchEvent(new CustomEvent('socialcart_conversation_updated', { detail: { convId } }));
    } catch {}
  } catch (err) {
    console.warn('Notice: Server send message:', err);
  }
}

export async function markRemoteConversationRead(convId: string, username: string): Promise<void> {
  const cleanU = (username || '').toLowerCase().trim().replace(/^@+/, '');
  if (!cleanU) return;
  const nowIso = new Date().toISOString();

  if (isFirebaseReady()) {
    try {
      const convRef = doc(db, 'conversations', convId);
      const snap = await getDoc(convRef);
      if (snap.exists()) {
        const data = snap.data() as Conversation;
        const unreadBy = { ...(data.unreadCountBy || {}) };
        unreadBy[cleanU] = 0;
        const lastReadAtBy = { ...(data.lastReadAtBy || {}) };
        lastReadAtBy[cleanU] = nowIso;

        const msgs = Array.isArray(data.messages) ? data.messages.map(m => {
          const currentRead = Array.isArray(m.readBy) ? m.readBy : [];
          if (!currentRead.includes(cleanU)) {
            return { ...m, readBy: [...currentRead, cleanU] };
          }
          return m;
        }) : [];

        await updateDoc(convRef, {
          unreadCount: 0,
          unreadCountBy: unreadBy,
          lastReadAtBy: lastReadAtBy,
          messages: msgs
        });
      }
    } catch (err) {}
  }

  try {
    await fetch(`/api/conversations/${convId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanU })
    });
    try {
      window.dispatchEvent(new CustomEvent('socialcart_conversation_updated', { detail: { convId } }));
    } catch {}
  } catch (err) {}
}

export async function deleteRemoteConversation(convId: string): Promise<void> {
  if (isFirebaseReady()) {
    try {
      await deleteDoc(doc(db, 'conversations', convId));
    } catch (err) {}
  }

  try {
    await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
  } catch (err) {}
}

export function subscribeToRemoteConversations(
  userId: string,
  username: string,
  onUpdate: (convs: Conversation[]) => void
): () => void {
  if (!userId || userId === 'guest') return () => {};

  const cleanUser = (username || '').replace(/^@/, '').toLowerCase().trim();
  let unsubFirestore: Unsubscribe | null = null;

  if (isFirebaseReady()) {
    try {
      unsubFirestore = onSnapshot(collection(db, 'conversations'), (snap) => {
        if (!snap.empty) {
          const list: Conversation[] = [];
          snap.forEach(d => {
            const conv = d.data() as Conversation;
            if (!conv || !conv.id) return;
            const participants = Array.isArray(conv.participants)
              ? conv.participants.map(p => (p || '').toLowerCase())
              : [(conv.creatorUsername || '').toLowerCase(), (conv.participantUsername || '').toLowerCase()];

            const isMatch = (cleanUser && participants.includes(cleanUser)) ||
              conv.userId === userId ||
              conv.creatorId === userId ||
              conv.participantId === userId ||
              (cleanUser && conv.participantUsername?.toLowerCase() === cleanUser) ||
              (cleanUser && conv.creatorUsername?.toLowerCase() === cleanUser);

            if (isMatch) {
              list.push(conv);
            }
          });
          onUpdate(list);
        }
      }, (err) => {
        console.warn('Firestore conversations realtime listener error:', err);
      });
    } catch (err) {
      console.warn('Failed to attach Firestore conversations listener:', err);
    }
  }

  const fetchLatest = () => {
    fetch(`/api/conversations?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(cleanUser)}`)
      .then(res => res.ok ? res.json() : [])
      .then((serverConvs: Conversation[]) => {
        if (Array.isArray(serverConvs)) {
          onUpdate(serverConvs);
        }
      })
      .catch(() => {});
  };

  // Ultra-fast polling every 1200ms to eliminate messaging latency
  const pollInterval = setInterval(fetchLatest, 1200);

  // Instant response to local message events
  const handleLocalUpdate = () => {
    fetchLatest();
  };
  window.addEventListener('socialcart_conversation_updated', handleLocalUpdate);

  return () => {
    if (unsubFirestore) unsubFirestore();
    clearInterval(pollInterval);
    window.removeEventListener('socialcart_conversation_updated', handleLocalUpdate);
  };
}

// ==========================================
// 4. ORDERS PERSISTENCE
// ==========================================

export async function fetchRemoteOrders(userId: string, email?: string): Promise<Order[]> {
  if (!userId || userId === 'guest') return [];

  let firestoreOrders: Order[] = [];
  if (isFirebaseReady()) {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        snap.forEach(d => {
          const o = d.data() as Order;
          if (o && o.id && (o.buyerId === userId || (email && o.buyerEmail?.toLowerCase() === email.toLowerCase()))) {
            firestoreOrders.push(o);
          }
        });
      }
    } catch (err) {}
  }

  let serverOrders: Order[] = [];
  try {
    const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) serverOrders = data;
    }
  } catch (err) {}

  const orderMap = new Map<string, Order>();
  serverOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
  firestoreOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });

  return Array.from(orderMap.values());
}

export async function saveRemoteOrder(order: Order): Promise<void> {
  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'orders', order.id), order, { merge: true });
    } catch (err) {}
  }

  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
  } catch (err) {}
}

// ==========================================
// 5. USERS PERSISTENCE
// ==========================================

export async function fetchRemoteUser(identifier: string): Promise<User | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();

  if (isFirebaseReady()) {
    try {
      const userDoc = await getDoc(doc(db, 'users', identifier));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
    } catch (err) {}
  }

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  return null;
}

export async function saveRemoteUser(user: User): Promise<void> {
  if (!user || (!user.id && !user.email)) return;

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    } catch (err) {}
  }

  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch (err) {}
}
