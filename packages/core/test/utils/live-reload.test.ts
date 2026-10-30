import { describe, it, expect, vi } from 'vitest';
import type { WebSocketServer } from 'ws';
import {
  LIVE_RELOAD_PATH,
  createReloadBroadcaster,
  injectLiveReloadScript,
} from '../../src/core/utils/live-reload.utils.js';

/** A WebSocket server with an open, a connecting and a closed connection */
function createServer() {
  const open = { readyState: 1, send: vi.fn() };
  const connecting = { readyState: 0, send: vi.fn() };
  const closed = { readyState: 3, send: vi.fn() };
  const server = { clients: new Set([open, connecting, closed]) } as unknown as WebSocketServer;
  return { server, open, connecting, closed };
}

describe('createReloadBroadcaster', () => {
  it('tells every open connection to reload, and no other', () => {
    const { server, open, connecting, closed } = createServer();

    createReloadBroadcaster(() => server)();

    expect(open.send).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ type: 'reload' }));
    expect(connecting.send).not.toHaveBeenCalled();
    expect(closed.send).not.toHaveBeenCalled();
  });

  it('sends nothing when disabled', () => {
    const { server, open } = createServer();

    createReloadBroadcaster(() => server, { disabled: true })();

    expect(open.send).not.toHaveBeenCalled();
  });

  it('reads the server on each reload, doing nothing while there is none', () => {
    const { server, open } = createServer();
    let current: WebSocketServer | null = null;
    const reload = createReloadBroadcaster(() => current);

    reload();
    current = server;
    reload();

    expect(open.send).toHaveBeenCalledTimes(1);
  });
});

describe('injectLiveReloadScript', () => {
  const socketUrl = `ws://localhost:3000${LIVE_RELOAD_PATH}`;

  it('adds the script that connects to the socket before </body>', () => {
    const html = injectLiveReloadScript('<html><body><h1>Hi</h1></body></html>', socketUrl);

    expect(html).toContain("new WebSocket('ws://localhost:3000/__ws')");
    expect(html).toMatch(/<h1>Hi<\/h1>\s*<script>[\s\S]*<\/script>\n<\/body><\/html>$/);
  });

  it('adds the script at the end of a page without </body>', () => {
    const html = injectLiveReloadScript('<p>Fragment</p>', socketUrl);

    expect(html.startsWith('<p>Fragment</p>')).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
  });
});
