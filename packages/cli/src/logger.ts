// dedup: logger factory centralized in logger.ts
// Creates the enhanced colored logger used by CLI commands.
import { log } from './colors.js';

export function createLogger() {
  return {
    info: log.info,
    success: log.success,
    warning: log.warning,
    error: log.error,
    building: log.building,
    processing: log.processing,
    stats: log.stats,
    // Pretty logging methods
    header: log.header,
    step: log.step,
    progress: log.progress,
    file: log.file,
    url: log.url,
    timing: log.timing,
    statsTable: log.statsTable,
    navigationTree: log.navigationTree,
    // Rendering tree methods
    startRenderingTree: log.startRenderingTree,
    addTreeNode: log.addTreeNode,
    updateTreeNode: log.updateTreeNode,
    showRenderingTree: log.showRenderingTree,
    clearRenderingTree: log.clearRenderingTree,
  } as const;
}
