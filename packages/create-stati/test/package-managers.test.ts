import { describe, it, expect } from 'vitest';
import { detectAvailablePackageManagers } from '../src/create.js';

describe('Package Manager Detection', () => {
  it('should detect available package managers with proper validation', async () => {
    const managers = await detectAvailablePackageManagers();
    const validManagers = ['npm', 'yarn', 'pnpm', 'bun'];

    // Should return an array
    expect(Array.isArray(managers)).toBe(true);
    expect(managers.length).toBeGreaterThan(0);

    // npm should always be available in a Node.js environment
    expect(managers).toContain('npm');

    // All returned managers should be valid
    managers.forEach((manager) => {
      expect(validManagers).toContain(manager);
    });

    // Should not contain duplicates
    const uniqueManagers = [...new Set(managers)];
    expect(managers.length).toBe(uniqueManagers.length);
  });
});
