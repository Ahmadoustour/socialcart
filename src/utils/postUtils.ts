import { Post, User } from '../types';
import { isPostLikedByUser } from './likeUtils';

export const FAKE_USERNAMES = new Set([
  'sarah_art',
  'ahmed_tech',
  'usr_sarah_art',
  'usr_ahmed_tech',
  'ahmed_dev',
  'usr_me',
  'demo_seller',
  'seller',
  'member',
  'sara_dev',
  'faisal_designer',
  'nour_crypto',
  'layla_ui',
  'dev_omar',
  'fake_user',
  'test_user',
  'demo_user'
]);

export function isFakePost(p: any): boolean {
  if (!p || !p.id) return true;
  const idStr = String(p.id).toLowerCase();
  if (idStr.startsWith('demo_') || idStr.startsWith('sample_') || idStr.startsWith('test_')) return true;
  if (['demo_post_1', 'demo_post_2', 'demo_post_3', 'post_init_1', 'post_init_2'].includes(idStr)) return true;
  
  const authorUser = (p.author?.username || p.username || '').toLowerCase().trim();
  if (FAKE_USERNAMES.has(authorUser)) return true;

  const authorId = (p.author?.id || p.userId || '').toLowerCase().trim();
  if (FAKE_USERNAMES.has(authorId)) return true;

  return false;
}

export function isFakeComment(c: any): boolean {
  if (!c || !c.id) return true;
  const idStr = String(c.id).toLowerCase();
  if (idStr.startsWith('c_demo_') || idStr.startsWith('demo_') || idStr.startsWith('test_')) return true;
  
  const username = (c.username || '').toLowerCase().trim();
  if (FAKE_USERNAMES.has(username)) return true;

  const userId = (c.userId || '').toLowerCase().trim();
  if (FAKE_USERNAMES.has(userId)) return true;

  return false;
}

/**
 * Intelligently merges existing posts in state with incoming remote posts.
 * - Filters out any fake or dummy posts and comments.
 * - Prevents losing newly added comments or likes during background sync.
 * - Ensures deterministic, stable ordering by createdAt descending so posts never jump or disappear.
 */
export function mergePostLists(currentPosts: Post[], incomingPosts: Post[], activeUser: User): Post[] {
  const postMap = new Map<string, Post>();

  // 1. First index existing posts (strictly filtering out any fake posts or comments)
  currentPosts.forEach(p => {
    if (p && p.id && !isFakePost(p)) {
      const cleanComments = (Array.isArray(p.comments) ? p.comments : []).filter(c => !isFakeComment(c));
      postMap.set(p.id, {
        ...p,
        comments: cleanComments
      });
    }
  });

  // 2. Merge incoming posts (strictly excluding any fake posts)
  incomingPosts.forEach(incoming => {
    if (!incoming || !incoming.id || isFakePost(incoming)) return;
    const existing = postMap.get(incoming.id);

    if (!existing) {
      // New post from remote
      const cleanComments = (Array.isArray(incoming.comments) ? incoming.comments : []).filter(c => !isFakeComment(c));
      postMap.set(incoming.id, {
        ...incoming,
        comments: cleanComments,
        likedByMe: isPostLikedByUser(incoming, activeUser)
      });
    } else {
      // Merge comments: combine unique comment IDs, filtering out any fake comments
      const existingComments = (Array.isArray(existing.comments) ? existing.comments : []).filter(c => !isFakeComment(c));
      const incomingComments = (Array.isArray(incoming.comments) ? incoming.comments : []).filter(c => !isFakeComment(c));
      const commentMap = new Map<string, any>();
      
      incomingComments.forEach(c => { if (c && c.id && !isFakeComment(c)) commentMap.set(c.id, c); });
      existingComments.forEach(c => { if (c && c.id && !isFakeComment(c)) commentMap.set(c.id, c); });
      
      const mergedComments = Array.from(commentMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      // Merge likes: combine likedUserIds safely
      const existingLikes = Array.isArray(existing.likedUserIds) ? existing.likedUserIds : [];
      const incomingLikes = Array.isArray(incoming.likedUserIds) ? incoming.likedUserIds : [];
      const mergedLikes = Array.from(new Set([...existingLikes, ...incomingLikes]));

      const isLiked = isPostLikedByUser({
        ...incoming,
        likedUserIds: mergedLikes,
        likedByMe: existing.likedByMe
      }, activeUser);

      postMap.set(incoming.id, {
        ...existing,
        ...incoming,
        title: incoming.title || existing.title,
        description: incoming.description !== undefined ? incoming.description : existing.description,
        media: (Array.isArray(incoming.media) && incoming.media.length > 0) ? incoming.media : (existing.media || []),
        tags: (Array.isArray(incoming.tags) && incoming.tags.length > 0) ? incoming.tags : (existing.tags || []),
        comments: mergedComments,
        likedUserIds: mergedLikes,
        likesCount: Math.max(mergedLikes.length, incoming.likesCount || 0, existing.likesCount || 0),
        likedByMe: isLiked,
        createdAt: incoming.createdAt || existing.createdAt || new Date().toISOString()
      });
    }
  });

  // 3. ALWAYS sort deterministically by createdAt descending so posts never jump around or flicker
  const result = Array.from(postMap.values());
  result.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return result;
}
