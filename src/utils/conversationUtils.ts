import { Conversation, User } from '../types';

/**
 * Standardize any username: removes leading @ and spaces, converts to lowercase.
 */
export function normalizeUsername(u?: string | null): string {
  if (!u) return '';
  return u.toLowerCase().trim().replace(/^@+/, '');
}

/**
 * Accurately determines the OTHER participant (partner) in a conversation relative to the active user.
 */
export function getConversationPartner(conv: Conversation, currentUser?: User) {
  const cleanCurrent = normalizeUsername(currentUser?.username);
  const cleanCurrentId = (currentUser?.id || '').trim();

  const creatorU = normalizeUsername(conv.creatorUsername);
  const participantU = normalizeUsername(conv.participantUsername);

  const isCreatorMe = Boolean(
    (cleanCurrentId && conv.creatorId && conv.creatorId === cleanCurrentId) ||
    (cleanCurrent && creatorU && creatorU === cleanCurrent)
  );

  const isParticipantMe = Boolean(
    (cleanCurrentId && conv.participantId && conv.participantId === cleanCurrentId) ||
    (cleanCurrent && participantU && participantU === cleanCurrent)
  );

  if (isCreatorMe && !isParticipantMe) {
    return {
      username: conv.participantUsername,
      displayName: conv.participantDisplayName || conv.participantUsername,
      avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      id: conv.participantId,
      isVerified: conv.isVerified
    };
  }

  if (isParticipantMe && !isCreatorMe) {
    return {
      username: conv.creatorUsername || conv.participantUsername,
      displayName: conv.creatorDisplayName || conv.participantDisplayName,
      avatar: conv.creatorAvatar || conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      id: conv.creatorId || conv.participantId,
      isVerified: conv.isVerified
    };
  }

  // Fallback if neither or both match: find the participant that is not me
  if (cleanCurrent) {
    if (creatorU && creatorU !== cleanCurrent) {
      return {
        username: conv.creatorUsername!,
        displayName: conv.creatorDisplayName || conv.creatorUsername!,
        avatar: conv.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        id: conv.creatorId,
        isVerified: conv.isVerified
      };
    }
  }

  return {
    username: conv.participantUsername,
    displayName: conv.participantDisplayName || conv.participantUsername,
    avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    id: conv.participantId,
    isVerified: conv.isVerified
  };
}

/**
 * Accurately calculate how many UNREAD messages the current user has in this conversation.
 * 
 * Rules:
 * 1. If conversation is currently active/open by the user, unread count is ALWAYS 0.
 * 2. Sent messages by the current user are NEVER unread for the current user.
 * 3. Only incoming messages from the OTHER party that have NOT been read by this user count.
 * 4. If conversation has been marked read by this user (unreadCountBy[myU] === 0), it returns 0.
 */
export function getConversationUnreadCount(
  conv: Conversation,
  currentUsername?: string | null,
  activeConversationId?: string | null
): number {
  if (!conv) return 0;
  const myU = normalizeUsername(currentUsername);
  if (!myU || myU === 'guest') return 0;

  // 1. If the conversation is currently open and active, count is instantly 0!
  if (activeConversationId && conv.id === activeConversationId) {
    return 0;
  }

  // 2. If unreadCountBy explicitly marks 0 for this user, it's read!
  if (conv.unreadCountBy && typeof conv.unreadCountBy[myU] === 'number') {
    if (conv.unreadCountBy[myU] === 0) {
      return 0;
    }
  }

  // 3. Count incoming messages sent by the other party that haven't been read by this user
  if (Array.isArray(conv.messages) && conv.messages.length > 0) {
    let unreadCount = 0;
    const lastReadIso = conv.lastReadAtBy?.[myU];
    const lastReadTime = lastReadIso ? new Date(lastReadIso).getTime() : 0;

    for (const msg of conv.messages) {
      if (!msg) continue;
      const senderU = normalizeUsername(msg.senderUsername);
      const isFromMe = (senderU && senderU === myU) || Boolean(msg.isMe && (!senderU || senderU === myU));
      
      // Messages sent by me are NEVER unread for me!
      if (isFromMe) {
        continue;
      }

      // If this message was already marked as read by this user
      if (Array.isArray(msg.readBy) && msg.readBy.map(normalizeUsername).includes(myU)) {
        continue;
      }

      // If message was sent before or at lastReadTime
      if (lastReadTime > 0 && msg.createdAt) {
        const msgTime = new Date(msg.createdAt).getTime();
        if (msgTime <= lastReadTime) {
          continue;
        }
      }

      unreadCount++;
    }

    if (conv.unreadCountBy && typeof conv.unreadCountBy[myU] === 'number') {
      return conv.unreadCountBy[myU];
    }
    return unreadCount;
  }

  // 4. If no messages array is populated, fall back to unreadCountBy[myU]
  if (conv.unreadCountBy && typeof conv.unreadCountBy[myU] === 'number') {
    return conv.unreadCountBy[myU];
  }

  return 0;
}
