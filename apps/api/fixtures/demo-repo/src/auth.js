import { redactToken } from "./utils.js";

/**
 * Minimal bearer-token check. In a real app this would verify a signed JWT and
 * look the subject up in a database; here it just checks a shared secret.
 */
export function createAuth({ secret = "dev-secret" } = {}) {
  function authenticate(request) {
    const header = request.headers?.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token || token !== secret) {
      return { ok: false, status: 401, body: { error: "Unauthorized" } };
    }
    return { ok: true, subject: redactToken(token) };
  }

  function requireAuth(handler) {
    return (request) => {
      const result = authenticate(request);
      if (!result.ok) return { status: result.status, body: result.body };
      return handler(request, result.subject);
    };
  }

  return { authenticate, requireAuth };
}
