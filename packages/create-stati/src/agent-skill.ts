import { spawnProcess } from './utils/index.js';

/**
 * Values accepted by `--agent-skill`.
 * - claude: `.claude/skills`, discovered by Claude Code and GitHub Copilot in VS Code
 * - agents: `.agents/skills`, discovered by Copilot, Codex, Cursor and other agents
 * - github: kept so existing scripts don't break; installs like `agents`
 */
export const AGENT_SKILL_TARGETS = ['claude', 'agents', 'github'] as const;
export type AgentSkillTarget = (typeof AGENT_SKILL_TARGETS)[number];

/**
 * The `skills` CLI version used to install the skill. Pinned to a major version so a
 * release with different flags can't break scaffolding.
 */
export const SKILLS_CLI_PACKAGE = 'skills@1';

/** Repository the skill is installed from. No ref, so `npx skills update` can update it. */
export const SKILL_SOURCE = 'ianchak/stati';
export const SKILL_NAME = 'stati';

/** How long the `skills` CLI may take to clone the repository and copy the skill */
export const SKILL_INSTALL_TIMEOUT = 2 * 60 * 1000;

/** The `skills` CLI agent each target installs for */
export const SKILLS_AGENTS: Record<AgentSkillTarget, string> = {
  claude: 'claude-code',
  agents: 'universal',
  github: 'universal',
};

/** Project-relative directory the `skills` CLI installs to for each target */
export const AGENT_SKILL_DIRS: Record<AgentSkillTarget, string> = {
  claude: '.claude/skills/stati',
  agents: '.agents/skills/stati',
  github: '.agents/skills/stati',
};

/** Command that updates an installed skill */
export const SKILL_UPDATE_COMMAND = `npx skills update ${SKILL_NAME} -p`;

/**
 * Validate that a string is a valid agent skill target
 */
export function isValidAgentSkillTarget(value: string): value is AgentSkillTarget {
  return AGENT_SKILL_TARGETS.includes(value as AgentSkillTarget);
}

/**
 * The command to add the skill later, shown when create-stati couldn't install it
 */
export function skillAddCommand(target: AgentSkillTarget): string {
  return `npx skills add ${SKILL_SOURCE} --skill ${SKILL_NAME} -a ${SKILLS_AGENTS[target]}`;
}

/**
 * Install the Stati skill into the project with the `skills` CLI. It copies plain files
 * (no symlinks) and records the source in `skills-lock.json`, so `npx skills update` can
 * update the skill later.
 *
 * @param targetDir - The project root directory
 * @param target - Where to install the skill
 * @returns The project-relative directory the skill was installed to
 * @throws Error if the CLI fails to start, exits with a non-zero code or times out
 */
export async function addAgentSkill(targetDir: string, target: AgentSkillTarget): Promise<string> {
  await spawnProcess(
    'npx',
    [
      '--yes',
      SKILLS_CLI_PACKAGE,
      'add',
      SKILL_SOURCE,
      '--skill',
      SKILL_NAME,
      '--agent',
      SKILLS_AGENTS[target],
      '--copy',
      '--yes',
    ],
    { cwd: targetDir, stdio: 'ignore', timeout: SKILL_INSTALL_TIMEOUT },
  );

  return AGENT_SKILL_DIRS[target];
}
