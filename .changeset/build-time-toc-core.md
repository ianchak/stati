---
"@stati/core": minor
---

### Separate CLI and Core version tracking in metrics

- Changed `BuildOptions.version` to separate `cliVersion` and `coreVersion` options for more granular version tracking
- Updated `MetricsMeta` interface: replaced `statiVersion` with `cliVersion` and `coreVersion` fields
- Updated `MetricRecorderOptions` to use `cliVersion` and `coreVersion` instead of `statiVersion`
- Exported `getStatiVersion` utility function from core for use by CLI and consumers
- Removed `formatMetricsSummary` export from core (metrics summary is now handled by CLI)

### Preview server caching fix

- Changed preview server cache control from aggressive caching (`max-age=31536000`) to no-cache (`no-cache, no-store, must-revalidate`) to ensure fresh content during preview
