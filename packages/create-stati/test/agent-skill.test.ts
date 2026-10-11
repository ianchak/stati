import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, access } from 'node:fs/promises';
import {
  AGENT_SKILL_DIRS,
  AGENT_SKILL_TARGETS,
  copyAgentSkill,
  getSkillSourceDir,
  isValidAgentSkillTarget,
} from '../src/agent-skill.js';

// Wrap the real implementation so tests can simulate the published package layout
vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('node:fs');
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

describe('agent skill', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-skill-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should resolve a source directory containing SKILL.md', async () => {
    await expect(access(join(getSkillSourceDir(), 'SKILL.md'))).resolves.not.toThrow();
  });

  it('should prefer the published skill directory and fail clearly when it has no skill', async () => {
    // Pretend the published dist/skills/stati exists next to the module
    vi.mocked(existsSync).mockReturnValueOnce(true);
    const sourceDir = getSkillSourceDir();
    expect(sourceDir).toBe(join(__dirname, '..', 'src', 'skills', 'stati'));

    // Next lookup also resolves to that (non-existent under src/) directory
    vi.mocked(existsSync).mockReturnValueOnce(true);
    await expect(copyAgentSkill(tempDir, 'claude')).rejects.toThrow(
      `Stati agent skill not found at ${sourceDir}`,
    );
  });

  it('should validate agent skill targets', () => {
    expect(isValidAgentSkillTarget('claude')).toBe(true);
    expect(isValidAgentSkillTarget('github')).toBe(true);
    expect(isValidAgentSkillTarget('agents')).toBe(true);
    expect(isValidAgentSkillTarget('cursor')).toBe(false);
    expect(isValidAgentSkillTarget('')).toBe(false);
  });

  it.each(AGENT_SKILL_TARGETS)('should copy the whole bundle for target %s', async (target) => {
    const relativeDir = await copyAgentSkill(tempDir, target);
    expect(relativeDir).toBe(AGENT_SKILL_DIRS[target]);

    const skillDir = join(tempDir, relativeDir);
    for (const file of [
      'SKILL.md',
      'LICENSE',
      join('references', 'eta.md'),
      join('assets', 'starter', 'stati.config.js'),
      join('scripts', 'smoke-test.mjs'),
    ]) {
      await expect(access(join(skillDir, file))).resolves.not.toThrow();
    }

    // Must not be nested as stati/stati
    await expect(access(join(skillDir, 'stati'))).rejects.toThrow();
  });
});
