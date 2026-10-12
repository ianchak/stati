---
"@stati/cli": patch
---

Let `dev.port`/`dev.host` and `preview.port`/`preview.host` from the Stati config apply when `--port`/`--host` are not given

The `--port` and `--host` options of `stati dev` and `stati preview` had built-in defaults, so they always overrode the port and host set in `stati.config`. They are now only applied when passed explicitly. Precedence is: CLI flag, then config, then the built-in default (3000 for dev, 4000 for preview, `localhost`). The startup info box now shows the host and port the server actually uses.
