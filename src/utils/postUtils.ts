import { Post, User } from '../types';
import { isPostLikedByUser } from './likeUtils';

/**
 * Intelligently merges existing posts in state with incoming remote posts.
 * - Prevents losing newly added comments or likes during background sync.
 * - Ensures deterministic, stable ordering by createdAt descending so posts never jump or disappear.
 */
export function mergePostLists(currentPosts: Post[], incomingPosts: Post[], activeUser: User): Post[] {
  const postMap = new Map<string, Post>();

  // 1. First index existing posts
  currentPosts.forEach(p => {
    if (p && p.id) {
      postMap.set(p.id, p);
    }
  });

  // 2. Merge incoming posts
  incomingPosts.forEach(incoming => {
    if (!incoming || !incoming.id) return;
    const existing = postMap.get(incoming.id);

    if (!existing) {
      // New post from remote
      postMap.set(incoming.id, {
        ...incoming,
        likedByMe: isPostLikedByUser(incoming, activeUser)
      });
    } else {
      // Merge comments: combine unique comment IDs, preserving both local and remote
      const existingComments = Array.isArray(existing.comments) ? existing.comments : [];
      const incomingComments = Array.isArray(incoming.comments) ? incoming.comments : [];
      const commentMap = new Map<string, any>();
      
      // Add incoming first, then existing so newly posted local comments are never wiped out
      incomingComments.forEach(c => { if (c && c.id) commentMap.set(c.id, c); });
      existingComments.forEach(c => { if (c && c.id) commentMap.set(c.id, c); });
      
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
