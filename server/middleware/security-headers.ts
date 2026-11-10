/**
 * Baseline security headers for every page response (the request guard
 * sets stricter ones on the public API).
 * CSP is intentionally practical for wallet connect / RPC / fonts.
 */

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

interface SecurityEvent {
  req: { method: string };
}

export default async function securityHeadersMiddleware(
  _event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;

  const headers = new Headers(result.headers);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", CSP);
  // HTTPS only for two years, so a hostile network cannot downgrade a visit.
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  // Pages opened from Pyre cannot reach back into this tab. "allow-popups"
  // keeps wallet-connect and sign-in popups working.
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
