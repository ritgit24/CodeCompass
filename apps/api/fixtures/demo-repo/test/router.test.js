import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.js";
import { compilePath, normalisePath } from "../src/utils.js";

test("GET / reports the service name", () => {
  const app = createApp();
  const res = app.handle({ method: "GET", path: "/" });
  assert.equal(res.status, 200);
  assert.equal(res.body.service, "compass-demo-router");
});

test("unknown routes return 404", () => {
  const app = createApp();
  const res = app.handle({ method: "GET", path: "/nope" });
  assert.equal(res.status, 404);
});

test("GET /users/:id returns a known user", () => {
  const app = createApp();
  const res = app.handle({ method: "GET", path: "/users/1" });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Ada");
});

test("POST /login creates a user", () => {
  const app = createApp();
  const res = app.handle({ method: "POST", path: "/login", body: { name: "Grace" } });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, "Grace");
});

test("POST /login without a name is rejected", () => {
  const app = createApp();
  const res = app.handle({ method: "POST", path: "/login", body: {} });
  assert.equal(res.status, 400);
});

test("/me requires a bearer token", () => {
  const app = createApp({ secret: "dev-secret" });
  assert.equal(app.handle({ method: "GET", path: "/me" }).status, 401);

  const ok = app.handle({
    method: "GET",
    path: "/me",
    headers: { authorization: "Bearer dev-secret" },
  });
  assert.equal(ok.status, 200);
});

test("normalisePath collapses duplicate and trailing slashes", () => {
  assert.equal(normalisePath("//users//1/"), "/users/1");
});

test("compilePath builds named groups", () => {
  const match = "/users/42".match(compilePath("/users/:id"));
  assert.equal(match.groups.id, "42");
});
