---
"@stati/cli": minor
---

### New decorative startup banner

- Added a new colorful startup banner with gradient effects for CLI commands (build, dev, preview)
- Startup banner now displays both CLI and Core versions separately for better debugging and transparency
- Added `startupBanner` function to the log utilities with support for "Build", "Development Server", and "Preview Server" modes

### Metrics output changes

- Removed console metrics summary output; metrics are now only written to the JSON file in `.stati/metrics/`
- Updated to use new `cliVersion` and `coreVersion` options from `@stati/core`
