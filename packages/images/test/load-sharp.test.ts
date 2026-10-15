import { afterEach, describe, expect, it, vi } from 'vitest';

describe('loadSharp', () => {
  afterEach(() => {
    vi.doUnmock('sharp');
    vi.resetModules();
  });

  it('explains how to fix a native binary that is missing for this platform', async () => {
    vi.doMock('sharp', () => {
      throw new Error('Could not load the "sharp" module using the test runtime');
    });
    const { loadSharp } = await import('../src/runtime.js');

    const error = await loadSharp().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      `Could not load sharp for ${process.platform}-${process.arch}:`,
    );
    expect((error as Error).message).toContain('https://sharp.pixelplumbing.com/install');
  });
});
