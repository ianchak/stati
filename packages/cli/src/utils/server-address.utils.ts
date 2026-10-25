/**
 * Splits a server URL like `http://localhost:3000` into host and port. A path, such as the base
 * path of a site served from a subfolder (`http://localhost:3000/docs/`), is ignored.
 * Splits on the last colon so bare IPv6 hosts (e.g. `::1`) are kept intact.
 */
export function parseServerAddress(url: string): { host: string; port: number } {
  const address = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const separatorIndex = address.lastIndexOf(':');
  return {
    host: address.slice(0, separatorIndex),
    port: Number(address.slice(separatorIndex + 1)),
  };
}
