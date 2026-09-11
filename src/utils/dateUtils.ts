/**
 * Utility functions for human-readable Arabic date and time formatting
 */

/**
 * Formats a message timestamp into accurate Arabic relative or clock time.
 * - < 1 min: "الآن"
 * - < 60 min: "منذ X دقيقة"
 * - Today: "03:45 م"
 * - Yesterday: "أمس 03:45 م"
 * - This year: "12 سبتمبر • 03:45 م"
 * - Older: "12 سبتمبر 2025 • 03:45 م"
 */
export function formatMessageTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'الآن';

  // Handle existing legacy Arabic strings
  if (typeof dateInput === 'string') {
    if (dateInput === 'الآن' || dateInput === 'اليوم' || dateInput === 'أمس') {
      return dateInput;
    }
    if (dateInput.startsWith('منذ')) {
      return dateInput;
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : 'الآن';
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
export function formatConversationTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'الآن';

  if (typeof dateInput === 'string') {
    if (dateInput === 'الآن' || dateInput === 'اليوم' || dateInput === 'أمس') {
      return dateInput;
    }
    if (dateInput.startsWith('منذ')) {
      return dateInput;
    }
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : 'الآن';
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
