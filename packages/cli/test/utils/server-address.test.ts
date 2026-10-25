import { describe, it, expect } from 'vitest';
import { parseServerAddress } from '../../src/utils/server-address.utils.js';

describe('parseServerAddress', () => {
  it('should split a hostname URL into host and port', () => {
    expect(parseServerAddress('http://localhost:3000')).toEqual({ host: 'localhost', port: 3000 });
  });

  it('should handle IPv4 hosts', () => {
    expect(parseServerAddress('http://0.0.0.0:4000')).toEqual({ host: '0.0.0.0', port: 4000 });
  });

  it('should keep bare IPv6 hosts intact', () => {
    expect(parseServerAddress('http://::1:3000')).toEqual({ host: '::1', port: 3000 });
  });

  it('should ignore the base path of a site served from a subfolder', () => {
    expect(parseServerAddress('http://localhost:3000/docs/')).toEqual({
      host: 'localhost',
      port: 3000,
    });
    expect(parseServerAddress('http://::1:3000/demos/blog/')).toEqual({ host: '::1', port: 3000 });
  });

  it('should handle https URLs', () => {
    expect(parseServerAddress('https://example.test:8443')).toEqual({
      host: 'example.test',
      port: 8443,
    });
  });
});
