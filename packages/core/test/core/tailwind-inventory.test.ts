import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { readFile, pathExists, remove, writeFile, ensureDir } from '../../src/core/utils/fs.js';
import {
  trackTailwindClass,
  shouldTrackForTailwind,
  enableInventoryTracking,
  disableInventoryTracking,
  clearInventory,
  getInventory,
  getInventorySize,
  isTrackingEnabled,
  writeTailwindClassInventory,
  seedInventoryWithCommonPatterns,
  isTailwindUsed,
  resetTailwindDetection,
} from '../../src/core/utils/tailwind-inventory.js';
import { propValue } from '../../src/core/utils/template-utils.js';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';

describe('Tailwind Inventory - Pattern Matching', () => {
  describe('shouldTrackForTailwind', () => {
    it('should track color utility classes with shades', () => {
      expect(shouldTrackForTailwind('from-primary-50')).toBe(true);
      expect(shouldTrackForTailwind('to-emerald-900')).toBe(true);
      expect(shouldTrackForTailwind('bg-red-500')).toBe(true);
      expect(shouldTrackForTailwind('text-blue-600')).toBe(true);
      expect(shouldTrackForTailwind('border-green-400')).toBe(true);
    });

    it('should track color utilities with opacity', () => {
      expect(shouldTrackForTailwind('bg-primary-500/10')).toBe(true);
      expect(shouldTrackForTailwind('border-emerald-200/50')).toBe(true);
      expect(shouldTrackForTailwind('text-red-600/80')).toBe(true);
    });

    it('should track hover variant color classes', () => {
      expect(shouldTrackForTailwind('hover:bg-primary-50')).toBe(true);
      expect(shouldTrackForTailwind('hover:text-emerald-600')).toBe(true);
      expect(shouldTrackForTailwind('hover:border-red-500')).toBe(true);
    });

    it('should track dark mode color classes', () => {
      expect(shouldTrackForTailwind('dark:from-primary-900/20')).toBe(true);
      expect(shouldTrackForTailwind('dark:bg-emerald-800')).toBe(true);
      expect(shouldTrackForTailwind('dark:text-red-400')).toBe(true);
    });

    it('should track dark mode with state variants', () => {
      expect(shouldTrackForTailwind('dark:hover:bg-primary-900/20')).toBe(true);
      expect(shouldTrackForTailwind('dark:focus:text-emerald-500')).toBe(true);
      expect(shouldTrackForTailwind('dark:group-hover:border-red-300')).toBe(true);
    });

    it('should track shadow utilities with colors', () => {
      expect(shouldTrackForTailwind('shadow-primary-500/10')).toBe(true);
      expect(shouldTrackForTailwind('hover:shadow-emerald-500/10')).toBe(true);
    });

    it('should track group-hover variants', () => {
      expect(shouldTrackForTailwind('group-hover:bg-primary-500')).toBe(true);
      expect(shouldTrackForTailwind('group-hover:text-emerald-600')).toBe(true);
    });

    it('should NOT track static classes', () => {
      expect(shouldTrackForTailwind('flex')).toBe(false);
      expect(shouldTrackForTailwind('items-center')).toBe(false);
      expect(shouldTrackForTailwind('rounded-xl')).toBe(false);
      expect(shouldTrackForTailwind('px-4')).toBe(false);
      expect(shouldTrackForTailwind('w-full')).toBe(false);
    });

    it('should NOT track non-color utility classes', () => {
      expect(shouldTrackForTailwind('p-4')).toBe(false);
      expect(shouldTrackForTailwind('m-2')).toBe(false);
      expect(shouldTrackForTailwind('gap-3')).toBe(false);
    });
  });
});

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

  describe('seeding patterns', () => {
    it('should seed common patterns', () => {
      enableInventoryTracking();
      seedInventoryWithCommonPatterns(['primary', 'emerald'], [50, 100, 500]);

      expect(getInventorySize()).toBeGreaterThan(0);
      expect(getInventory()).toContain('from-primary-50');
      expect(getInventory()).toContain('from-primary-100');
      expect(getInventory()).toContain('bg-emerald-500');
      expect(getInventory()).toContain('hover:bg-primary-50');
      expect(getInventory()).toContain('dark:text-emerald-100');
    });

    it('should not seed if no colors provided', () => {
      enableInventoryTracking();
      seedInventoryWithCommonPatterns([]);

      expect(getInventorySize()).toBe(0);
    });

    it('should include opacity variants when seeding', () => {
      enableInventoryTracking();
      seedInventoryWithCommonPatterns(['primary'], [500]);

      const inventory = getInventory();
      expect(inventory).toContain('bg-primary-500/10');
      expect(inventory).toContain('bg-primary-500/20');
      expect(inventory).toContain('border-primary-500/50');
      expect(inventory).toContain('shadow-primary-500/10');
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

  it('should not track static classes from propValue', () => {
    const result = propValue('flex', 'items-center', 'from-primary-50');

    expect(result).toBe('flex items-center from-primary-50');
    expect(getInventory()).toContain('from-primary-50');
    expect(getInventory()).not.toContain('flex');
    expect(getInventory()).not.toContain('items-center');
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
