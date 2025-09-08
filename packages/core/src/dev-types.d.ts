// Minimal WebSocket types for development
declare module 'ws' {
  export class WebSocketServer {
    constructor(options: { server: any; path?: string });
    clients: Set<unknown>;
    on(event: 'connection', handler: (ws: unknown) => void): void;
    close(): void;
  }
}

// Minimal chokidar types for development
declare module 'chokidar' {
  export interface FSWatcher {
    on(event: 'change' | 'add' | 'unlink', handler: (path: string) => void): void;
    close(): Promise<void>;
  }

  export function watch(paths: string[], options?: any): FSWatcher;
  export default { watch };
}

// Minimal open types for development
declare module 'open' {
  function open(url: string): Promise<void>;
  export default open;
}
