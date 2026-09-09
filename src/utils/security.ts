/**
 * SocialCart Security & Anti-Fraud Suite
 * Handles Credit Card Luhn verification, URL/Media malicious link scanning,
 * Escrow guarantee calculation, and Cloudflare status.
 */

// 1. Credit Card Luhn Algorithm Validator
export function validateCreditCardNumber(cardNumber: string): { isValid: boolean; cardType: 'visa' | 'mastercard' | 'unknown'; formatted: string } {
  const sanitized = cardNumber.replace(/\D/g, '');
  
  let cardType: 'visa' | 'mastercard' | 'unknown' = 'unknown';
  if (/^4/.test(sanitized)) {
    cardType = 'visa';
  } else if (/^(5[1-5]|2[2-7])/.test(sanitized)) {
    cardType = 'mastercard';
  }

  if (sanitized.length < 13 || sanitized.length > 19) {
    return { isValid: false, cardType, formatted: formatCardNumber(sanitized) };
  }

  // Luhn check
  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const isValid = (sum % 10 === 0) && (cardType !== 'unknown');
  return { isValid, cardType, formatted: formatCardNumber(sanitized) };
}

export function formatCardNumber(sanitized: string): string {
  return sanitized.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function validateCardExpiry(expiry: string): boolean {
  if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiry)) {
    return false;
  }
  const parts = expiry.split('/');
  const month = parseInt(parts[0], 10);
  const year = 2000 + parseInt(parts[1], 10);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export function validateCardCVV(cvv: string): boolean {
  return /^[0-9]{3,4}$/.test(cvv.trim());
}

// 2. Security scanner for media, links, and downloads
export interface SecurityScanResult {
  isSafe: boolean;
  score: number; // 0 to 100
  threats: string[];
  protocol: 'https' | 'http' | 'blob' | 'unknown';
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.msi', '.pif', '.hta', '.reg'
];

const SUSPICIOUS_DOMAINS = [
  'free-crypto', 'claim-gift', 'free-download-now', 'hack-', 'phish', 'login-verify-account'
];

export function scanUrlOrFile(url: string): SecurityScanResult {
  const threats: string[] = [];
  const lower = url.toLowerCase().trim();

  // Check protocol
  let protocol: 'https' | 'http' | 'blob' | 'unknown' = 'unknown';
  if (lower.startsWith('https://')) protocol = 'https';
  else if (lower.startsWith('http://')) protocol = 'http';
  else if (lower.startsWith('data:') || lower.startsWith('blob:')) protocol = 'blob';

  if (protocol === 'http') {
    threats.push('الرابط يستخدم بروتوكول HTTP غير المشفر وغير الآمن');
  }

  // Check dangerous executable extensions
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lower.includes(ext)) {
      threats.push(`تم اكتشاف امتداد ملف تنفيذي خطر (${ext}) قد يحوي برمجيات خبيثة`);
      break;
    }
  }

  // Check suspicious phishing patterns
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) {
      threats.push(`تم حظر النطاق لأنه مرتبط بأنشطة تصيد احتيالي (${domain})`);
      break;
    }
  }

  const isSafe = threats.length === 0;
  const score = isSafe ? 100 : Math.max(20, 100 - threats.length * 40);

  return { isSafe, score, threats, protocol };
}

// 3. Cloudflare Shield simulation data
export const CLOUDFLARE_SECURITY_METRICS = {
  status: 'نشط ومحمي 100%',
  wafStatus: 'قواعد جدار الحماية WAF مشغلة',
  ddosMitigation: 'حماية متقدمة ضد هجمات حجب الخدمة DDoS مسلحة',
  sslEncryption: 'تشفير كامل TLS 1.3 / SSL 256-Bit',
  edgeServerLocation: 'Edge Node - Riyadh & Frankfurt',
  blockedAttacksToday: 412,
  rateLimiting: 'مفعل (120 طلب / دقيقة لكل مستخدم)',
};
