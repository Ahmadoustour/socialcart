import app from "../server.ts";
import type { IncomingMessage, ServerResponse } from "http";

export default function handler(
  req: IncomingMessage & { url?: string; query?: Record<string, any> },
  res: ServerResponse
) {
  try {
    const rawUrl = req.url || "/";
    const forwarded = (req.headers["x-forwarded-url"] as string) || (req.headers["x-matched-path"] as string);
    const targetUrl = (forwarded && forwarded.startsWith("/")) ? forwarded : rawUrl;

    const parsed = new URL(targetUrl, "http://localhost");
    const pathParam = parsed.searchParams.get("path");

    if (pathParam) {
      req.url = `/api/${pathParam.replace(/^\/+/, "")}`;
    } else if (parsed.pathname.startsWith("/api")) {
      req.url = parsed.pathname;
    } else {
      req.url = `/api/${parsed.pathname.replace(/^\/+/, "")}`;
    }

    // Preserve any remaining query parameters except path
    parsed.searchParams.delete("path");
    const remainingQuery = parsed.searchParams.toString();
    if (remainingQuery) {
      req.url += `?${remainingQuery}`;
    }
  } catch {
    // Keep original req.url if URL parsing encounters issues
  }

  try {
    return (app as any)(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Dispatch Error:", err);
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: false,
        error: err?.message || "Internal server error",
        message: `تعذر معالجة الطلب على Vercel: ${err?.message || "يرجى التحقق من إعدادات Vercel"}`
      }));
    }
  }
}
