# compass-demo-router

A tiny, dependency-free HTTP router used to demo **CodeCompass** end to end.

Requests come in as plain objects (`{ method, path, body, headers }`) and the
router matches them against registered routes in registration order. There is
no network layer, so the whole thing is trivially testable.

## Getting started

```bash
npm test      # runs the Node.js built-in test runner (no install needed)
```

## Folder structure

- `src/router.js` — route registration and matching
- `src/auth.js` — bearer-token authentication middleware
- `src/utils.js` — path normalisation and pattern compilation
- `src/index.js` — wires the router, auth and in-memory user store together
- `test/router.test.js` — the test suite

## Usage

```js
import { createApp } from "./src/index.js";

const app = createApp({ secret: "dev-secret" });

app.handle({ method: "GET", path: "/" });
// => { status: 200, body: { service: "compass-demo-router" } }
```

## Known limitations

- Route parameters are matched but never URL-decoded.
- The user store is an in-memory `Map`, so data is lost on restart.
- `/login` issues no real token; see `src/auth.js`.
