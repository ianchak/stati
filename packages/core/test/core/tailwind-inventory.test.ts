import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { readFile, pathExists, remove, writeFile, ensureDir } from '../../src/core/utils/fs.js';
import {
  trackTailwindClass,
  enableInventoryTracking,
  disableInventoryTracking,
  clearInventory,
  getInventory,
  getInventorySize,
  isTrackingEnabled,
  writeTailwindClassInventory,
  loadPreviousInventory,
  isTailwindUsed,
  resetTailwindDetection,
} from '../../src/core/utils/tailwind-inventory.js';
import { propValue } from '../../src/core/utils/template-utils.js';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';

describe('Tailwind Inventory - Tracking State', () => {
  beforeEach(() => {
    clearInventory();
    disableInventoryTracking();
  });

  afterEach(() => {
    clearInventory();
    disableInventoryTracking();
  });

  describe('tracking enable/disable', () => {
    it('should start with tracking disabled', () => {
      expect(isTrackingEnabled()).toBe(false);
    });

    it('should enable tracking', () => {
      enableInventoryTracking();
      expect(isTrackingEnabled()).toBe(true);
    });

    it('should disable tracking', () => {
      enableInventoryTracking();
      disableInventoryTracking();
      expect(isTrackingEnabled()).toBe(false);
    });

    it('should not track classes when tracking is disabled', () => {
      disableInventoryTracking();
      trackTailwindClass('from-primary-50');
      expect(getInventorySize()).toBe(0);
    });

    it('should track classes when tracking is enabled', () => {
      enableInventoryTracking();
      trackTailwindClass('from-primary-50');
      expect(getInventorySize()).toBe(1);
    });
  });

  describe('inventory management', () => {
    it('should start with empty inventory', () => {
      expect(getInventorySize()).toBe(0);
      expect(getInventory()).toEqual([]);
    });

    it('should track unique classes', () => {
      enableInventoryTracking();
      trackTailwindClass('from-primary-50');
      trackTailwindClass('to-primary-100');
      trackTailwindClass('bg-emerald-500');

      expect(getInventorySize()).toBe(3);
      expect(getInventory()).toContain('from-primary-50');
      expect(getInventory()).toContain('to-primary-100');
      expect(getInventory()).toContain('bg-emerald-500');
    });

    it('should not duplicate classes', () => {
      enableInventoryTracking();
      trackTailwindClass('from-primary-50');
      trackTailwindClass('from-primary-50');
      trackTailwindClass('from-primary-50');

      expect(getInventorySize()).toBe(1);
    });

    it('should clear inventory', () => {
      enableInventoryTracking();
      trackTailwindClass('from-primary-50');
      trackTailwindClass('to-primary-100');

      expect(getInventorySize()).toBe(2);

      clearInventory();

      expect(getInventorySize()).toBe(0);
      expect(getInventory()).toEqual([]);
    });

    it('should return sorted inventory', () => {
      enableInventoryTracking();
      trackTailwindClass('to-primary-100');
      trackTailwindClass('from-primary-50');
      trackTailwindClass('bg-emerald-500');

      const inventory = getInventory();
      expect(inventory).toEqual(['bg-emerald-500', 'from-primary-50', 'to-primary-100']);
    });
  });
});

describe('Tailwind Inventory - propValue Integration', () => {
  beforeEach(() => {
    clearInventory();
    enableInventoryTracking();
  });

  afterEach(() => {
    clearInventory();
    disableInventoryTracking();
  });

  it('should track classes from propValue string arguments', () => {
    const result = propValue('from-primary-50', 'to-primary-100');

    expect(result).toBe('from-primary-50 to-primary-100');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-primary-100');
  });

  it('should track classes from propValue array arguments', () => {
    const result = propValue(['from-primary-50', 'to-emerald-100']);

    expect(result).toBe('from-primary-50 to-emerald-100');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-emerald-100');
  });

  it('should track classes from propValue object arguments', () => {
    const result = propValue({
      'from-primary-50': true,
      'to-primary-100': true,
      'bg-red-500': false,
    });

    expect(result).toBe('from-primary-50 to-primary-100');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-primary-100');
    expect(getInventory()).not.toContain('bg-red-500'); // false value shouldn't be tracked
  });

  it('should track classes from mixed propValue arguments', () => {
    propValue('from-primary-50', ['to-emerald-100', 'bg-amber-500'], {
      'text-red-600': true,
    });

    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-emerald-100');
    expect(getInventory()).toContain('bg-amber-500');
    expect(getInventory()).toContain('text-red-600');
  });

  it('should track ALL classes from propValue (including static classes)', () => {
    const result = propValue('flex', 'items-center', 'from-primary-50');

    expect(result).toBe('flex items-center from-primary-50');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('flex');
    expect(getInventory()).toContain('items-center');
    expect(getInventorySize()).toBe(3);
  });

  it('should track gradient classes and other utilities', () => {
    const result = propValue(
      'bg-gradient-to-br',
      'from-amber-500/5',
      'to-amber-600/5',
      'rounded-2xl',
    );

    expect(result).toBe('bg-gradient-to-br from-amber-500/5 to-amber-600/5 rounded-2xl');
    expect(getInventory()).toContain('bg-gradient-to-br');
    expect(getInventory()).toContain('from-amber-500/5');
    expect(getInventory()).toContain('to-amber-600/5');
    expect(getInventory()).toContain('rounded-2xl');
    expect(getInventorySize()).toBe(4);
  });

  it('should handle space-separated classes in a single string', () => {
    const result = propValue('absolute inset-0 bg-gradient-to-r');

    expect(result).toBe('absolute inset-0 bg-gradient-to-r');
    expect(getInventory()).toContain('absolute');
    expect(getInventory()).toContain('inset-0');
    expect(getInventory()).toContain('bg-gradient-to-r');
    expect(getInventorySize()).toBe(3);
  });

  it('should track template literal interpolations', () => {
    const color = 'primary';
    const result = propValue(`from-${color}-50`, `to-${color}-100`);

    expect(result).toBe('from-primary-50 to-primary-100');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-primary-100');
  });
});

describe('Tailwind Inventory - File Writing', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-tailwind-test-'));
    clearInventory();
    enableInventoryTracking();
  });

  afterEach(async () => {
    clearInventory();
    disableInventoryTracking();
    await remove(tempDir);
  });

  it('should write inventory file with tracked classes', async () => {
    trackTailwindClass('from-primary-50');
    trackTailwindClass('to-primary-100');
    trackTailwindClass('bg-emerald-500');

    const inventoryPath = await writeTailwindClassInventory(tempDir);

    expect(await pathExists(inventoryPath)).toBe(true);

    const content = await readFile(inventoryPath, 'utf-8');
    expect(content).toContain('from-primary-50');
    expect(content).toContain('to-primary-100');
    expect(content).toContain('bg-emerald-500');
    expect(content).toContain('Auto-generated by Stati');
  });

  it('should write valid HTML file', async () => {
    trackTailwindClass('from-primary-50');

    const inventoryPath = await writeTailwindClassInventory(tempDir);
    const content = await readFile(inventoryPath, 'utf-8');

    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html>');
    expect(content).toContain('</html>');
    expect(content).toContain('<div class="hidden">');
  });

  it('should include metadata in file', async () => {
    trackTailwindClass('from-primary-50');
    trackTailwindClass('to-primary-100');

    const inventoryPath = await writeTailwindClassInventory(tempDir);
    const content = await readFile(inventoryPath, 'utf-8');

    expect(content).toContain('Classes tracked: 2');
    expect(content).toContain('Generated:');
  });

  it('should write empty file when no classes tracked', async () => {
    const inventoryPath = await writeTailwindClassInventory(tempDir);
    const content = await readFile(inventoryPath, 'utf-8');

    expect(content).toContain('No dynamic classes tracked yet');
    expect(await pathExists(inventoryPath)).toBe(true);
  });

  it('should create directory if it does not exist', async () => {
    const nestedDir = join(tempDir, 'nested', 'path');

    await writeTailwindClassInventory(nestedDir);

    expect(await pathExists(join(nestedDir, 'tailwind-classes.html'))).toBe(true);
  });
});

describe('Tailwind Inventory - Loading Previous Inventory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-tailwind-load-'));
    clearInventory();
    enableInventoryTracking();
  });

  afterEach(async () => {
    clearInventory();
    disableInventoryTracking();
    await remove(tempDir);
  });

  it('should load classes from previous inventory file', async () => {
    // First build - write some classes
    trackTailwindClass('from-primary-50');
    trackTailwindClass('to-primary-100');
    trackTailwindClass('bg-gradient-to-br');
    await writeTailwindClassInventory(tempDir);

    // Simulate new build - clear and reload
    clearInventory();
    expect(getInventorySize()).toBe(0);

    const loaded = await loadPreviousInventory(tempDir);
    expect(loaded).toBe(3);
    expect(getInventorySize()).toBe(3);
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-primary-100');
    expect(getInventory()).toContain('bg-gradient-to-br');
  });

  it('should return 0 when no previous inventory exists', async () => {
    const loaded = await loadPreviousInventory(tempDir);
    expect(loaded).toBe(0);
    expect(getInventorySize()).toBe(0);
  });

  it('should handle empty inventory file gracefully', async () => {
    // Write an inventory file with no classes
    await writeTailwindClassInventory(tempDir);

    clearInventory();
    const loaded = await loadPreviousInventory(tempDir);
    expect(loaded).toBe(0);
    expect(getInventorySize()).toBe(0);
  });

  it('should handle corrupted inventory file gracefully', async () => {
    // Write invalid HTML
    const inventoryPath = join(tempDir, 'tailwind-classes.html');
    await ensureDir(tempDir);
    await writeFile(inventoryPath, '<div>invalid html</div>', 'utf-8');

    const loaded = await loadPreviousInventory(tempDir);
    expect(loaded).toBe(0);
    expect(getInventorySize()).toBe(0);
  });

  it('should preserve classes across build cycles', async () => {
    // Build 1
    trackTailwindClass('from-primary-50');
    trackTailwindClass('bg-gradient-to-r');
    await writeTailwindClassInventory(tempDir);

    // Build 2 - load previous + add new
    clearInventory();
    await loadPreviousInventory(tempDir);
    trackTailwindClass('to-emerald-100');
    trackTailwindClass('rounded-2xl');
    await writeTailwindClassInventory(tempDir);

    // Build 3 - verify all classes are preserved
    clearInventory();
    const loaded = await loadPreviousInventory(tempDir);
    expect(loaded).toBe(4);
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('bg-gradient-to-r');
    expect(getInventory()).toContain('to-emerald-100');
    expect(getInventory()).toContain('rounded-2xl');
  });
});

describe('Tailwind Inventory - Multi-Pass Builds', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-tailwind-multipass-'));
    clearInventory();
  });

  afterEach(async () => {
    clearInventory();
    disableInventoryTracking();
    await remove(tempDir);
  });

  it('should accumulate classes across multiple render passes', () => {
    enableInventoryTracking();

    // First pass
    propValue('from-primary-50');
    expect(getInventorySize()).toBe(1);

    // Second pass (same build)
    propValue('to-primary-100');
    expect(getInventorySize()).toBe(2);

    // Third pass (same build)
    propValue('bg-emerald-500');
    expect(getInventorySize()).toBe(3);

    const inventory = getInventory();
    expect(inventory).toContain('from-primary-50');
    expect(inventory).toContain('to-primary-100');
    expect(inventory).toContain('bg-emerald-500');
  });

  it('should clear inventory for fresh build', () => {
    // Build 1
    enableInventoryTracking();
    propValue('from-primary-50');
    expect(getInventorySize()).toBe(1);

    // Simulate new build
    clearInventory();
    expect(getInventorySize()).toBe(0);

    // Build 2
    propValue('to-emerald-100');
    expect(getInventorySize()).toBe(1);
    expect(getInventory()).not.toContain('from-primary-50');
    expect(getInventory()).toContain('to-emerald-100');
  });

  it('should persist state across enable/disable cycles within same build', () => {
    enableInventoryTracking();
    propValue('from-primary-50');

    disableInventoryTracking();
    propValue('bg-red-500'); // Should not be tracked

    enableInventoryTracking();
    propValue('to-primary-100'); // Should be tracked

    expect(getInventorySize()).toBe(2);
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).toContain('to-primary-100');
    expect(getInventory()).not.toContain('bg-red-500');
  });

  it('should handle concurrent template renders', () => {
    enableInventoryTracking();

    // Simulate multiple templates being rendered concurrently
    const templates = [
      () => propValue('from-primary-50', 'to-primary-100'),
      () => propValue('bg-emerald-500', 'text-emerald-600'),
      () => propValue('border-amber-200', 'hover:bg-amber-300'),
    ];

    templates.forEach((template) => template());

    expect(getInventorySize()).toBe(6); // All dynamic classes tracked
  });

  it('should write consistent file across multiple writes in same build', async () => {
    enableInventoryTracking();

    propValue('from-primary-50');
    await writeTailwindClassInventory(tempDir);

    propValue('to-primary-100');
    await writeTailwindClassInventory(tempDir);
    const content2 = await readFile(join(tempDir, 'tailwind-classes.html'), 'utf-8');

    // Second write should include both classes
    expect(content2).toContain('from-primary-50');
    expect(content2).toContain('to-primary-100');
    expect(content2).toContain('Classes tracked: 2');
  });
});

describe('Tailwind Detection', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-tailwind-detection-'));
    await ensureDir(tempDir);
    resetTailwindDetection(); // Reset cache before each test
  });

  afterEach(async () => {
    await remove(tempDir);
    resetTailwindDetection(); // Reset cache after each test
  });

  it('should detect Tailwind via tailwind.config.js', async () => {
    await writeFile(join(tempDir, 'tailwind.config.js'), 'module.exports = {}');
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should detect Tailwind via tailwind.config.ts', async () => {
    await writeFile(join(tempDir, 'tailwind.config.ts'), 'export default {}');
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should detect Tailwind via tailwind.config.mjs', async () => {
    await writeFile(join(tempDir, 'tailwind.config.mjs'), 'export default {}');
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should detect Tailwind via tailwind.config.cjs', async () => {
    await writeFile(join(tempDir, 'tailwind.config.cjs'), 'module.exports = {}');
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should detect Tailwind via package.json devDependencies', async () => {
    const packageJson = {
      name: 'test-project',
      devDependencies: {
        tailwindcss: '^3.0.0',
      },
    };
    await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should detect Tailwind via package.json dependencies', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        tailwindcss: '^3.0.0',
      },
    };
    await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(true);
  });

  it('should return false when Tailwind is not detected', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        react: '^18.0.0',
      },
    };
    await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(false);
  });

  it('should return false when no config or package.json exists', async () => {
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(false);
  });

  it('should cache detection result across multiple calls', async () => {
    await writeFile(join(tempDir, 'tailwind.config.js'), 'module.exports = {}');

    const detected1 = await isTailwindUsed(tempDir);
    expect(detected1).toBe(true);

    // Remove config file to verify cache is used
    await remove(join(tempDir, 'tailwind.config.js'));

    const detected2 = await isTailwindUsed(tempDir);
    expect(detected2).toBe(true); // Still true because of cache

    // Reset cache and check again
    resetTailwindDetection();
    const detected3 = await isTailwindUsed(tempDir);
    expect(detected3).toBe(false); // Now false because file is gone
  });

  it('should handle invalid package.json gracefully', async () => {
    await writeFile(join(tempDir, 'package.json'), 'invalid json {{{');
    const detected = await isTailwindUsed(tempDir);
    expect(detected).toBe(false);
  });
});
