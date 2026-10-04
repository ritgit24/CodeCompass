import { createAuth } from "./auth.js";
import { createRouter } from "./router.js";

export function createApp({ secret } = {}) {
  const router = createRouter();
  const auth = createAuth({ secret });
  const users = new Map([["1", { id: "1", name: "Ada" }]]);

  router.get("/", () => ({ status: 200, body: { service: "compass-demo-router" } }));

  router.get("/users/:id", (request) => {
    const user = users.get(request.params.id);
    if (!user) return { status: 404, body: { error: "User not found" } };
    return { status: 200, body: user };
  });

  router.post("/login", (request) => {
    const name = request.body?.name;
    if (!name) return { status: 400, body: { error: "name is required" } };
    const id = String(users.size + 1);
    users.set(id, { id, name });
    return { status: 201, body: { id, name } };
  });

  router.get(
    "/me",
    auth.requireAuth(() => ({ status: 200, body: { ok: true } })),
  );

  return { router, handle: (request) => router.handle(request) };
}
