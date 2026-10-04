import { compilePath, normalisePath } from "./utils.js";

/**
 * A deliberately small router. Requests come in as { method, path } and are
 * matched against registered routes in registration order.
 */
export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({
      method: method.toUpperCase(),
      pattern,
      matcher: compilePath(pattern),
      handler,
    });
    return api;
  }

  function handle(request) {
    const path = normalisePath(request.path ?? "/");
    const method = (request.method ?? "GET").toUpperCase();

    for (const route of routes) {
      if (route.method !== method) continue;
      const match = path.match(route.matcher);
      if (!match) continue;
      return route.handler({
        ...request,
        params: match.groups ?? {},
      });
    }

    return { status: 404, body: { error: "Not found", path } };
  }

  const api = {
    get: (pattern, handler) => add("GET", pattern, handler),
    post: (pattern, handler) => add("POST", pattern, handler),
    handle,
    routes,
  };

  return api;
}
