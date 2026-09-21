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

  // STRICT RULE: Guest or unauthenticated users CANNOT have liked posts
  // Liking is only possible after authenticating/logging in.
  const rawUserId = user?.id ? String(user.id).trim() : '';
  const isGuest = !user || !rawUserId || rawUserId === 'guest' || !user.email;
  if (isGuest) {
    return false;
  }

  const userIds = Array.isArray(entity.likedUserIds)
    ? entity.likedUserIds.filter(uid => uid && uid !== 'guest')
    : [];
  const lowerUserId = rawUserId.toLowerCase();
  const cleanUsername = normalizeLikeId(user?.username);

  // If we have a list of liked user IDs, match against current authenticated user
  if (userIds.length > 0) {
    const hasMatch = userIds.some(uid => {
      if (!uid || uid === 'guest') return false;
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

    // Authenticated user is not in the likedUserIds list
    return false;
  }

  // Fallback to likedByMe ONLY for authenticated users before remote sync finishes
  return Boolean(entity.likedByMe);
}
