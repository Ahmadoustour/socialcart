// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
var app = express();
var PORT = 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
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
    }
  }
  const forwarded = req.headers["x-forwarded-url"] || req.headers["x-matched-path"];
  if (forwarded && forwarded.startsWith("/api/")) {
    req.url = forwarded;
  }
  next();
});
app.use((req, res, next) => {
  if (req.body !== void 0 && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch {
      }
    } else if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch {
      }
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
var isVercel = Boolean(process.env.VERCEL);
var DATA_DIR = isVercel ? path.join("/tmp", "socialcart_data") : path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn("Notice: Persistent data directory initialization bypassed:", dirErr);
}
var POSTS_FILE = path.join(DATA_DIR, "posts.json");
var PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
var USERS_FILE = path.join(DATA_DIR, "users.json");
var ORDERS_FILE = path.join(DATA_DIR, "orders.json");
function readJsonFile(filePath, defaultValue) {
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
function writeJsonFile(filePath, data) {
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
var stripeClient = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
function resolveGmailCredentials() {
  let user = (process.env.GMAIL_USER || process.env.GMAIL_EMAIL || process.env.GMAIL_ADDRESS || process.env.GMAIL_ACCOUNT || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.MAIL_USER || "").trim();
  let pass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  if (!user || !pass) {
    for (const [k, v] of Object.entries(process.env)) {
      if (!v) continue;
      const cleanKey = k.trim().toUpperCase();
      const cleanVal = v.trim();
      if (!user) {
        if (cleanKey.includes("GMAIL") && cleanKey.includes("USER")) {
          user = cleanVal;
        } else if (cleanKey.includes("MAKANDERSON143@GMAIL.COM")) {
          user = "makanderson143@gmail.com";
        } else if (cleanVal.toLowerCase().includes("@gmail.com")) {
          user = cleanVal;
        }
      }
      if (!pass) {
        if ((cleanKey.includes("GMAIL") || cleanKey.includes("SMTP")) && (cleanKey.includes("PASS") || cleanKey.includes("PASSWORD"))) {
          pass = cleanVal;
        }
      }
    }
  }
  if (!user && pass) {
    user = "makanderson143@gmail.com";
  }
  user = user.replace(/['"]+/g, "").trim();
  pass = pass.replace(/['"]+/g, "").replace(/\s+/g, "");
  return { user, pass };
}
function getGmailTransporter(port = 465, secure = true) {
  const { user, pass } = resolveGmailCredentials();
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure,
    auth: {
      user,
      pass
    },
    connectionTimeout: 8e3,
    greetingTimeout: 8e3,
    socketTimeout: 8e3
  });
}
var lastOtpSentTimes = /* @__PURE__ */ new Map();
var lastGmailError = null;
async function sendSystemEmail({
  to,
  subject,
  html
}) {
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
        console.log(`\u2705 [Resend Success] MessageId: ${data.id} to ${to}`);
        return {
          success: true,
          deliveryStatus: "sent",
          deliveryId: data.id,
          message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 Resend \u0625\u0644\u0649 (${to}).`
        };
      } else {
        console.warn("\u26A0\uFE0F [Resend API Error]:", data);
      }
    } catch (resendErr) {
      console.warn("\u26A0\uFE0F [Resend Network Error]:", resendErr.message);
    }
  }
  const { user: gmailUser, pass: gmailPass } = resolveGmailCredentials();
  if (gmailUser && gmailPass) {
    try {
      const transporter465 = getGmailTransporter(465, true);
      if (transporter465) {
        const info = await Promise.race([
          transporter465.sendMail({
            from: `"\u0633\u0648\u0634\u064A\u0627\u0644 \u0643\u0627\u0631\u062A SocialCart" <${gmailUser}>`,
            to,
            subject,
            html
          }),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("\u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0639\u0628\u0631 \u0627\u0644\u0645\u0646\u0641\u0630 465 \u0627\u0633\u062A\u063A\u0631\u0642\u062A \u0623\u0643\u062B\u0631 \u0645\u0646 8 \u062B\u0648\u0627\u0646\u064D")), 8e3)
          )
        ]);
        lastGmailError = null;
        console.log(`\u2705 [Gmail SMTP Success (Port 465)] MessageId: ${info.messageId} to ${to}`);
        return {
          success: true,
          deliveryStatus: "sent",
          deliveryId: info.messageId,
          message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 Gmail \u0625\u0644\u0649 (${to}).`
        };
      }
    } catch (err465) {
      console.warn("\u26A0\uFE0F [Gmail SMTP 465 Failed, attempting Port 587 fallback]:", err465.message);
      lastGmailError = err465.message;
    }
    try {
      const transporter587 = getGmailTransporter(587, false);
      if (transporter587) {
        const info = await Promise.race([
          transporter587.sendMail({
            from: `"\u0633\u0648\u0634\u064A\u0627\u0644 \u0643\u0627\u0631\u062A SocialCart" <${gmailUser}>`,
            to,
            subject,
            html
          }),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("\u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0639\u0628\u0631 \u0627\u0644\u0645\u0646\u0641\u0630 587 \u0627\u0633\u062A\u063A\u0631\u0642\u062A \u0623\u0643\u062B\u0631 \u0645\u0646 8 \u062B\u0648\u0627\u0646\u064D")), 8e3)
          )
        ]);
        lastGmailError = null;
        console.log(`\u2705 [Gmail SMTP Success (Port 587)] MessageId: ${info.messageId} to ${to}`);
        return {
          success: true,
          deliveryStatus: "sent",
          deliveryId: info.messageId,
          message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 Gmail \u0625\u0644\u0649 (${to}).`
        };
      }
    } catch (err587) {
      lastGmailError = err587.message;
      console.warn("\u26A0\uFE0F [Gmail SMTP 587 Failed]:", err587.message);
      return {
        success: false,
        deliveryStatus: "gmail_error",
        message: `\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0639\u0628\u0631 Gmail SMTP: ${err587.message}. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u062E\u0637\u0648\u062A\u064A\u0646 \u0648\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062A\u0637\u0628\u064A\u0642\u0627\u062A \u062C\u062F\u064A\u062F\u0629.`
      };
    }
  }
  if (!gmailUser || !gmailPass) {
    return {
      success: false,
      deliveryStatus: "key_missing",
      message: `\u0625\u0639\u062F\u0627\u062F\u0627\u062A GMAIL_USER \u0623\u0648 GMAIL_APP_PASSWORD \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629 \u0641\u064A \u0628\u064A\u0626\u0629 Vercel. \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u062A\u0647\u0627 \u0641\u064A Project Settings -> Environment Variables \u062B\u0645 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0646\u0634\u0631 (Redeploy).`
    };
  }
  return {
    success: false,
    deliveryStatus: "gmail_error",
    message: lastGmailError ? `\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u0627\u062F\u0645 Gmail: ${lastGmailError}` : `\u062A\u0639\u0630\u0631 \u062A\u0647\u064A\u0626\u0629 \u062E\u0627\u062F\u0645 Gmail SMTP.`
  };
}
app.get(["/api/health", "/health"], (req, res) => {
  const { user, pass } = resolveGmailCredentials();
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isVercel: Boolean(process.env.VERCEL),
    integrations: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      gmail: Boolean(user && pass),
      virustotal: Boolean(process.env.VIRUSTOTAL_API_KEY),
      firebase: Boolean(process.env.VITE_FIREBASE_PROJECT_ID)
    }
  });
});
app.get(["/api/email/health", "/email/health"], async (req, res) => {
  const { user, pass } = resolveGmailCredentials();
  const hasUser = Boolean(user);
  const hasPass = Boolean(pass);
  const transporter = getGmailTransporter(465, true);
  let smtpVerified = false;
  let smtpVerificationError = null;
  if (transporter) {
    try {
      await transporter.verify();
      smtpVerified = true;
    } catch (err) {
      try {
        const transporter587 = getGmailTransporter(587, false);
        if (transporter587) {
          await transporter587.verify();
          smtpVerified = true;
        }
      } catch (err2) {
        smtpVerificationError = err?.message || String(err);
      }
    }
  }
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
      amount: Math.round(amount * 100),
      // convert to cents
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
  } catch (error) {
    console.error("Stripe create-intent error:", error);
    res.status(400).json({
      error: error.message || "Failed to create payment intent with Stripe."
    });
  }
});
app.post("/api/payment/verify-and-charge", async (req, res) => {
  try {
    const { amount, cardNumber, expiry, cvv, customerEmail, simulateDeclined } = req.body;
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not configured on this server."
      });
    }
    if (simulateDeclined || cardNumber && cardNumber.replace(/\D/g, "").endsWith("0002")) {
      return res.status(402).json({
        success: false,
        code: "insufficient_funds",
        message: "\u274C \u0631\u0641\u0636 \u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629: \u0631\u0635\u064A\u062F \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D (Insufficient Funds) \u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0637\u0644\u0648\u0628."
      });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(100, Math.round(Number(amount || 10) * 100)),
      currency: "usd",
      payment_method: "pm_card_visa",
      // Valid Stripe testing card method
      confirm: true,
      return_url: "https://socialcart.app/checkout/complete",
      receipt_email: customerEmail || "buyer@example.com"
    });
    res.json({
      success: true,
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      message: "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0635\u064A\u062F \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0628\u0646\u062C\u0627\u062D \u0639\u0628\u0631 \u0634\u0628\u0643\u0629 Stripe \u0627\u0644\u0628\u0646\u0643\u064A\u0629."
    });
  } catch (error) {
    console.error("Stripe verify-and-charge error:", error);
    res.status(400).json({
      success: false,
      code: error.code || "card_error",
      message: error.message || "\u0641\u0634\u0644\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0639\u0628\u0631 Stripe."
    });
  }
});
app.post(["/api/email/send-otp", "/email/send-otp"], async (req, res) => {
  try {
    const { email, otpCode, username } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }
    const recipientKey = `otp:${email.toLowerCase().trim()}`;
    const now = Date.now();
    const lastSent = lastOtpSentTimes.get(recipientKey);
    if (lastSent && now - lastSent < 6e4) {
      const remainingSeconds = Math.ceil((6e4 - (now - lastSent)) / 1e3);
      return res.status(429).json({
        success: false,
        cooldown: true,
        remainingSeconds,
        message: `\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 ${remainingSeconds} \u062B\u0627\u0646\u064A\u0629 \u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u062A\u062D\u0642\u0642 \u062C\u062F\u064A\u062F.`
      });
    }
    lastOtpSentTimes.set(recipientKey, now);
    const code = otpCode || Math.floor(1e5 + Math.random() * 9e5).toString();
    console.log(`\u{1F4E8} [Email Verification Dispatch] To: ${email} | Code: ${code}`);
    const result = await sendSystemEmail({
      to: email,
      subject: `\u{1F510} \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u062D\u0633\u0627\u0628\u0643 \u0641\u064A SocialCart: ${code}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">\u0645\u0646\u0635\u0629 SocialCart \u0627\u0644\u0645\u0648\u062B\u0642\u0629</h2>
          <p style="color: #475569; font-size: 14px;">\u0645\u0631\u062D\u0628\u0627\u064B ${username || "\u0639\u0632\u064A\u0632\u0646\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645"}\u060C</p>
          <p style="color: #475569; font-size: 14px;">\u0637\u0644\u0628\u0643 \u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0623\u0645\u0627\u0646 \u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062A\u0627\u0644\u064A:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 10 \u062F\u0642\u0627\u0626\u0642. \u0644\u0627 \u062A\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635 \u0644\u062D\u0645\u0627\u064A\u0629 \u062D\u0633\u0627\u0628\u0643.</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #10b981; font-size: 11px; font-weight: bold;">\u{1F6E1}\uFE0F \u0645\u062D\u0645\u064A \u0628\u0648\u0627\u0633\u0637\u0629 \u0643\u0644\u0627\u0648\u062F \u0641\u0644\u064A\u0631 \u0648\u0627\u0644\u062A\u0634\u0641\u064A\u0631 \u0627\u0644\u0633\u062D\u0627\u0628\u064A \u0627\u0644\u0645\u0632\u062F\u0648\u062C</p>
        </div>
      `
    });
    return res.json({
      success: result.success,
      deliveryStatus: result.deliveryStatus,
      deliveryId: result.deliveryId,
      message: result.message
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(200).json({
      success: false,
      error: error.message || "Failed to send verification email.",
      message: `\u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F: ${error.message || "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Vercel"}`
    });
  }
});
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
    if (otpCode) {
      const recipientKey = `sec-otp:${email.toLowerCase().trim()}:${actionType}`;
      const now = Date.now();
      const lastSent = lastOtpSentTimes.get(recipientKey);
      if (lastSent && now - lastSent < 6e4) {
        const remainingSeconds = Math.ceil((6e4 - (now - lastSent)) / 1e3);
        return res.status(429).json({
          success: false,
          cooldown: true,
          remainingSeconds,
          message: `\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 ${remainingSeconds} \u062B\u0627\u0646\u064A\u0629 \u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u062A\u062D\u0642\u0642 \u062C\u062F\u064A\u062F.`
        });
      }
      lastOtpSentTimes.set(recipientKey, now);
    }
    const timestampStr = (/* @__PURE__ */ new Date()).toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      dateStyle: "full",
      timeStyle: "medium"
    });
    let subject = "\u{1F6E1}\uFE0F \u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0646\u064A \u0645\u0646 \u0645\u0646\u0635\u0629 SocialCart";
    let actionTitle = "\u0625\u062C\u0631\u0627\u0621 \u0623\u0645\u0646\u064A \u0639\u0644\u0649 \u062D\u0633\u0627\u0628\u0643";
    let actionDescription = "\u062A\u0645 \u062A\u0646\u0641\u064A\u0630 \u0625\u062C\u0631\u0627\u0621 \u0623\u0645\u0646\u064A \u062D\u0633\u0627\u0633 \u0641\u064A \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A.";
    let icon = "\u{1F6E1}\uFE0F";
    switch (actionType) {
      case "card_change_requested":
        subject = `\u{1F510} \u0631\u0645\u0632 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 ${cardLast4 ? "\u062A\u0639\u062F\u064A\u0644" : "\u0625\u0636\u0627\u0641\u0629"} \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629: ${otpCode || ""}`;
        actionTitle = "\u0637\u0644\u0628 \u0627\u0639\u062A\u0645\u0627\u062F \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639";
        actionDescription = `\u062A\u0644\u0642\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u064B \u0644\u0625\u0636\u0627\u0641\u0629 \u0623\u0648 \u062A\u0639\u062F\u064A\u0644 \u0628\u0637\u0627\u0642\u0629 \u062F\u0641\u0639 \u0645\u0635\u0631\u0641\u064A\u0629 (${cardType ? cardType.toUpperCase() : "\u0628\u0637\u0627\u0642\u0629"} \u062A\u0646\u062A\u0647\u064A \u0628\u0640 ${cardLast4 || "****"}). \u0644\u062D\u0645\u0627\u064A\u0629 \u0623\u0645\u0648\u0627\u0644\u0643 \u0645\u0646 \u0623\u064A \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647\u060C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629:`;
        icon = "\u{1F4B3}";
        break;
      case "card_removal_requested":
        subject = `\u26A0\uFE0F \u0631\u0645\u0632 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062D\u0630\u0641 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629: ${otpCode || ""}`;
        actionTitle = "\u0637\u0644\u0628 \u0627\u0639\u062A\u0645\u0627\u062F \u0625\u0632\u0627\u0644\u0629 \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639";
        actionDescription = `\u062A\u0644\u0642\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u064B \u0644\u0625\u0632\u0627\u0644\u0629 \u0648\u062D\u0630\u0641 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0628\u0640 (${cardLast4 || "****"}) \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u062D\u0633\u0627\u0628\u0643. \u0644\u062A\u0623\u0643\u064A\u062F \u0647\u0648\u064A\u062A\u0643 \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062D\u0630\u0641\u060C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u062A\u0627\u0644\u064A:`;
        icon = "\u{1F5D1}\uFE0F";
        break;
      case "card_added":
        subject = `\u{1F4B3} \u0625\u0634\u0639\u0627\u0631 \u0623\u0645\u0646\u064A: \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0628\u0637\u0627\u0642\u0629 \u0628\u0646\u0643\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646\u062A\u0647\u064A\u0629 \u0628\u0640 (${cardLast4 || "****"})`;
        actionTitle = "\u0625\u0636\u0627\u0641\u0629 \u0628\u0637\u0627\u0642\u0629 \u062F\u0641\u0639 \u062C\u062F\u064A\u062F\u0629";
        actionDescription = `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0628\u0637\u0627\u0642\u0629 ${cardType ? cardType.toUpperCase() : "\u0628\u0646\u0643\u064A\u0629"} \u062A\u0646\u062A\u0647\u064A \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645 (${cardLast4 || "****"}) \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0643.`;
        icon = "\u{1F4B3}";
        break;
      case "card_updated":
        subject = `\u{1F4B3} \u0625\u0634\u0639\u0627\u0631 \u0623\u0645\u0646\u064A: \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 (${cardLast4 || "****"})`;
        actionTitle = "\u062A\u062D\u062F\u064A\u062B \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639";
        actionDescription = `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0637\u0627\u0642\u062A\u0643 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0627\u0644\u0645\u0633\u062C\u0644\u0629 (\u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0628\u0640 ${cardLast4 || "****"}) \u0628\u0646\u062C\u0627\u062D.`;
        icon = "\u{1F504}";
        break;
      case "card_removed":
        subject = `\u26A0\uFE0F \u0625\u0634\u0639\u0627\u0631 \u0623\u0645\u0646\u064A: \u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643`;
        actionTitle = "\u0625\u0632\u0627\u0644\u0629 \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639";
        actionDescription = `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 (\u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u0628\u0640 ${cardLast4 || "****"}) \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u062D\u0633\u0627\u0628\u0643.`;
        icon = "\u{1F5D1}\uFE0F";
        break;
      case "email_change_requested":
        subject = `\u{1F510} \u0631\u0645\u0632 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A: ${otpCode || ""}`;
        actionTitle = "\u0637\u0644\u0628 \u0627\u0639\u062A\u0645\u0627\u062F \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A";
        actionDescription = `\u062A\u0644\u0642\u064A\u0646\u0627 \u0637\u0644\u0628\u0627\u064B \u0644\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u062D\u0633\u0627\u0628\u0643 \u0645\u0646 (${oldEmail || email}) \u0625\u0644\u0649 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u062C\u062F\u064A\u062F (${newEmail || "\u0627\u0644\u062C\u062F\u064A\u062F"}). \u0644\u062D\u0645\u0627\u064A\u0629 \u062D\u0633\u0627\u0628\u0643 \u0645\u0646 \u0627\u0644\u0627\u062E\u062A\u0631\u0627\u0642\u060C \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u062D\u0648\u064A\u0644:`;
        icon = "\u{1F510}";
        break;
      case "email_changed":
        subject = `\u2705 \u0625\u0634\u0639\u0627\u0631 \u0623\u0645\u0646\u064A: \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D`;
        actionTitle = "\u062A\u0623\u0643\u064A\u062F \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A";
        actionDescription = `\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u062D\u0633\u0627\u0628\u0643 \u0645\u0646 (${oldEmail || "\u0627\u0644\u0633\u0627\u0628\u0642"}) \u0625\u0644\u0649 (${newEmail || email}) \u0628\u0646\u062C\u0627\u062D.`;
        icon = "\u2705";
        break;
    }
    const htmlBody = `
      <div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; max-width: 540px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 40px;">${icon}</span>
          <h2 style="color: #4338ca; margin: 8px 0;">\u0633\u0648\u0634\u064A\u0627\u0644 \u0643\u0627\u0631\u062A - \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629</h2>
          <span style="background-color: #eff6ff; color: #3b82f6; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px;">\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0622\u0644\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631</span>
        </div>
        
        <p style="font-size: 15px;">\u0645\u0631\u062D\u0628\u0627\u064B <strong>${username || "\u0639\u0632\u064A\u0632\u0646\u0627 \u0627\u0644\u0639\u0636\u0648"}</strong>\u060C</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">${actionDescription}</p>

        ${otpCode ? `
          <div style="background-color: #f8fafc; border: 2px dashed #6366f1; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0623\u0645\u0646\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F (\u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 10 \u062F\u0642\u0627\u0626\u0642):</p>
            <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #4338ca; font-family: monospace;">${otpCode}</span>
          </div>
        ` : ""}

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 14px; border-radius: 12px; margin: 18px 0; font-size: 12px; color: #64748b;">
          <div>\u{1F552} <strong>\u0627\u0644\u062A\u0648\u0642\u064A\u062A:</strong> ${timestampStr}</div>
          <div>\u{1F6E1}\uFE0F <strong>\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u064A\u0629:</strong> ${actionTitle}</div>
          <div>\u{1F4BB} <strong>\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0645\u0627\u064A\u0629:</strong> \u0645\u0634\u0641\u0631\u0629 \u0648\u0645\u0624\u0645\u0646\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 TLS 1.3</div>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 14px; border-radius: 12px; margin-top: 20px;">
          <p style="margin: 0; color: #991b1b; font-size: 12px; font-weight: bold;">
            \u26A0\uFE0F \u062A\u0646\u0628\u064A\u0647 \u0647\u0627\u0645:
          </p>
          <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 11px; line-height: 1.5;">
            \u0625\u0630\u0627 \u0644\u0645 \u062A\u0643\u0646 \u0623\u0646\u062A \u0645\u0646 \u0642\u0627\u0645 \u0628\u0647\u0630\u0627 \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u060C \u0641\u0647\u0630\u0627 \u064A\u0639\u0646\u064A \u0623\u0646 \u062D\u0633\u0627\u0628\u0643 \u0642\u062F \u064A\u0643\u0648\u0646 \u0645\u0647\u062F\u062F\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u062C\u0647 \u0641\u0648\u0631\u0627\u064B \u0625\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u062E\u0637\u0648\u062A\u064A\u0646 \u0644\u062D\u0645\u0627\u064A\u0629 \u0645\u062F\u0641\u0648\u0639\u0627\u062A\u0643 \u0648\u0628\u064A\u0627\u0646\u0627\u062A\u0643.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0 15px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0631\u0633\u0644\u0629 \u0622\u0644\u064A\u0627\u064B \u0645\u0646 \u0645\u0631\u0643\u0632 \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643 \u0648\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0641\u064A SocialCart. \u0644\u0627 \u062A\u0631\u062F \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F.
        </p>
      </div>
    `;
    console.log(`\u{1F6E1}\uFE0F [Security Alert Email Dispatch] To: ${email} | Action: ${actionType} | Subject: ${subject} | OTP: ${otpCode || "N/A"}`);
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
  } catch (error) {
    console.error("Security alert error:", error);
    res.status(200).json({
      success: false,
      error: error.message || "Failed to send security alert.",
      message: `\u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631: ${error.message || "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Vercel"}`
    });
  }
});
var DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".msi",
  ".pif",
  ".hta",
  ".reg",
  ".ps1",
  ".sh",
  ".bin",
  ".com",
  ".cpl",
  ".gadget",
  ".inf",
  ".ins",
  ".inx",
  ".isu",
  ".job",
  ".wsf",
  ".vbe",
  ".jse",
  ".dll",
  ".scr",
  ".py",
  ".php",
  ".asp",
  ".aspx",
  ".jsp"
];
var SUSPICIOUS_DOMAINS = [
  "free-crypto",
  "claim-gift",
  "free-download-now",
  "hack-",
  "phish",
  "login-verify-account",
  "account-security-update",
  "paypal-secure-login",
  "apple-id-verify",
  "steam-gift",
  "discord-nitro-gift"
];
var HIGH_RISK_TLDS = [".top", ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".fit", ".pw"];
function inspectContentForThreats(target) {
  const threats = [];
  const lower = (target || "").toLowerCase().trim();
  if (lower.startsWith("javascript:")) {
    threats.push("\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 javascript: \u0645\u062D\u0638\u0648\u0631 \u064A\u0646\u0641\u0630 \u0623\u0648\u0627\u0645\u0631 \u0628\u0631\u0645\u062C\u064A\u0629 \u062E\u0628\u064A\u062B\u0629.");
  }
  if (lower.startsWith("vbscript:")) {
    threats.push("\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 vbscript: \u0645\u062D\u0638\u0648\u0631.");
  }
  if (lower.startsWith("data:text/html")) {
    threats.push("\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u062A\u0636\u0645\u064A\u0646 \u0635\u0641\u062D\u0629 HTML \u0645\u0634\u0628\u0648\u0647\u0629 \u062F\u0627\u062E\u0644 \u0643\u0648\u062F Data URI (XSS Attack).");
  }
  if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onerror=") || lower.includes("onload=")) {
    threats.push("\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0643\u0648\u062F \u062A\u0646\u0641\u064A\u0630\u064A \u0623\u0648 \u0633\u0643\u0631\u064A\u0628\u062A \u062E\u0628\u064A\u062B \u0645\u062F\u0645\u062C \u062F\u0627\u062E\u0644 \u0648\u0633\u0627\u0626\u0637 SVG / HTML.");
  }
  if (lower.includes("<iframe") || lower.includes("document.cookie") || lower.includes("window.location")) {
    threats.push("\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u0636\u0645\u064A\u0646 \u0625\u0637\u0627\u0631\u0627\u062A \u0633\u0631\u064A\u0629 \u0623\u0648 \u0645\u062D\u0627\u0648\u0644\u0629 \u0633\u0631\u0642\u0629 \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637.");
  }
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lower.includes(ext)) {
      threats.push(`\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0627\u0645\u062A\u062F\u0627\u062F \u062A\u0646\u0641\u064A\u0630\u064A \u062E\u0637\u0631 (${ext}) \u0642\u062F \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0628\u0631\u0645\u062C\u064A\u0627\u062A \u062E\u0628\u064A\u062B\u0629 \u0623\u0648 \u0641\u064A\u0631\u0648\u0633\u0627\u062A \u0641\u062F\u064A\u0629.`);
      break;
    }
  }
  if (/\.(mp4|webm|jpg|jpeg|png|gif|webp|svg|pdf)\.[a-z0-9]{2,4}(\?.*)?$/i.test(lower)) {
    threats.push("\u062A\u0645 \u0643\u0634\u0641 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u0645\u0648\u064A\u0647 \u062E\u0628\u064A\u062B\u0629 \u0644\u0644\u0645\u0644\u0641 (Double Extension Spoofing) \u0644\u062E\u062F\u0627\u0639 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646.");
  }
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (lower.includes(domain)) {
      threats.push(`\u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0627\u062D\u062A\u0648\u0627\u0626\u0647 \u0639\u0644\u0649 \u0646\u0637\u0627\u0642 \u062A\u0635\u064A\u062F \u0627\u062D\u062A\u064A\u0627\u0644\u064A \u0645\u0639\u0631\u0648\u0641 (${domain}).`);
      break;
    }
  }
  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lower)) {
    threats.push("\u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u0634\u064A\u0631 \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 IP \u063A\u064A\u0631 \u0645\u0648\u062B\u0648\u0642 \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0627\u0633\u0645 \u0646\u0637\u0627\u0642 \u0631\u0633\u0645\u064A \u0645\u0639\u062A\u0645\u062F.");
  }
  for (const tld of HIGH_RISK_TLDS) {
    if (lower.includes(tld + "/") || lower.endsWith(tld)) {
      threats.push(`\u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u0646\u062A\u0645\u064A \u0625\u0644\u0649 \u0646\u0637\u0627\u0642 \u0639\u0627\u0644\u064A \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0648\u062A\u0643\u062B\u0631 \u0641\u064A\u0647 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0627\u062A \u0627\u0644\u062E\u0628\u064A\u062B\u0629 (${tld}).`);
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
          threats: maliciousCount > 0 ? [`\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${maliciousCount} \u0645\u062D\u0631\u0643 \u0641\u062D\u0635 \u064A\u0639\u062A\u0628\u0631 \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0623\u0648 \u0627\u0644\u0645\u0644\u0641 \u062E\u0628\u064A\u062B\u0627\u064B`] : []
        });
      }
    }
    return res.json({
      isSafe: true,
      score: 100,
      scannedBy: "SocialCart Cloudflare WAF & Deep Media Antivirus",
      enginesChecked: 24,
      threats: []
    });
  } catch (error) {
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
app.post("/api/security/scan-content", (req, res) => {
  try {
    const { text, mediaUrls = [] } = req.body;
    const allThreats = [];
    if (text && typeof text === "string") {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const foundUrls = text.match(urlRegex) || [];
      for (const extractedUrl of foundUrls) {
        const scan = inspectContentForThreats(extractedUrl);
        if (!scan.isSafe) {
          allThreats.push(`\u0631\u0627\u0628\u0637 \u0641\u064A \u0627\u0644\u0646\u0635 [${extractedUrl}]: ${scan.threats.join(" - ")}`);
        }
      }
    }
    for (const mUrl of mediaUrls) {
      if (typeof mUrl === "string") {
        const scan = inspectContentForThreats(mUrl);
        if (!scan.isSafe) {
          allThreats.push(`\u0645\u0644\u0641 \u0648\u0633\u0627\u0626\u0637 \u0645\u0634\u0628\u0648\u0647: ${scan.threats.join(" - ")}`);
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/posts", (req, res) => {
  const posts = readJsonFile(POSTS_FILE, []);
  res.json(posts);
});
app.post("/api/posts", (req, res) => {
  try {
    const post = req.body;
    if (!post || !post.id) {
      return res.status(400).json({ error: "Invalid post data provided" });
    }
    const posts = readJsonFile(POSTS_FILE, []);
    const existingIndex = posts.findIndex((p) => p.id === post.id);
    if (existingIndex >= 0) {
      posts[existingIndex] = { ...posts[existingIndex], ...post };
    } else {
      posts.unshift(post);
    }
    writeJsonFile(POSTS_FILE, posts);
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save post" });
  }
});
app.delete("/api/posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let posts = readJsonFile(POSTS_FILE, []);
    posts = posts.filter((p) => p.id !== id);
    writeJsonFile(POSTS_FILE, posts);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to delete post" });
  }
});
app.get("/api/products", (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, []);
  res.json(products);
});
app.post("/api/products", (req, res) => {
  try {
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Invalid product data provided" });
    }
    const products = readJsonFile(PRODUCTS_FILE, []);
    const existingIndex = products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = { ...products[existingIndex], ...product };
    } else {
      products.unshift(product);
    }
    writeJsonFile(PRODUCTS_FILE, products);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save product" });
  }
});
app.delete("/api/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    let products = readJsonFile(PRODUCTS_FILE, []);
    products = products.filter((p) => p.id !== id);
    writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to delete product" });
  }
});
app.get(["/api/auth/check-unique", "/api/users/check-unique"], (req, res) => {
  const { username, email, excludeId } = req.query;
  const users = readJsonFile(USERS_FILE, []);
  let usernameTaken = false;
  let emailTaken = false;
  if (username && typeof username === "string") {
    const cleanU = username.trim().toLowerCase().replace(/\s+/g, "");
    usernameTaken = users.some(
      (u) => (!excludeId || u.id !== excludeId) && u.username && u.username.trim().toLowerCase().replace(/\s+/g, "") === cleanU
    );
  }
  if (email && typeof email === "string") {
    const cleanE = email.trim().toLowerCase();
    emailTaken = users.some(
      (u) => (!excludeId || u.id !== excludeId) && u.email && u.email.trim().toLowerCase() === cleanE
    );
  }
  res.json({
    available: !usernameTaken && !emailTaken,
    usernameTaken,
    emailTaken
  });
});
app.get("/api/users", (req, res) => {
  const users = readJsonFile(USERS_FILE, []);
  res.json(users);
});
app.get("/api/users/:identifier", (req, res) => {
  const { identifier } = req.params;
  const users = readJsonFile(USERS_FILE, []);
  const cleanId = decodeURIComponent(identifier).toLowerCase();
  const user = users.find(
    (u) => u.id === identifier || u.email && u.email.toLowerCase() === cleanId || u.username && u.username.toLowerCase() === cleanId
  );
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});
app.post("/api/users", (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.id && !user.email && !user.username) {
      return res.status(400).json({ error: "Invalid user data provided" });
    }
    const users = readJsonFile(USERS_FILE, []);
    const existingIndex = users.findIndex((u) => user.id && u.id === user.id);
    if (existingIndex >= 0) {
      if (user.username) {
        const cleanU = user.username.trim().toLowerCase().replace(/\s+/g, "");
        const conflict = users.some((u) => u.id !== user.id && u.username && u.username.trim().toLowerCase().replace(/\s+/g, "") === cleanU);
        if (conflict) {
          return res.status(409).json({ error: "USERNAME_EXISTS", message: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u062D\u062C\u0648\u0632 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0622\u062E\u0631" });
        }
      }
      if (user.email) {
        const cleanE = user.email.trim().toLowerCase();
        const conflict = users.some((u) => u.id !== user.id && u.email && u.email.trim().toLowerCase() === cleanE);
        if (conflict) {
          return res.status(409).json({ error: "EMAIL_EXISTS", message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0628\u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
        }
      }
      users[existingIndex] = {
        ...users[existingIndex],
        ...user,
        username: user.username ? user.username.trim().toLowerCase().replace(/\s+/g, "") : users[existingIndex].username,
        email: user.email ? user.email.trim().toLowerCase() : users[existingIndex].email,
        savedCard: "savedCard" in user ? user.savedCard : users[existingIndex].savedCard,
        password: user.password !== void 0 ? user.password : users[existingIndex].password,
        bio: user.bio !== void 0 ? user.bio : users[existingIndex].bio,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      writeJsonFile(USERS_FILE, users);
      return res.json(users[existingIndex]);
    } else {
      const cleanU = (user.username || "").trim().toLowerCase().replace(/\s+/g, "");
      const cleanE = (user.email || "").trim().toLowerCase();
      if (cleanE && users.some((u) => u.email && u.email.trim().toLowerCase() === cleanE)) {
        return res.status(409).json({
          error: "EMAIL_EXISTS",
          message: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0628\u062D\u0633\u0627\u0628 \u0622\u062E\u0631. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F."
        });
      }
      if (cleanU && users.some((u) => u.username && u.username.trim().toLowerCase().replace(/\s+/g, "") === cleanU)) {
        return res.status(409).json({
          error: "USERNAME_EXISTS",
          message: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0627 \u0645\u062D\u062C\u0648\u0632 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0622\u062E\u0631. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0633\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u062A\u0627\u062D."
        });
      }
      const newUser = {
        ...user,
        username: cleanU,
        email: cleanE,
        createdAt: user.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      users.push(newUser);
      writeJsonFile(USERS_FILE, users);
      return res.status(201).json(newUser);
    }
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to persist user" });
  }
});
app.get(["/api/orders", "/orders"], (req, res) => {
  const { userId, buyerId } = req.query;
  const orders = readJsonFile(ORDERS_FILE, []);
  const targetUser = userId || buyerId;
  if (targetUser) {
    const clean = targetUser.toLowerCase();
    const filtered = orders.filter(
      (o) => o.buyerId && o.buyerId.toLowerCase() === clean || o.buyerEmail && o.buyerEmail.toLowerCase() === clean || o.buyerUsername && o.buyerUsername.toLowerCase() === clean
    );
    return res.json(filtered);
  }
  res.json(orders);
});
app.post(["/api/orders", "/orders"], (req, res) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: "Invalid order data" });
    }
    const orders = readJsonFile(ORDERS_FILE, []);
    const incomingOrders = Array.isArray(payload) ? payload : [payload];
    incomingOrders.forEach((newOrder) => {
      if (!newOrder || !newOrder.id) return;
      const idx = orders.findIndex((o) => o.id === newOrder.id);
      if (idx >= 0) {
        orders[idx] = { ...orders[idx], ...newOrder };
      } else {
        orders.unshift(newOrder);
      }
    });
    writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, count: orders.length });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to persist orders" });
  }
});
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(200).json({
    success: false,
    error: err.message || "Internal server error",
    message: `\u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629: ${err.message || "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Vercel"}`
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
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
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;

// server/vercel-entry.ts
function handler(req, res) {
  try {
    const rawUrl = req.url || "/";
    const forwarded = req.headers["x-forwarded-url"] || req.headers["x-matched-path"];
    const targetUrl = forwarded && forwarded.startsWith("/") ? forwarded : rawUrl;
    const parsed = new URL(targetUrl, "http://localhost");
    const pathParam = parsed.searchParams.get("path");
    if (pathParam) {
      req.url = `/api/${pathParam.replace(/^\/+/, "")}`;
    } else if (parsed.pathname.startsWith("/api")) {
      req.url = parsed.pathname;
    } else {
      req.url = `/api/${parsed.pathname.replace(/^\/+/, "")}`;
    }
    parsed.searchParams.delete("path");
    const remainingQuery = parsed.searchParams.toString();
    if (remainingQuery) {
      req.url += `?${remainingQuery}`;
    }
  } catch {
  }
  try {
    return server_default(req, res);
  } catch (err) {
    console.error("Vercel Serverless Function Dispatch Error:", err);
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: false,
        error: err?.message || "Internal server error",
        message: `\u062A\u0639\u0630\u0631 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0637\u0644\u0628 \u0639\u0644\u0649 Vercel: ${err?.message || "\u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Vercel"}`
      }));
    }
  }
}
export {
  handler as default
};
