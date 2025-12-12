/**
 * Build metrics type definitions for Stati performance measurement system.
 *
 * Schema version: 1
 * This schema is versioned for backward compatibility.
 */

/**
 * Complete build metrics output format.
 * Written to JSON files and used for CI regression detection.
 */
export interface BuildMetrics {
  /** Schema version for backward compatibility */
  readonly schemaVersion: '1';

  /** Run metadata */
  readonly meta: MetricsMeta;

  /** Total timings and memory */
  readonly totals: MetricsTotals;

  /** Phase breakdown (all times in milliseconds) */
  readonly phases: MetricsPhases;

  /** Counts */
  readonly counts: MetricsCounts;

  /** ISG cache metrics */
  readonly isg: MetricsISG;

  /** Per-page timing (optional, only when detailed tracing enabled) */
  readonly pageTimings?: readonly PageTiming[];

  /** Incremental rebuild metrics (dev mode only) */
  readonly incremental?: IncrementalMetrics;
}

/**
 * Run metadata for a build metrics report.
 */
export interface MetricsMeta {
  /** ISO timestamp of build start */
  readonly timestamp: string;
  /** Git commit SHA (if available) */
  readonly gitCommit?: string;
  /** Git branch (if available) */
  readonly gitBranch?: string;
  /** Whether running in CI environment */
  readonly ci: boolean;
  /** Node.js version */
  readonly nodeVersion: string;
  /** Platform (darwin, linux, win32) */
  readonly platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
  /** CPU architecture */
  readonly arch: string;
  /** Number of CPU cores */
  readonly cpuCount: number;
  /** Stati version */
  readonly statiVersion: string;
  /** Command executed */
  readonly command: 'build' | 'dev';
  /** CLI flags used */
  readonly flags: MetricsFlags;
}

/**
 * CLI flags captured in metrics.
 */
export interface MetricsFlags {
  readonly force?: boolean | undefined;
  readonly clean?: boolean | undefined;
  readonly includeDrafts?: boolean | undefined;
}

/**
 * Total timings and memory measurements.
 */
export interface MetricsTotals {
  /** Total build duration in milliseconds */
  readonly durationMs: number;
  /** Peak RSS in bytes */
  readonly peakRssBytes: number;
  /** Heap used at end of build in bytes */
  readonly heapUsedBytes: number;
}

/**
 * Phase breakdown timings in milliseconds.
 * All fields are optional as not all phases run in every build.
 */
export interface MetricsPhases {
  readonly configLoadMs?: number;
  readonly contentDiscoveryMs?: number;
  readonly navigationBuildMs?: number;
  readonly cacheManifestLoadMs?: number;
  readonly typescriptCompileMs?: number;
  readonly pageRenderingMs?: number;
  readonly assetCopyMs?: number;
  readonly cacheManifestSaveMs?: number;
  readonly sitemapGenerationMs?: number;
  readonly rssGenerationMs?: number;
  /** Build hooks - only recorded when hooks are configured */
  readonly hookBeforeAllMs?: number;
  readonly hookAfterAllMs?: number;
  /** Aggregate time spent in beforeRender hooks across all pages */
  readonly hookBeforeRenderTotalMs?: number;
  /** Aggregate time spent in afterRender hooks across all pages */
  readonly hookAfterRenderTotalMs?: number;
}

/**
 * Phase names as a union type for type safety.
 */
export type PhaseName = keyof MetricsPhases;

/**
 * Counts of various build artifacts.
 */
export interface MetricsCounts {
  readonly totalPages: number;
  readonly renderedPages: number;
  readonly cachedPages: number;
  readonly assetsCopied: number;
  readonly templatesLoaded: number;
  readonly markdownFilesProcessed: number;
}

/**
 * Counter names as a union type for type safety.
 */
export type CounterName = keyof MetricsCounts;

/**
 * ISG cache metrics.
 */
export interface MetricsISG {
  /** Whether ISG caching is enabled */
  readonly enabled: boolean;
  /** Cache hit rate (0..1) */
  readonly cacheHitRate: number;
  /** Number of entries in manifest */
  readonly manifestEntries: number;
  /** Number of entries invalidated this build */
  readonly invalidatedEntries: number;
}

/**
 * Per-page timing information.
 * Only collected when detailed metrics are enabled.
 */
export interface PageTiming {
  /** Page URL */
  readonly url: string;
  /** Render duration in milliseconds */
  readonly durationMs: number;
  /** Whether page was served from cache */
  readonly cached: boolean;
}

/**
 * Incremental rebuild metrics for dev server.
 */
export interface IncrementalMetrics {
  /** File that triggered the rebuild */
  readonly triggerFile: string;
  /** Type of file that changed */
  readonly triggerType: 'markdown' | 'template' | 'static' | 'config';
  /** Number of pages rendered */
  readonly renderedPages: number;
  /** Number of pages served from cache */
  readonly cachedPages: number;
  /** Total rebuild duration in milliseconds */
  readonly durationMs: number;
}

/**
 * Options for creating a MetricRecorder.
 */
export interface MetricRecorderOptions {
  /** Whether metrics collection is enabled */
  enabled?: boolean | undefined;
  /** Whether to collect per-page timings */
  detailed?: boolean | undefined;
  /** Command being executed */
  command?: 'build' | 'dev' | undefined;
  /** CLI flags used */
  flags?: MetricsFlags | undefined;
  /** Stati version string */
  statiVersion?: string | undefined;
}

/**
 * Interface for metrics collection.
 * The noop implementation has zero overhead when disabled.
 */
export interface MetricRecorder {
  /**
   * Start a named span, returns a function to end it.
   * The returned function records the duration when called.
   */
  startSpan(name: PhaseName): () => void;

  /**
   * Record a phase duration directly (replaces existing value).
   */
  recordPhase(name: PhaseName, durationMs: number): void;

  /**
   * Add to an existing phase duration (for accumulating per-page hook times).
   */
  addToPhase(name: PhaseName, durationMs: number): void;

  /**
   * Increment a counter.
   */
  increment(name: CounterName, amount?: number): void;

  /**
   * Set a gauge value (for non-counter metrics).
   */
  setGauge(name: string, value: number): void;

  /**
   * Record page timing (only when detailed mode enabled).
   */
  recordPageTiming(url: string, durationMs: number, cached: boolean): void;

  /**
   * Take memory snapshot to track peak RSS.
   */
  snapshotMemory(): void;

  /**
   * Set ISG metrics.
   */
  setISGMetrics(metrics: Partial<MetricsISG>): void;

  /**
   * Set incremental rebuild metrics (dev mode).
   */
  setIncrementalMetrics(metrics: IncrementalMetrics): void;

  /**
   * Finalize and return metrics object.
   */
  finalize(): BuildMetrics;

  /**
   * Whether metrics collection is enabled.
   */
  readonly enabled: boolean;

  /**
   * Whether detailed (per-page) metrics are enabled.
   */
  readonly detailed: boolean;
}
