import { cp, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Locations where the Stati agent skill can be installed in a new project.
 * - claude: discovered by Claude Code and GitHub Copilot in VS Code
 * - github: discovered by GitHub Copilot
 * - agents: generic Agent Skills location
 */
export const AGENT_SKILL_TARGETS = ['claude', 'github', 'agents'] as const;
export type AgentSkillTarget = (typeof AGENT_SKILL_TARGETS)[number];

/**
 * Project-relative installation directory for each target.
 */
export const AGENT_SKILL_DIRS: Record<AgentSkillTarget, string> = {
  claude: '.claude/skills/stati',
  github: '.github/skills/stati',
  agents: '.agents/skills/stati',
};

/**
 * Validate that a string is a valid agent skill target
 */
export function isValidAgentSkillTarget(value: string): value is AgentSkillTarget {
  return AGENT_SKILL_TARGETS.includes(value as AgentSkillTarget);
}

/**
 * Resolve the directory containing the bundled Stati skill.
 * In published package: the skill is copied to dist/skills/stati during build.
 * In development: fall back to the monorepo's .github/skills/stati.
 */
export function getSkillSourceDir(): string {
  const publishedSkillDir = join(__dirname, 'skills', 'stati');
  if (existsSync(publishedSkillDir)) {
    return publishedSkillDir;
  }
  return join(__dirname, '..', '..', '..', '.github', 'skills', 'stati');
}

/**
 * Copy the whole Stati skill bundle into the project.
 *
 * @param targetDir - The project root directory
 * @param target - Where to install the skill
 * @returns The project-relative directory the skill was installed to
 */
export async function copyAgentSkill(targetDir: string, target: AgentSkillTarget): Promise<string> {
  const sourceDir = getSkillSourceDir();

  try {
    await stat(join(sourceDir, 'SKILL.md'));
  } catch {
    throw new Error(`Stati agent skill not found at ${sourceDir}`);
  }

  const relativeDir = AGENT_SKILL_DIRS[target];
  await cp(sourceDir, join(targetDir, relativeDir), { recursive: true });

  return relativeDir;
}
