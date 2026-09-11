import app from "../server";
import type { IncomingMessage, ServerResponse } from "http";

export default function handler(
  req: IncomingMessage & { url?: string; query?: Record<string, any> },
  res: ServerResponse
) {
  if (req.url) {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const pathParam = parsed.searchParams.get("path");
      if (pathParam) {
        req.url = `/api/${pathParam.replace(/^\/+/, "")}`;
      }
    } catch {
      // ignore
    }
  }

  const forwarded = (req.headers["x-forwarded-url"] as string) || (req.headers["x-matched-path"] as string);
  if (forwarded && forwarded.startsWith("/api")) {
    req.url = forwarded;
  }

  return (app as any)(req, res);
}
