import { Post, User } from '../types';

/**
 * Normalizes username or user identifier by trimming and stripping leading @.
 */
export function normalizeLikeId(val?: string | null): string {
  if (!val) return '';
  return String(val).trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Accurately determines if a post or entity is liked by the current user.
 * Supports:
 * 1. Matching exact userId (preserving case, e.g. Firebase UIDs)
 * 2. Matching lowercased userId
 * 3. Matching username (with or without leading @, case-insensitive)
 * 4. Fallback to likedByMe boolean if guest or before remote sync
 */
export function isPostLikedByUser(
  entity?: { likedByMe?: boolean; likedUserIds?: string[] } | null,
  user?: User | null
): boolean {
  if (!entity) return false;

  const userIds = Array.isArray(entity.likedUserIds) ? entity.likedUserIds : [];
  const rawUserId = user?.id ? String(user.id).trim() : '';
  const lowerUserId = rawUserId.toLowerCase();
  const cleanUsername = normalizeLikeId(user?.username);

  // If we have a logged-in or identified user and a list of liked user IDs
  if (userIds.length > 0 && (rawUserId || cleanUsername)) {
    const hasMatch = userIds.some(uid => {
      if (!uid) return false;
      const rawUid = String(uid).trim();
      const lowerUid = rawUid.toLowerCase();
      const normUid = normalizeLikeId(rawUid);

      // Match raw user ID (case-sensitive or case-insensitive)
      if (rawUserId && (rawUid === rawUserId || lowerUid === lowerUserId)) {
        return true;
      }
      // Match clean username
      if (cleanUsername && (normUid === cleanUsername || lowerUid === cleanUsername)) {
        return true;
      }
      return false;
    });

    if (hasMatch) return true;

    // If userIds list is populated and user is authenticated (not guest),
    // and neither ID nor username is in the list, then it is NOT liked by this user
    if (rawUserId && rawUserId !== 'guest') {
      return false;
    }
  }

  // Fallback to likedByMe flag for guest mode, initial state, or unpopulated lists
  return Boolean(entity.likedByMe);
}
