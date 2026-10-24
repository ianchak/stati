import { describe, it, expect } from 'vitest';
import {
  AGENT_SKILL_DIRS,
  AGENT_SKILL_TARGETS,
  SKILLS_AGENTS,
  SKILL_UPDATE_COMMAND,
  isValidAgentSkillTarget,
  skillAddCommand,
  skillsCliError,
} from '../src/agent-skill.js';

describe('agent skill', () => {
  it('should validate agent skill targets', () => {
    expect(isValidAgentSkillTarget('claude')).toBe(true);
    expect(isValidAgentSkillTarget('agents')).toBe(true);
    expect(isValidAgentSkillTarget('github')).toBe(true);
    expect(isValidAgentSkillTarget('cursor')).toBe(false);
    expect(isValidAgentSkillTarget('')).toBe(false);
  });

  it.each([
    ['claude', 'claude-code', '.claude/skills/stati'],
    ['agents', 'universal', '.agents/skills/stati'],
    ['github', 'universal', '.agents/skills/stati'],
  ] as const)('should map target %s to the %s agent in %s', (target, agent, dir) => {
    expect(SKILLS_AGENTS[target]).toBe(agent);
    expect(AGENT_SKILL_DIRS[target]).toBe(dir);
  });

  it('should cover every target in the mappings', () => {
    expect(Object.keys(SKILLS_AGENTS).sort()).toEqual([...AGENT_SKILL_TARGETS].sort());
    expect(Object.keys(AGENT_SKILL_DIRS).sort()).toEqual([...AGENT_SKILL_TARGETS].sort());
  });

  it('should build the commands to add and update the skill with the pinned CLI', () => {
    expect(skillAddCommand('claude')).toBe(
      'npx skills@1 add ianchak/stati --skill stati -a claude-code --copy -y',
    );
    expect(skillAddCommand('github')).toBe(
      'npx skills@1 add ianchak/stati --skill stati -a universal --copy -y',
    );
    expect(SKILL_UPDATE_COMMAND).toBe('npx skills@1 update stati -p');
  });

  describe('skillsCliError', () => {
    it('should return the first failure in the JSON output', () => {
      const stdout = JSON.stringify([
        { name: 'other', status: 'installed' },
        { status: 'failed', error: 'Failed to clone repository' },
      ]);
      expect(skillsCliError(stdout)).toBe('Failed to clone repository');
    });

    it('should return the reason for a skipped skill', () => {
      const stdout = JSON.stringify([
        { name: 'stati', status: 'skipped', reason: 'No matching skill found in source' },
      ]);
      expect(skillsCliError(stdout)).toBe('No matching skill found in source');
    });

    it.each([
      ['no output', ''],
      ['output that is not JSON', 'npm ERR! something'],
      ['JSON that is not a list', '{"status":"failed"}'],
      ['no failures', '[{"status":"installed"}]'],
      ['a failure without a message', '[{"status":"failed"}, null]'],
    ])('should return undefined for %s', (_, stdout) => {
      expect(skillsCliError(stdout)).toBeUndefined();
    });
  });
});
