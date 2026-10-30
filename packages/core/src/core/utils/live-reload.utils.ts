import type { WebSocketServer } from 'ws';

/** The path of the dev server's live reload socket, outside any base path */
export const LIVE_RELOAD_PATH = '/__ws';

/** The message that tells the open pages to reload */
const RELOAD_MESSAGE = JSON.stringify({ type: 'reload' });

/** `WebSocket.OPEN`: the connection can send */
const OPEN = 1;

export interface ReloadBroadcasterOptions {
  /** Sends nothing, for the `STATI_DEV_DISABLE_WS_RELOAD` diagnostic */
  disabled?: boolean;
}

/**
 * Creates the function that reloads every page open in a browser, through the dev server's
 * live reload socket. The rebuild queue, the TypeScript watcher and the CSS watcher all reload
 * through it.
 *
 * @param getServer - Returns the WebSocket server, or null while there is none. It is read on
 *   each reload, as the server starts after the TypeScript watcher.
 * @param options - Whether reloading is disabled
 */
export function createReloadBroadcaster(
  getServer: () => WebSocketServer | null,
  options: ReloadBroadcasterOptions = {},
): () => void {
  return () => {
    const server = getServer();
    if (!server || options.disabled) {
      return;
    }
    server.clients.forEach((client: unknown) => {
      const ws = client as { readyState: number; send: (data: string) => void };
      if (ws.readyState === OPEN) {
        ws.send(RELOAD_MESSAGE);
      }
    });
  };
}

/**
 * Adds the live reload script to a page: it connects to the socket, reloads the page when told
 * to, and reloads it once the socket closes, so the page comes back when the dev server restarts.
 *
 * @param html - The page
 * @param socketUrl - The socket's URL, such as `ws://localhost:3000/__ws`
 * @returns The page with the script before `</body>`, or at the end when it has none
 */
export function injectLiveReloadScript(html: string, socketUrl: string): string {
  const script = `
<script>
(function() {
  const ws = new WebSocket('${socketUrl}');
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('▸ Reloading page due to file changes...');
      window.location.reload();
    }
  };
  ws.onclose = function() {
    // Suppress disconnection logs - not informative for users
    // Try to reconnect after a delay
    setTimeout(() => window.location.reload(), 1000);
  };
})();
</script>`;

  // Insert before closing </body> tag, or at the end if no </body>
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`);
  }
  return html + script;
}
