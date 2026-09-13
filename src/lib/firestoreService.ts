import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Post, Product, Conversation, Order, User } from "../types";

const POSTS_COLLECTION = "posts";
const PRODUCTS_COLLECTION = "products";
const CONVERSATIONS_COLLECTION = "conversations";
const ORDERS_COLLECTION = "orders";
const USERS_COLLECTION = "users";

/**
 * Real-time listener for Posts across all browsers and devices.
 */
export function subscribeToPosts(onUpdate: (posts: Post[]) => void): () => void {
  try {
    const colRef = collection(db, POSTS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Post;
          if (data && data.id) {
            posts.push({
              ...data,
              id: docSnap.id || data.id,
              media: Array.isArray(data.media) ? data.media : [],
              comments: Array.isArray(data.comments) ? data.comments : [],
              likesCount: typeof data.likesCount === "number" ? data.likesCount : 0,
              sharesCount: typeof data.sharesCount === "number" ? data.sharesCount : 0,
              tags: Array.isArray(data.tags) ? data.tags : [],
            });
          }
        });
        // Sort descending by createdAt or timestamp
        posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(posts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, POSTS_COLLECTION);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to cloud posts:", err);
    return () => {};
  }
}

/**
 * Real-time listener for Products across all browsers and devices.
 */
export function subscribeToProducts(onUpdate: (products: Product[]) => void): () => void {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          if (data && data.id) {
            const revs = Array.isArray(data.reviews) ? data.reviews : [];
            const actualCount = revs.length;
            const actualRating = actualCount > 0
              ? Number((revs.reduce((s, r) => s + Number(r.rating || 0), 0) / actualCount).toFixed(1))
              : (actualCount === 0 ? 0 : (data.seller?.rating || 5.0));

            products.push({
              ...data,
              id: docSnap.id || data.id,
              media: Array.isArray(data.media) ? data.media : [],
              reviews: revs,
              rating: actualRating,
              seller: {
                ...(data.seller || {
                  username: "seller",
                  displayName: "بائع معتمد",
                  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                  isVerified: true,
                  rating: actualRating,
                  reviewsCount: actualCount,
                  trustScore: 98,
                }),
                rating: actualRating,
                reviewsCount: actualCount,
              },
            });
          }
        });
        products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(products);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to cloud products:", err);
    return () => {};
  }
}

/**
 * Real-time listener for Conversations involving the current user.
 */
export function subscribeToConversations(
  username: string,
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): () => void {
  if (!username && !userId) return () => {};
  const cleanUser = (username || "").replace(/^@/, "").toLowerCase().trim();

  try {
    const colRef = collection(db, CONVERSATIONS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          const c = docSnap.data() as Conversation;
          if (!c || !c.id) return;

          // Check if current user is participant, target, creator, or owner
          const participants = (c.participants || [
            c.creatorUsername || "",
            c.participantUsername || "",
          ]).map((p) => String(p).toLowerCase().trim());

          const isParticipant = cleanUser && participants.includes(cleanUser);
          const isTarget = c.participantUsername?.toLowerCase().trim() === cleanUser;
          const isCreator = c.creatorUsername?.toLowerCase().trim() === cleanUser;
          const isOwner = c.userId === userId || c.participantId === userId;

          if (isParticipant || isTarget || isCreator || isOwner) {
            let adapted = { ...c, id: docSnap.id || c.id };

            // Adjust recipient labels if viewing user is target and not creator
            if (c.participantUsername?.toLowerCase().trim() === cleanUser && c.creatorUsername) {
              adapted = {
                ...adapted,
                participantUsername: c.creatorUsername,
                participantDisplayName: c.creatorDisplayName || c.creatorUsername,
                participantAvatar: c.creatorAvatar || c.participantAvatar,
              };
            }

            // Unread count
            if (cleanUser && c.unreadCountBy && typeof c.unreadCountBy[cleanUser] === "number") {
              adapted.unreadCount = c.unreadCountBy[cleanUser];
            } else {
              adapted.unreadCount = adapted.unreadCount || 0;
            }

            // Dynamically recalculate isMe for the viewing user
            if (Array.isArray(adapted.messages)) {
              adapted.messages = adapted.messages.map((m) => ({
                ...m,
                isMe: m.senderUsername?.toLowerCase().trim() === cleanUser,
              }));
            }

            list.push(adapted);
          }
        });

        list.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, CONVERSATIONS_COLLECTION);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to cloud conversations:", err);
    return () => {};
  }
}

/**
 * Real-time listener for Orders of the current user.
 */
export function subscribeToOrders(
  userId: string,
  userEmail: string | undefined,
  onUpdate: (orders: Order[]) => void
): () => void {
  if (!userId || userId === "guest") return () => {};
  const cleanEmail = (userEmail || "").toLowerCase().trim();

  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((docSnap) => {
          const o = docSnap.data() as Order;
          if (
            o &&
            o.id &&
            (o.buyerId === userId || (cleanEmail && o.buyerEmail?.toLowerCase().trim() === cleanEmail))
          ) {
            list.push({ ...o, id: docSnap.id || o.id });
          }
        });
        list.sort((a, b) => new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime());
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to cloud orders:", err);
    return () => {};
  }
}

/**
 * Save / update a Post in Firestore
 */
export async function savePostToCloud(post: Post): Promise<void> {
  const path = `${POSTS_COLLECTION}/${post.id}`;
  try {
    await setDoc(doc(db, POSTS_COLLECTION, post.id), post, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Post from Firestore
 */
export async function deletePostFromCloud(postId: string): Promise<void> {
  const path = `${POSTS_COLLECTION}/${postId}`;
  try {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save / update a Product in Firestore
 */
export async function saveProductToCloud(product: Product): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${product.id}`;
  try {
    await setDoc(doc(db, PRODUCTS_COLLECTION, product.id), product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Product from Firestore
 */
export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `${PRODUCTS_COLLECTION}/${productId}`;
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save / update a Conversation in Firestore
 */
export async function saveConversationToCloud(conversation: Conversation): Promise<void> {
  const path = `${CONVERSATIONS_COLLECTION}/${conversation.id}`;
  try {
    await setDoc(doc(db, CONVERSATIONS_COLLECTION, conversation.id), conversation, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a Conversation from Firestore
 */
export async function deleteConversationFromCloud(convId: string): Promise<void> {
  const path = `${CONVERSATIONS_COLLECTION}/${convId}`;
  try {
    await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, convId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save / update an Order in Firestore
 */
export async function saveOrderToCloud(order: Order): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${order.id}`;
  try {
    await setDoc(doc(db, ORDERS_COLLECTION, order.id), order, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save / update a User Profile in Firestore
 */
export async function saveUserToCloud(user: User): Promise<void> {
  if (!user || !user.id || user.id === "guest") return;
  const path = `${USERS_COLLECTION}/${user.id}`;
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Look up a user in Firestore by UID, username, or email
 */
export async function findUserInCloud(identifier: string): Promise<User | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();

  try {
    // 1. Direct doc lookup by UID
    const directDoc = await getDoc(doc(db, USERS_COLLECTION, identifier));
    if (directDoc.exists()) {
      return directDoc.data() as User;
    }

    // 2. Query by username or email
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    let matched: User | null = null;

    snap.forEach((d) => {
      const u = d.data() as User;
      if (
        u.id === identifier ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
      ) {
        matched = u;
      }
    });

    return matched;
  } catch (err) {
    console.warn("Could not find user in cloud:", err);
    return null;
  }
}

/**
 * Check if username or email is already taken in the cloud
 */
export async function checkCloudUnique(
  username: string,
  email: string
): Promise<{ usernameTaken: boolean; emailTaken: boolean }> {
  const cleanU = username.trim().toLowerCase().replace(/\s+/g, "");
  const cleanE = email.trim().toLowerCase();

  let usernameTaken = false;
  let emailTaken = false;

  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    snap.forEach((d) => {
      const u = d.data() as User;
      if (u.username && u.username.toLowerCase().replace(/\s+/g, "") === cleanU) {
        usernameTaken = true;
      }
      if (u.email && u.email.toLowerCase() === cleanE) {
        emailTaken = true;
      }
    });
  } catch (err) {
    console.warn("Uniqueness check warning:", err);
  }

  return { usernameTaken, emailTaken };
}
