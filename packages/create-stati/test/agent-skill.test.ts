import { describe, it, expect } from 'vitest';
import {
  AGENT_SKILL_DIRS,
  AGENT_SKILL_TARGETS,
  SKILLS_AGENTS,
  isValidAgentSkillTarget,
  skillAddCommand,
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

  it('should build the command to add the skill later', () => {
    expect(skillAddCommand('claude')).toBe(
      'npx skills add ianchak/stati --skill stati -a claude-code',
    );
    expect(skillAddCommand('github')).toBe(
      'npx skills add ianchak/stati --skill stati -a universal',
    );
  });
});
