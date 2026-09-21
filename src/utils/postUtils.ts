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
 * - STABILITY GUARANTEE: Existing posts retain their exact position in the feed;
 *   they will NEVER jump up or down. New posts are sorted deterministically and prepended.
 * - IMMUTABILITY: A post's createdAt timestamp is strictly preserved.
 */
export function mergePostLists(currentPosts: Post[], incomingPosts: Post[], activeUser: User): Post[] {
  const currentPostMap = new Map<string, Post>();
  currentPosts.forEach(p => {
    if (p && p.id && !isFakePost(p)) {
      currentPostMap.set(p.id, p);
    }
  });

  const incomingMap = new Map<string, Post>();
  incomingPosts.forEach(p => {
    if (p && p.id && !isFakePost(p)) {
      incomingMap.set(p.id, p);
    }
  });

  // 1. Update existing posts while strictly PRESERVING their exact position in the feed
  const updatedExistingPosts: Post[] = [];
  currentPosts.forEach(existing => {
    if (!existing || !existing.id || isFakePost(existing)) return;
    const incoming = incomingMap.get(existing.id);

    if (!incoming) {
      updatedExistingPosts.push(existing);
      return;
    }

    // Merge comments
    const existingComments = (Array.isArray(existing.comments) ? existing.comments : []).filter(c => !isFakeComment(c));
    const incomingComments = (Array.isArray(incoming.comments) ? incoming.comments : []).filter(c => !isFakeComment(c));
    const commentMap = new Map<string, any>();
    existingComments.forEach(c => { if (c && c.id && !isFakeComment(c)) commentMap.set(c.id, c); });
    incomingComments.forEach(c => { if (c && c.id && !isFakeComment(c)) commentMap.set(c.id, c); });
    const mergedComments = Array.from(commentMap.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime() || 0;
      const tB = new Date(b.createdAt || 0).getTime() || 0;
      if (tB !== tA) return tB - tA;
      return String(b.id).localeCompare(String(a.id));
    });

    // Likes sync: preserve clean list, exclude guests
    const incomingLikes = (Array.isArray(incoming.likedUserIds) ? incoming.likedUserIds : []).filter(uid => uid && uid !== 'guest');
    const existingLikes = (Array.isArray(existing.likedUserIds) ? existing.likedUserIds : []).filter(uid => uid && uid !== 'guest');
    
    // Choose latest valid like set
    const likedUserIds = incomingLikes.length > 0 ? incomingLikes : existingLikes;
    const isLiked = isPostLikedByUser({ ...incoming, likedUserIds }, activeUser);

    updatedExistingPosts.push({
      ...existing,
      ...incoming,
      id: existing.id,
      // CRITICAL: createdAt is 100% immutable! Never allow incoming to change an existing post's timestamp!
      createdAt: existing.createdAt || incoming.createdAt || new Date().toISOString(),
      title: incoming.title || existing.title,
      description: incoming.description !== undefined ? incoming.description : existing.description,
      media: (Array.isArray(incoming.media) && incoming.media.length > 0) ? incoming.media : (existing.media || []),
      tags: (Array.isArray(incoming.tags) && incoming.tags.length > 0) ? incoming.tags : (existing.tags || []),
      comments: mergedComments,
      likedUserIds,
      likesCount: typeof incoming.likesCount === 'number' ? incoming.likesCount : (likedUserIds.length || existing.likesCount || 0),
      likedByMe: isLiked
    });
  });

  // 2. Identify brand-new posts that weren't in the feed yet
  const brandNewPosts: Post[] = [];
  incomingPosts.forEach(incoming => {
    if (!incoming || !incoming.id || isFakePost(incoming)) return;
    if (!currentPostMap.has(incoming.id)) {
      const cleanComments = (Array.isArray(incoming.comments) ? incoming.comments : []).filter(c => !isFakeComment(c));
      const likedUserIds = (Array.isArray(incoming.likedUserIds) ? incoming.likedUserIds : []).filter(uid => uid && uid !== 'guest');
      const isLiked = isPostLikedByUser({ ...incoming, likedUserIds }, activeUser);
      brandNewPosts.push({
        ...incoming,
        comments: cleanComments,
        likedUserIds,
        likesCount: typeof incoming.likesCount === 'number' ? incoming.likesCount : likedUserIds.length,
        likedByMe: isLiked,
        createdAt: incoming.createdAt || new Date().toISOString()
      });
    }
  });

  // Sort brand-new posts deterministically (newest first, with secondary tie-breaker by ID)
  brandNewPosts.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime() || 0;
    const timeB = new Date(b.createdAt || 0).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id).localeCompare(String(a.id));
  });

  // Prepend genuinely new posts to the stable existing list
  return [...brandNewPosts, ...updatedExistingPosts];
}
