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
  '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.msi', '.pif', '.hta', '.reg',
  '.ps1', '.sh', '.bin', '.com', '.cpl', '.gadget', '.inf', '.ins', '.inx', '.isu', '.job'
];

const SUSPICIOUS_DOMAINS = [
  'free-crypto', 'claim-gift', 'free-download-now', 'hack-', 'phish', 'login-verify-account',
  'account-security-update', 'paypal-secure-login', 'apple-id-verify'
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
      threats.push(`تم اكتشاف امتداد ملف تنفيذي خطر (${ext}) قد يحوي برمجيات خبيثة أو برامج فدية`);
      break;
    }
  }

  // Check suspicious phishing patterns
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) {
      threats.push(`تم حظر النطاق لأنه مسجل في قوائم التصيد الاحتيالي (${domain})`);
      break;
    }
  }

  // Check direct IP addresses in URLs (common in malicious servers)
  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lower)) {
    threats.push('الرابط يشير مباشرة إلى عنوان IP غير موثوق بدلاً من اسم نطاق رسمي معتمد');
  }

  const isSafe = threats.length === 0;
  const score = isSafe ? 100 : Math.max(10, 100 - threats.length * 40);

  return { isSafe, score, threats, protocol };
}

/**
 * Live URL scanning using server-side VirusTotal API
 */
export async function scanUrlLive(url: string): Promise<SecurityScanResult & { scannedBy?: string }> {
  const localResult = scanUrlOrFile(url);
  if (!localResult.isSafe) {
    return { ...localResult, scannedBy: 'Local Security Heuristics' };
  }

  try {
    const res = await fetch('/api/security/scan-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        isSafe: data.isSafe ?? true,
        score: data.isSafe ? 100 : 20,
        threats: data.threats || [],
        protocol: url.startsWith('https://') ? 'https' : 'http',
        scannedBy: data.scannedBy || 'VirusTotal Cloud Antivirus'
      };
    }
  } catch (e) {
    console.warn('Live URL scan query error:', e);
  }

  return { ...localResult, scannedBy: 'Local Security Heuristics' };
}

/**
 * File Integrity and Antivirus Scanner Hook
 * Scans uploaded files for double extensions (e.g. photo.png.exe) and MIME anomalies.
 * Ready for VirusTotal API or ClamAV daemon.
 */
export async function scanFileForMalware(file: File): Promise<SecurityScanResult> {
  const fileName = file.name.toLowerCase();
  const threats: string[] = [];

  // Check double extensions (e.g. document.pdf.exe)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    const lastExt = `.${parts[parts.length - 1]}`;
    if (DANGEROUS_EXTENSIONS.includes(lastExt)) {
      threats.push(`تم كشف محاولة تمويه خبيثة (Double Extension Spoofing): ${fileName}`);
    }
  }

  // Check size limit (max 50MB for digital assets)
  if (file.size > 50 * 1024 * 1024) {
    threats.push('حجم الملف يتجاوز الحد المسموح به (50 ميغابايت)');
  }

  // Check executable extensions
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      threats.push(`الملفات التنفيذية من نوع (${ext}) محظورة تماماً لمنع البرمجيات الخبيثة.`);
      break;
    }
  }

  const isSafe = threats.length === 0;
  const score = isSafe ? 100 : 20;

  return { isSafe, score, threats, protocol: 'blob' };
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
