/** Path + string helpers shared by the router and auth layer. */

export function normalisePath(input) {
  let path = String(input || "/").trim();
  if (!path.startsWith("/")) path = "/" + path;
  // Collapse duplicate slashes without touching route parameters.
  path = path.replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

/**
 * Compile a route pattern like "/users/:id" into a RegExp with named groups.
 */
export function compilePath(pattern) {
  const source = normalisePath(pattern)
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (segment.startsWith(":")) return `(?<${segment.slice(1)}>[^/]+)`;
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${source}/?$`);
}

export function redactToken(token) {
  if (!token) return "";
  const visible = token.slice(-4);
  return `***${visible}`;
}
