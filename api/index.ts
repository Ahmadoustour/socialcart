import type { IncomingMessage, ServerResponse } from "http";
import app from "../server";

export default function handler(
  req: IncomingMessage & { url?: string; query?: Record<string, any> },
  res: ServerResponse
) {
  // Handle Vercel rewrite parameter or forwarded path
  const query = (req as any).query;
  if (query && query.path) {
    const subpath = Array.isArray(query.path) ? query.path.join("/") : String(query.path);
    req.url = `/api/${subpath.replace(/^\/+/, "")}`;
  } else if (req.headers["x-forwarded-url"]) {
    const forwarded = req.headers["x-forwarded-url"] as string;
    if (forwarded.startsWith("/api")) {
      req.url = forwarded;
    }
  } else if (req.headers["x-matched-path"] && (req.headers["x-matched-path"] as string).startsWith("/api")) {
    req.url = req.headers["x-matched-path"] as string;
  }

  return (app as any)(req, res);
}
