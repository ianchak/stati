import { describe, it, expect } from 'vitest';
import { detectAvailablePackageManagers } from '../src/create.js';

describe('Package Manager Detection', () => {
  it('should detect at least npm as available', async () => {
    const managers = await detectAvailablePackageManagers();

    expect(managers).toBeDefined();
    expect(Array.isArray(managers)).toBe(true);
    expect(managers.length).toBeGreaterThan(0);
    // npm should always be available in a Node.js environment
    expect(managers).toContain('npm');
  });

  it('should return valid package manager names', async () => {
    const managers = await detectAvailablePackageManagers();
    const validManagers = ['npm', 'yarn', 'pnpm', 'bun'];

    managers.forEach((manager) => {
      expect(validManagers).toContain(manager);
    });
  });

  it('should not contain duplicates', async () => {
    const managers = await detectAvailablePackageManagers();
    const uniqueManagers = [...new Set(managers)];

    expect(managers.length).toBe(uniqueManagers.length);
  });
});
