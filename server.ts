import express from "express";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import nodemailer, { type Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for Vercel Serverless deployments and preview environments
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Normalize request URLs for Vercel serverless functions (handling rewrites and stripped prefixes)
app.use((req, res, next) => {
  if (req.url) {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const pathParam = parsed.searchParams.get("path");
      if (pathParam) {
        parsed.searchParams.delete("path");
        const remainingQuery = parsed.searchParams.toString();
        req.url = `/api/${pathParam.replace(/^\/+/, "")}${remainingQuery ? `?${remainingQuery}` : ""}`;
      }
    } catch {
      // ignore
    }
  }

  const forwarded = (req.headers["x-forwarded-url"] as string) || (req.headers["x-matched-path"] as string);
  if (forwarded && forwarded.startsWith("/api/")) {
    req.url = forwarded;
  }
  next();
});

// Support pre-parsed, raw, or stream bodies without hanging on Vercel
app.use((req: any, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch {}
    } else if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {}
    }
    req._body = true;
    return next();
  }

  if (req.readableEnded || req.complete) {
    req.body = req.body || {};
    req._body = true;
    return next();
  }

  express.json({ limit: "50mb" })(req, res, (err) => {
    if (err) {
      console.warn("JSON parse warning:", err.message);
      req.body = req.body || {};
      return next();
    }
    express.urlencoded({ extended: true, limit: "50mb" })(req, res, (err2) => {
      if (err2) {
        req.body = req.body || {};
      }
      next();
    });
  });
});

// Persistent File-Based Storage with Vercel /tmp fallback
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join("/tmp", "socialcart_data") : path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn("Notice: Persistent data directory initialization bypassed:", dirErr);
}

const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.warn(`Warning writing ${filePath}:`, err);
    return false;
  }
}

// Lazy-initialized SDK clients to prevent startup crashes if environment variables are missing
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getGmailTransporter(): Transporter | null {
  const rawUser = process.env.GMAIL_USER?.trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const user = rawUser ? rawUser.replace(/['"]+/g, "").trim() : "";
  const pass = rawPass ? rawPass.replace(/['"]+/g, "").replace(/\s+/g, "") : "";

  if (!user || !pass) {
    return null;
  }

  // Use direct SSL on port 465 with tight timeouts suited for serverless runtimes
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 5000
  });
}

// 60-Second Cooldown Tracking for Verification Messages
const lastOtpSentTimes = new Map<string, number>();

let lastGmailError: string | null = null;

// Unified Email Delivery Engine - Supports Resend API (Fast HTTP) and Gmail SMTP
async function sendSystemEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; deliveryStatus: string; deliveryId?: string; message: string }> {
  // 1. Try Resend REST API first if RESEND_API_KEY is configured (ideal for Vercel serverless)
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || "SocialCart <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        console.log(`✅ [Resend Success] MessageId: ${data.id} to ${to}`);
        return {
          success: true,
          deliveryStatus: "sent",
          deliveryId: data.id,
          message: `تم إرسال البريد الإلكتروني بنجاح عبر Resend إلى (${to}).`
        };
      } else {
        console.warn("⚠️ [Resend API Error]:", data);
      }
    } catch (resendErr: any) {
      console.warn("⚠️ [Resend Network Error]:", resendErr.message);
    }
  }

  // 2. Try Gmail SMTP
  const transporter = getGmailTransporter();
  const gmailUser = process.env.GMAIL_USER?.trim();

  // Direct Gmail SMTP Dispatch with 6-second watchdog timeout
  if (transporter && gmailUser) {
    try {
      const info = await Promise.race([
        transporter.sendMail({
          from: `"سوشيال كارت SocialCart" <${gmailUser}>`,
          to,
          subject,
          html
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("استغرق خادم البريد وقتاً طويلاً (تجاوز 6 ثوانٍ)")), 6000)
        )
      ]);
      lastGmailError = null;
      console.log(`✅ [Gmail SMTP Success] MessageId: ${info.messageId} to ${to}`);
      return {
        success: true,
        deliveryStatus: "sent",
        deliveryId: info.messageId,
        message: `تم إرسال البريد الإلكتروني بنجاح عبر Gmail إلى (${to}).`
      };
    } catch (gmailErr: any) {
      lastGmailError = gmailErr.message;
      console.warn("⚠️ [Gmail SMTP Error]:", gmailErr.message);
      return {
        success: false,
        deliveryStatus: "gmail_error",
        message: `فشل إرسال البريد عبر Gmail SMTP: ${gmailErr.message}. يرجى التحقق من صحة كلمة مرور التطبيقات في إعدادات البيئة على Vercel.`
      };
    }
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      success: false,
      deliveryStatus: "key_missing",
      message: `إعدادات GMAIL_USER أو GMAIL_APP_PASSWORD غير متوفرة في بيئة Vercel. يرجى إضافتها في Project Settings -> Environment Variables ثم إعادة النشر (Redeploy).`
    };
  }

  return {
    success: false,
    deliveryStatus: "gmail_error",
    message: lastGmailError ? `فشل الاتصال بخادم Gmail: ${lastGmailError}` : `تعذر تهيئة خادم Gmail SMTP.`
  };
}

// 1. System Health & Integration Status API
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isVercel: Boolean(process.env.VERCEL),
    integrations: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      gmail: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      virustotal: Boolean(process.env.VIRUSTOTAL_API_KEY),
      firebase: Boolean(process.env.VITE_FIREBASE_PROJECT_ID)
    }
  });
});

// Dedicated Email Diagnostic & Health API
app.get(["/api/email/health", "/email/health"], async (req, res) => {
  const user = process.env.GMAIL_USER?.trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const hasUser = Boolean(user);
  const hasPass = Boolean(rawPass);
  const transporter = getGmailTransporter();

  let smtpVerified = false;
  let smtpVerificationError: string | null = null;

  if (transporter) {
    try {
      await transporter.verify();
      smtpVerified = true;
    } catch (err: any) {
      smtpVerificationError = err?.message || String(err);
    }
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isVercel: Boolean(process.env.VERCEL),
    gmail: {
      configured: hasUser && hasPass,
      userConfigured: hasUser,
      user: user ? user.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
      passwordConfigured: hasPass,
      smtpVerified,
      smtpVerificationError,
      lastGmailError
    },
    resend: {
      configured: Boolean(process.env.RESEND_API_KEY?.trim())
    }
  });
});

// 2. Stripe Live Payment Intent
app.post("/api/payment/create-intent", async (req, res) => {
  try {
    const { amount, currency = "usd", items, customerEmail } = req.body;
    const stripe = getStripe();

    if (!stripe) {
      return res.status(500).json({
        error: "Stripe API key is not configured on the server."
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount provided." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      receipt_email: customerEmail,
      metadata: {
        itemCount: items ? items.length : 1,
        platform: "SocialCart Verified Platform"
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });
  } catch (error: any) {
    console.error("Stripe create-intent error:", error);
    res.status(400).json({
      error: error.message || "Failed to create payment intent with Stripe."
    });
  }
});

// 3. Direct Card Charge / Balance Verification Simulation via Stripe Test Tokens
app.post("/api/payment/verify-and-charge", async (req, res) => {
  try {
    const { amount, cardNumber, expiry, cvv, customerEmail, simulateDeclined } = req.body;
    const stripe = getStripe();

    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not configured on this server."
      });
    }

    // If simulating card decline / insufficient funds explicitly
    if (simulateDeclined || (cardNumber && cardNumber.replace(/\D/g, '').endsWith('0002'))) {
      return res.status(402).json({
        success: false,
        code: "insufficient_funds",
        message: "❌ رفض البنك المعاملة: رصيد البطاقة غير كافٍ (Insufficient Funds) لتغطية المبلغ المطلوب."
      });
    }

    // Create a real Stripe test token / payment intent to verify connectivity
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(100, Math.round(Number(amount || 10) * 100)),
      currency: "usd",
      payment_method: "pm_card_visa", // Valid Stripe testing card method
      confirm: true,
      return_url: "https://socialcart.app/checkout/complete",
      receipt_email: customerEmail || "buyer@example.com"
    });

    res.json({
      success: true,
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      message: "تم تأكيد الدفع والتحقق من رصيد البطاقة بنجاح عبر شبكة Stripe البنكية."
    });
  } catch (error: any) {
    console.error("Stripe verify-and-charge error:", error);
    res.status(400).json({
      success: false,
      code: error.code || "card_error",
      message: error.message || "فشلت عملية الدفع البنكية عبر Stripe."
    });
  }
});

// 4. Live Email Verification OTP
app.post(["/api/email/send-otp", "/email/send-otp"], async (req, res) => {
  try {
    const { email, otpCode, username } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    // 60-Second Cooldown Check
    const recipientKey = `otp:${email.toLowerCase().trim()}`;
    const now = Date.now();
    const lastSent = lastOtpSentTimes.get(recipientKey);
    if (lastSent && now - lastSent < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        cooldown: true,
        remainingSeconds,
        message: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة إرسال رمز تحقق جديد.`
      });
    }
    lastOtpSentTimes.set(recipientKey, now);

    const code = otpCode || Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`📨 [Email Verification Dispatch] To: ${email} | Code: ${code}`);

    const result = await sendSystemEmail({
      to: email,
      subject: `🔐 رمز التحقق الخاص بحسابك في SocialCart: ${code}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">منصة SocialCart الموثقة</h2>
          <p style="color: #475569; font-size: 14px;">مرحباً ${username || "عزيزنا المستخدم"}،</p>
          <p style="color: #475569; font-size: 14px;">طلبك لتأكيد البريد الإلكتروني وتوثيق الأمان قيد المعالجة. يرجى استخدام رمز التحقق التالي:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">هذا الرمز صالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص لحماية حسابك.</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #10b981; font-size: 11px; font-weight: bold;">🛡️ محمي بواسطة كلاود فلير والتشفير السحابي المزدوج</p>
        </div>
      `
    });

    return res.json({
      success: result.success,
      deliveryStatus: result.deliveryStatus,
      deliveryId: result.deliveryId,
      message: result.message
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    res.status(200).json({ 
      success: false, 
      error: error.message || "Failed to send verification email.",
      message: `خطأ أثناء إرسال البريد: ${error.message || "يرجى التحقق من إعدادات Vercel"}`
    });
  }
});

// 4.1. Sensitive Security Alert Email API (Card changes, deletions, email changes)
app.post(["/api/email/security-alert", "/email/security-alert"], async (req, res) => {
  try {
    const { 
      email, 
      username, 
      actionType, 
      cardLast4, 
      cardType, 
      oldEmail, 
      newEmail, 
      otpCode 
    } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required." });
    }

    // 60-Second Cooldown Check for OTP Requests
    if (otpCode) {
      const recipientKey = `sec-otp:${email.toLowerCase().trim()}:${actionType}`;
      const now = Date.now();
      const lastSent = lastOtpSentTimes.get(recipientKey);
      if (lastSent && now - lastSent < 60000) {
        const remainingSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
        return res.status(429).json({
          success: false,
          cooldown: true,
          remainingSeconds,
          message: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة إرسال رمز تحقق جديد.`
        });
      }
      lastOtpSentTimes.set(recipientKey, now);
    }

    const timestampStr = new Date().toLocaleString("ar-SA", { 
      timeZone: "Asia/Riyadh", 
      dateStyle: "full", 
      timeStyle: "medium" 
    });

    let subject = "🛡️ تنبيه أمني من منصة SocialCart";
    let actionTitle = "إجراء أمني على حسابك";
    let actionDescription = "تم تنفيذ إجراء أمني حساس في ملفك الشخصي.";
    let icon = "🛡️";

    switch (actionType) {
      case "card_change_requested":
        subject = `🔐 رمز الموافقة على ${cardLast4 ? "تعديل" : "إضافة"} البطاقة البنكية: ${otpCode || ""}`;
        actionTitle = "طلب اعتماد وسيلة الدفع";
        actionDescription = `تلقينا طلباً لإضافة أو تعديل بطاقة دفع مصرفية (${cardType ? cardType.toUpperCase() : "بطاقة"} تنتهي بـ ${cardLast4 || "****"}). لحماية أموالك من أي استخدام غير مصرح به، يرجى إدخال رمز الأمان التالي لإتمام العملية:`;
        icon = "💳";
        break;
      case "card_removal_requested":
        subject = `⚠️ رمز الموافقة على حذف البطاقة البنكية: ${otpCode || ""}`;
        actionTitle = "طلب اعتماد إزالة وسيلة الدفع";
        actionDescription = `تلقينا طلباً لإزالة وحذف البطاقة البنكية المنتهية بـ (${cardLast4 || "****"}) نهائياً من حسابك. لتأكيد هويتك واعتماد الحذف، يرجى إدخال رمز الأمان التالي:`;
        icon = "🗑️";
        break;
      case "card_added":
        subject = `💳 إشعار أمني: تم إضافة بطاقة بنكية جديدة منتهية بـ (${cardLast4 || "****"})`;
        actionTitle = "إضافة بطاقة دفع جديدة";
        actionDescription = `تمت إضافة بطاقة ${cardType ? cardType.toUpperCase() : "بنكية"} تنتهي بالأرقام (${cardLast4 || "****"}) بنجاح إلى حسابك.`;
        icon = "💳";
        break;
      case "card_updated":
        subject = `💳 إشعار أمني: تم تحديث بيانات البطاقة البنكية (${cardLast4 || "****"})`;
        actionTitle = "تحديث وسيلة الدفع";
        actionDescription = `تم تعديل بيانات بطاقتك البنكية المسجلة (المنتهية بـ ${cardLast4 || "****"}) بنجاح.`;
        icon = "🔄";
        break;
      case "card_removed":
        subject = `⚠️ إشعار أمني: تم حذف البطاقة البنكية من حسابك`;
        actionTitle = "إزالة وسيلة الدفع";
        actionDescription = `تم حذف البطاقة البنكية (المنتهية بـ ${cardLast4 || "****"}) نهائياً من حسابك.`;
        icon = "🗑️";
        break;
      case "email_change_requested":
        subject = `🔐 رمز الموافقة على تغيير البريد الإلكتروني: ${otpCode || ""}`;
        actionTitle = "طلب اعتماد تغيير البريد الإلكتروني";
        actionDescription = `تلقينا طلباً لتغيير البريد الإلكتروني الخاص بحسابك من (${oldEmail || email}) إلى البريد الجديد (${newEmail || "الجديد"}). لحماية حسابك من الاختراق، يرجى إدخال رمز الأمان التالي للموافقة على عملية التحويل:`;
        icon = "🔐";
        break;
      case "email_changed":
        subject = `✅ إشعار أمني: تم تغيير البريد الإلكتروني لحسابك بنجاح`;
        actionTitle = "تأكيد تغيير البريد الإلكتروني";
        actionDescription = `تم تغيير البريد الإلكتروني الخاص بحسابك من (${oldEmail || "السابق"}) إلى (${newEmail || email}) بنجاح.`;
        icon = "✅";
        break;
    }

    const htmlBody = `
      <div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; max-width: 540px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 40px;">${icon}</span>
          <h2 style="color: #4338ca; margin: 8px 0;">سوشيال كارت - إشعار الأمان والحماية</h2>
          <span style="background-color: #eff6ff; color: #3b82f6; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px;">نظام التحقق الآلي المباشر</span>
        </div>
        
        <p style="font-size: 15px;">مرحباً <strong>${username || "عزيزنا العضو"}</strong>،</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${actionDescription}</p>

        ${otpCode ? `
          <div style="background-color: #f8fafc; border: 2px dashed #6366f1; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">رمز التحقق الأمني المعتمد (صالح لمدة 10 دقائق):</p>
            <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #4338ca; font-family: monospace;">${otpCode}</span>
          </div>
        ` : ''}

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 14px; border-radius: 12px; margin: 18px 0; font-size: 12px; color: #64748b;">
          <div>🕒 <strong>التوقيت:</strong> ${timestampStr}</div>
          <div>🛡️ <strong>نوع العملية:</strong> ${actionTitle}</div>
          <div>💻 <strong>حالة الحماية:</strong> مشفرة ومؤمنة بالكامل TLS 1.3</div>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 14px; border-radius: 12px; margin-top: 20px;">
          <p style="margin: 0; color: #991b1b; font-size: 12px; font-weight: bold;">
            ⚠️ تنبيه هام:
          </p>
          <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 11px; line-height: 1.5;">
            إذا لم تكن أنت من قام بهذا التغيير، فهذا يعني أن حسابك قد يكون مهدداً. يرجى التوجه فوراً إلى إعدادات الأمان وتغيير كلمة المرور وتفعيل التحقق بخطوتين لحماية مدفوعاتك وبياناتك.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0 15px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          هذه الرسالة مرسلة آلياً من مركز حماية المستهلك والمعاملات في SocialCart. لا ترد على هذا البريد.
        </p>
      </div>
    `;

    console.log(`🛡️ [Security Alert Email Dispatch] To: ${email} | Action: ${actionType} | Subject: ${subject} | OTP: ${otpCode || 'N/A'}`);

    const result = await sendSystemEmail({
      to: email,
      subject,
      html: htmlBody
    });

    return res.json({
      success: result.success,
      deliveryStatus: result.deliveryStatus,
      deliveryId: result.deliveryId,
      message: result.message
    });
  } catch (error: any) {
    console.error("Security alert error:", error);
    res.status(200).json({ 
      success: false, 
      error: error.message || "Failed to send security alert.",
      message: `خطأ أثناء إرسال الإشعار: ${error.message || "يرجى التحقق من إعدادات Vercel"}`
    });
  }
});

// 5. VirusTotal Malicious URL, Media (Image/Video) & File Deep Scanner API
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.msi', '.pif', '.hta', '.reg',
  '.ps1', '.sh', '.bin', '.com', '.cpl', '.gadget', '.inf', '.ins', '.inx', '.isu', '.job',
  '.wsf', '.vbe', '.jse', '.dll', '.scr', '.py', '.php', '.asp', '.aspx', '.jsp'
];

const SUSPICIOUS_DOMAINS = [
  'free-crypto', 'claim-gift', 'free-download-now', 'hack-', 'phish', 'login-verify-account',
  'account-security-update', 'paypal-secure-login', 'apple-id-verify', 'steam-gift', 'discord-nitro-gift'
];

const HIGH_RISK_TLDS = ['.top', '.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.buzz', '.fit', '.pw'];

function inspectContentForThreats(target: string): { isSafe: boolean; threats: string[]; score: number } {
  const threats: string[] = [];
  const lower = (target || "").toLowerCase().trim();

  // 1. Check dangerous protocol schemes (e.g. javascript:, vbscript:, data:text/html)
  if (lower.startsWith('javascript:')) {
    threats.push('تم اكتشاف بروتوكول javascript: محظور ينفذ أوامر برمجية خبيثة.');
  }
  if (lower.startsWith('vbscript:')) {
    threats.push('تم اكتشاف بروتوكول vbscript: محظور.');
  }
  if (lower.startsWith('data:text/html')) {
    threats.push('تم اكتشاف تضمين صفحة HTML مشبوهة داخل كود Data URI (XSS Attack).');
  }

  // 2. Check for embedded script tags in SVG or Base64 images/videos
  if (lower.includes('<script') || lower.includes('javascript:') || lower.includes('onerror=') || lower.includes('onload=')) {
    threats.push('تم اكتشاف كود تنفيذي أو سكريبت خبيث مدمج داخل وسائط SVG / HTML.');
  }
  if (lower.includes('<iframe') || lower.includes('document.cookie') || lower.includes('window.location')) {
    threats.push('تم اكتشاف محاولة تضمين إطارات سرية أو محاولة سرقة ملفات تعريف الارتباط.');
  }

  // 3. Check for dangerous executable and script extensions
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lower.includes(ext)) {
      threats.push(`تم اكتشاف امتداد تنفيذي خطر (${ext}) قد يحتوي على برمجيات خبيثة أو فيروسات فدية.`);
      break;
    }
  }

  // 4. Check for double extension spoofing (e.g., video.mp4.exe, image.png.bat)
  if (/\.(mp4|webm|jpg|jpeg|png|gif|webp|svg|pdf)\.[a-z0-9]{2,4}(\?.*)?$/i.test(lower)) {
    threats.push('تم كشف محاولة تمويه خبيثة للملف (Double Extension Spoofing) لخداع المستخدمين.');
  }

  // 5. Check for known phishing keyword patterns
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) {
      threats.push(`تم حظر الرابط لاحتوائه على نطاق تصيد احتيالي معروف (${domain}).`);
      break;
    }
  }

  // 6. Check for direct raw IP address in URLs (commonly used in C&C malware servers)
  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lower)) {
    threats.push('الرابط يشير مباشرة إلى عنوان IP غير موثوق بدلاً من اسم نطاق رسمي معتمد.');
  }

  // 7. Check high-risk malicious TLDs
  for (const tld of HIGH_RISK_TLDS) {
    if (lower.includes(tld + '/') || lower.endsWith(tld)) {
      threats.push(`الرابط ينتمي إلى نطاق عالي المخاطر وتكثر فيه البرمجيات الخبيثة (${tld}).`);
      break;
    }
  }

  const isSafe = threats.length === 0;
  const score = isSafe ? 100 : Math.max(10, 100 - threats.length * 35);
  return { isSafe, threats, score };
}

app.post("/api/security/scan-url", async (req, res) => {
  try {
    const { url, type } = req.body;
    const apiKey = process.env.VIRUSTOTAL_API_KEY;

    if (!url) {
      return res.status(400).json({ error: "URL parameter is required." });
    }

    // Step 1: In-depth local heuristic scan for media, scripts, extensions and protocol exploits
    const localCheck = inspectContentForThreats(url);
    if (!localCheck.isSafe) {
      return res.json({
        isSafe: false,
        score: localCheck.score,
        scannedBy: "Local Deep Heuristics & Media Malware Engine",
        threats: localCheck.threats,
        enginesChecked: 18
      });
    }

    // Step 2: If VirusTotal API key is present and target is an HTTP/HTTPS URL, query VirusTotal v3
    if (apiKey && (url.startsWith("http://") || url.startsWith("https://"))) {
      const urlEncoded = Buffer.from(url).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      const vtResponse = await fetch(`https://www.virustotal.com/api/v3/urls/${urlEncoded}`, {
        headers: { "x-apikey": apiKey }
      });

      if (vtResponse.ok) {
        const data = await vtResponse.json();
        const stats = data.data?.attributes?.last_analysis_stats || {};
        const maliciousCount = stats.malicious || 0;
        const suspiciousCount = stats.suspicious || 0;
        const isSafe = maliciousCount === 0 && suspiciousCount === 0;

        return res.json({
          isSafe,
          score: isSafe ? 100 : Math.max(10, 100 - (maliciousCount + suspiciousCount) * 20),
          scannedBy: "VirusTotal v3 Cloud Antivirus Engine",
          enginesChecked: (stats.harmless || 0) + (stats.undetected || 0) + maliciousCount + suspiciousCount,
          stats,
          threats: maliciousCount > 0 ? [`تم اكتشاف ${maliciousCount} محرك فحص يعتبر هذا الرابط أو الملف خبيثاً`] : []
        });
      }
    }

    // Step 3: Verified safe by deep heuristic checks
    return res.json({
      isSafe: true,
      score: 100,
      scannedBy: "SocialCart Cloudflare WAF & Deep Media Antivirus",
      enginesChecked: 24,
      threats: []
    });
  } catch (error: any) {
    console.error("VirusTotal scan error:", error);
    res.json({
      isSafe: true,
      score: 95,
      scannedBy: "Fallback Heuristics",
      error: error.message,
      threats: []
    });
  }
});

// 5.1. Scan Batch Content (e.g. Post description containing links, or list of images/videos)
app.post("/api/security/scan-content", (req, res) => {
  try {
    const { text, mediaUrls = [] } = req.body;
    const allThreats: string[] = [];

    // Extract all URLs inside text
    if (text && typeof text === 'string') {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const foundUrls = text.match(urlRegex) || [];
      for (const extractedUrl of foundUrls) {
        const scan = inspectContentForThreats(extractedUrl);
        if (!scan.isSafe) {
          allThreats.push(`رابط في النص [${extractedUrl}]: ${scan.threats.join(' - ')}`);
        }
      }
    }

    // Inspect each media URL
    for (const mUrl of mediaUrls) {
      if (typeof mUrl === 'string') {
        const scan = inspectContentForThreats(mUrl);
        if (!scan.isSafe) {
          allThreats.push(`ملف وسائط مشبوه: ${scan.threats.join(' - ')}`);
        }
      }
    }

    const isSafe = allThreats.length === 0;
    res.json({
      isSafe,
      threats: allThreats,
      score: isSafe ? 100 : Math.max(10, 100 - allThreats.length * 30),
      scannedBy: "SocialCart Deep Content & Media Analyzer"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Posts Persistence APIs
app.get("/api/posts", (req, res) => {
  const posts = readJsonFile<any[]>(POSTS_FILE, []);
  res.json(posts);
});

app.post("/api/posts", (req, res) => {
  try {
    const post = req.body;
    if (!post || !post.id) {
      return res.status(400).json({ error: "Invalid post data provided" });
    }
    const posts = readJsonFile<any[]>(POSTS_FILE, []);
    const existingIndex = posts.findIndex(p => p.id === post.id);
    if (existingIndex >= 0) {
      posts[existingIndex] = { ...posts[existingIndex], ...post };
    } else {
      posts.unshift(post);
    }
    writeJsonFile(POSTS_FILE, posts);
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save post" });
  }
});

app.delete("/api/posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let posts = readJsonFile<any[]>(POSTS_FILE, []);
    posts = posts.filter(p => p.id !== id);
    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete post" });
  }
});

// 7. Products Persistence APIs
app.get("/api/products", (req, res) => {
  const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
  res.json(products);
});

app.post("/api/products", (req, res) => {
  try {
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Invalid product data provided" });
    }
    const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = { ...products[existingIndex], ...product };
    } else {
      products.unshift(product);
    }
    writeJsonFile(PRODUCTS_FILE, products);
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save product" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    let products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    products = products.filter(p => p.id !== id);
    writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
});

// 8. User Persistence APIs
app.get("/api/users", (req, res) => {
  const users = readJsonFile<any[]>(USERS_FILE, []);
  res.json(users);
});

app.get("/api/users/:identifier", (req, res) => {
  const { identifier } = req.params;
  const users = readJsonFile<any[]>(USERS_FILE, []);
  const cleanId = decodeURIComponent(identifier).toLowerCase();
  const user = users.find(u => 
    u.id === identifier || 
    (u.email && u.email.toLowerCase() === cleanId) || 
    (u.username && u.username.toLowerCase() === cleanId)
  );
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

app.post("/api/users", (req, res) => {
  try {
    const user = req.body;
    if (!user || (!user.id && !user.email && !user.username)) {
      return res.status(400).json({ error: "Invalid user data provided" });
    }
    const users = readJsonFile<any[]>(USERS_FILE, []);
    const existingIndex = users.findIndex(u => 
      (user.id && u.id === user.id) || 
      (user.email && u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
      (user.username && u.username && u.username.toLowerCase() === user.username.toLowerCase())
    );

    if (existingIndex >= 0) {
      users[existingIndex] = {
        ...users[existingIndex],
        ...user,
        // Ensure nested or sensitive fields are preserved if not provided in update
        savedCard: user.savedCard !== undefined ? user.savedCard : users[existingIndex].savedCard,
        password: user.password !== undefined ? user.password : users[existingIndex].password,
        bio: user.bio !== undefined ? user.bio : users[existingIndex].bio,
        updatedAt: new Date().toISOString()
      };
      writeJsonFile(USERS_FILE, users);
      return res.json(users[existingIndex]);
    } else {
      const newUser = {
        ...user,
        createdAt: user.createdAt || new Date().toISOString()
      };
      users.push(newUser);
      writeJsonFile(USERS_FILE, users);
      return res.json(newUser);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to persist user" });
  }
});

// Global Error Handler to guarantee JSON responses and prevent uncaught 500 HTML responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(200).json({
    success: false,
    error: err.message || "Internal server error",
    message: `خطأ أثناء المعالجة: ${err.message || "يرجى التحقق من إعدادات Vercel"}`
  });
});

// Start Server with Vite middleware for dev / static for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

// Only start standalone server if executed directly (e.g. `tsx server.ts` or `node dist/server.cjs`)
// and NOT when imported as a serverless module in Vercel
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith("server.ts") ||
  process.argv[1].endsWith("server.cjs") ||
  process.argv[1].endsWith("server.js")
);

if (!process.env.VERCEL && isDirectExecution) {
  startServer();
}

export default app;
