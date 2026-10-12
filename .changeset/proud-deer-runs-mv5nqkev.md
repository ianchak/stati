---
"@stati/core": minor
---

Fail fast when the dev or preview server port is unavailable

The dev and preview servers now check that their port can be bound before doing any startup work (dev server lock, TypeScript watchers, initial build). If the port is already in use or not permitted, startup stops immediately with a clear message, for example:

```text
Port 3000 is already in use on localhost. Stop the process using it, or choose another port with --port or `dev.port` in your Stati config.
```

Previously, the dev server ran a full initial build and then failed with a raw `EADDRINUSE` listen error. The new `PortUnavailableError` (with `port`, `host`, and `code`) is also used when the port is taken between the check and the actual bind.
