/**
 * Market Platform - Cloudflare Worker Entry Point
 * Phase 1 Foundation
 */

export interface Env {
  DB: D1Database;
  // Secrets (set via wrangler secret)
  // SMS_API_KEY?: string;
  // PAYMENT_MERCHANT_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === "/" || path === "/health") {
      return Response.json({
        status: "ok",
        service: "market-platform",
        version: "0.1.0",
        timestamp: new Date().toISOString()
      });
    }

    // API routes will be added here step by step
    if (path.startsWith("/api/")) {
      return Response.json(
        { error: "API routes are under construction", path },
        { status: 501 }
      );
    }

    return Response.json({ error: "Not Found" }, { status: 404 });
  }
};
