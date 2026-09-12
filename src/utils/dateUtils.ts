/**
 * Utility functions for human-readable Arabic date and time formatting
 */

/**
 * Resolves a date input (ISO string, timestamp number, Date, or legacy ID containing timestamp)
 * into a valid Date object. If input was 'الآن', returns null or undefined.
 */
function parseDateInput(dateInput?: string | number | Date | null, fallbackId?: string): Date | null {
  if (!dateInput && !fallbackId) return null;

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If it's already an ISO string or parseable date
    if (trimmed && trimmed !== 'الآن' && trimmed !== 'اليوم' && trimmed !== 'أمس') {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Fallback: extract timestamp from ID like "post_1712345678901", "c_1712345678901", "notif_1712345678901"
  const candidateId = fallbackId || (typeof dateInput === 'string' ? dateInput : '');
  if (candidateId) {
    const match = candidateId.match(/(\d{10,13})/);
    if (match) {
      const ts = parseInt(match[1], 10);
      // Valid millisecond timestamp range (between year 2020 and 2035)
      const validTs = ts < 10000000000 ? ts * 1000 : ts;
      if (validTs > 1577836800000 && validTs < 2051222400000) {
        const d = new Date(validTs);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

/**
 * Formats a post, comment, notification, or product timestamp into natural Arabic relative time:
 * - < 1 min: "الآن"
 * - < 60 min: "منذ دقيقة", "منذ دقيقتين", "منذ 5 دقائق", "منذ 15 دقيقة"
 * - < 24 hours: "منذ ساعة", "منذ ساعتين", "منذ 6 ساعات", "منذ 20 ساعة"
 * - < 7 days: "منذ يوم", "منذ يومين", "منذ 3 أيام"
 * - Same year: "12 سبتمبر"
 * - Older: "12 سبتمبر 2025"
 */
export function formatRelativeTime(dateInput?: string | number | Date | null, fallbackId?: string): string {
  const date = parseDateInput(dateInput, fallbackId);
  if (!date) {
    // If it was already a custom string like 'منذ ساعتين' or cannot be parsed, return it or 'الآن'
    if (typeof dateInput === 'string' && dateInput.trim() && dateInput !== 'الآن') {
      return dateInput;
    }
    return 'الآن';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If in future by more than 10 seconds, return 'الآن'
  if (diffMs < 0) {
    return 'الآن';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  // Less than 1 minute
  if (diffSec < 60) {
    return 'الآن';
  }

  // Minutes (up to 59 minutes)
  if (diffMin < 60) {
    if (diffMin === 1) return 'منذ دقيقة';
    if (diffMin === 2) return 'منذ دقيقتين';
    if (diffMin >= 3 && diffMin <= 10) return `منذ ${diffMin} دقائق`;
    return `منذ ${diffMin} دقيقة`;
  }

  // Hours (up to 23 hours) - Fixes user's 6 hours bug!
  if (diffHour < 24) {
    if (diffHour === 1) return 'منذ ساعة';
    if (diffHour === 2) return 'منذ ساعتين';
    if (diffHour >= 3 && diffHour <= 10) return `منذ ${diffHour} ساعات`;
    return `منذ ${diffHour} ساعة`;
  }

  // Days (up to 6 days)
  if (diffDays < 7) {
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays >= 3 && diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوم`;
  }

  // Same year
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long'
    });
  }

  // Older years
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formats a message timestamp into accurate Arabic relative or clock time.
 * - < 1 min: "الآن"
 * - < 60 min: "منذ X دقيقة"
 * - Today: "03:45 م"
 * - Yesterday: "أمس 03:45 م"
 * - This year: "12 سبتمبر • 03:45 م"
 * - Older: "12 سبتمبر 2025 • 03:45 م"
 */
export function formatMessageTime(dateInput?: string | number | Date | null, fallbackId?: string): string {
  const date = parseDateInput(dateInput, fallbackId);
  if (!date) {
    if (typeof dateInput === 'string' && dateInput.trim()) {
      return dateInput;
    }
    return 'الآن';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);

  // Clock time formatted with Arabic 12-hour AM/PM
  const timeStr = date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Very recent (< 60 seconds)
  if (diffSec < 60) {
    return 'الآن';
  }

  // Under 60 minutes
  if (diffMin < 60) {
    if (diffMin === 1) return 'منذ دقيقة';
    if (diffMin === 2) return 'منذ دقيقتين';
    if (diffMin >= 3 && diffMin <= 10) return `منذ ${diffMin} دقائق`;
    return `منذ ${diffMin} دقيقة`;
  }

  // Same day
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return timeStr;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();
  if (isYesterday) {
    return `أمس ${timeStr}`;
  }

  // Current year
  if (now.getFullYear() === date.getFullYear()) {
    const dayMonth = date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long'
    });
    return `${dayMonth} • ${timeStr}`;
  }

  // Older years
  const fullDate = date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return `${fullDate} • ${timeStr}`;
}

/**
 * Short formatting for conversation list previews
 */
export function formatConversationTime(dateInput?: string | number | Date | null, fallbackId?: string): string {
  const date = parseDateInput(dateInput, fallbackId);
  if (!date) {
    if (typeof dateInput === 'string' && dateInput.trim()) {
      return dateInput;
    }
    return 'الآن';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) {
    return 'الآن';
  }

  if (diffMin < 60) {
    return `${diffMin} د`;
  }

  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return 'أمس';
  }

  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short'
  });
}

