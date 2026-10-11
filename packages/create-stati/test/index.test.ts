import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArgs, runCLI } from '../src/index.js';

// Mock external dependencies
const mockInquirer = vi.hoisted(() => ({
  prompt: vi.fn(),
}));

const mockCreateSite = vi.hoisted(() => vi.fn());
const mockDetectAvailablePackageManagers = vi.hoisted(() => vi.fn());

vi.mock('inquirer', () => ({
  default: mockInquirer,
}));

vi.mock('../src/create.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../src/create.js');
  return {
    ...actual,
    createSite: mockCreateSite,
    detectAvailablePackageManagers: mockDetectAvailablePackageManagers,
  };
});

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('create-stati CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockDetectAvailablePackageManagers.mockResolvedValue(['npm']); // Default to npm only
  });

  describe('parseArgs', () => {
    it('should return null when --help flag is provided', async () => {
      const result = await parseArgs(['--help']);
      expect(result).toBeNull();
    });

    it('should return null when -h flag is provided', async () => {
      const result = await parseArgs(['-h']);
      expect(result).toBeNull();
    });

    it('should parse project name from arguments', async () => {
      const result = await parseArgs(['my-test-project']);

      expect(result).toEqual(
        expect.objectContaining({
          projectName: 'my-test-project',
        }),
      );
    });

    it('should parse styling option from arguments', async () => {
      const result = await parseArgs(['test-project', '--styling=sass']);

      expect(result).toEqual(
        expect.objectContaining({
          projectName: 'test-project',
          styling: 'sass',
        }),
      );
    });

    it('should parse styling option with space separator', async () => {
      const result = await parseArgs(['test-project', '--styling', 'tailwind']);

      expect(result).toEqual(
        expect.objectContaining({
          projectName: 'test-project',
          styling: 'tailwind',
        }),
      );
    });

    it('should parse git initialization flag', async () => {
      const result = await parseArgs(['test-project', '--no-git']);

      expect(result).toEqual(
        expect.objectContaining({
          gitInit: false,
        }),
      );
    });

    it('should parse install flags', async () => {
      const result = await parseArgs(['test-project', '--no-install']);

      expect(result).toEqual(
        expect.objectContaining({
          install: false,
        }),
      );
    });

    it('should parse package-manager flag', async () => {
      const result1 = await parseArgs(['test-project', '--package-manager=pnpm']);
      const result2 = await parseArgs(['test-project', '--package-manager', 'yarn']);

      expect(result1).toEqual(
        expect.objectContaining({
          packageManager: 'pnpm',
        }),
      );

      expect(result2).toEqual(
        expect.objectContaining({
          packageManager: 'yarn',
        }),
      );
    });

    it('should parse multiple arguments correctly', async () => {
      const result = await parseArgs([
        'my-awesome-site',
        '--styling=sass',
        '--no-git',
        '--template=blank',
        '--package-manager=pnpm',
      ]);

      expect(result).toEqual({
        projectName: 'my-awesome-site',
        styling: 'sass',
        gitInit: false,
        template: 'blank',
        packageManager: 'pnpm',
      });
    });

    it('should parse --typescript flag', async () => {
      const result = await parseArgs(['test-project', '--typescript']);

      expect(result).toEqual(
        expect.objectContaining({
          projectName: 'test-project',
          typescript: true,
        }),
      );
    });

    it('should parse --ts flag as typescript', async () => {
      const result = await parseArgs(['test-project', '--ts']);

      expect(result).toEqual(
        expect.objectContaining({
          projectName: 'test-project',
          typescript: true,
        }),
      );
    });

    it('should return empty object for no arguments', async () => {
      const result = await parseArgs([]);

      expect(result).toEqual({});
    });

    it('should default --agent-skill to claude', async () => {
      const result = await parseArgs(['test-project', '--agent-skill']);

      expect(result).toEqual({ projectName: 'test-project', agentSkill: 'claude' });
    });

    it('should parse --agent-skill with = and space separators', async () => {
      const result1 = await parseArgs(['test-project', '--agent-skill=github']);
      const result2 = await parseArgs(['test-project', '--agent-skill', 'agents']);

      expect(result1).toEqual({ projectName: 'test-project', agentSkill: 'github' });
      expect(result2).toEqual({ projectName: 'test-project', agentSkill: 'agents' });
    });

    it('should not consume a project name following bare --agent-skill', async () => {
      const result = await parseArgs(['--agent-skill', 'my-site']);

      expect(result).toEqual({ projectName: 'my-site', agentSkill: 'claude' });
    });

    it('should parse --no-agent-skill flag', async () => {
      const result = await parseArgs(['test-project', '--no-agent-skill']);

      expect(result).toEqual({ projectName: 'test-project', agentSkill: false });
    });

    it('should exit with error for invalid agent skill target', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      await expect(parseArgs(['test-project', '--agent-skill=cursor'])).rejects.toThrow(
        'process.exit: 1',
      );

      mockExit.mockRestore();
    });

    it('should exit with error for invalid space-separated target after project name', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      await expect(parseArgs(['test-project', '--agent-skill', 'cursor'])).rejects.toThrow(
        'process.exit: 1',
      );

      mockExit.mockRestore();
    });

    it('should not consume a following flag as the agent skill target', async () => {
      const result = await parseArgs(['test-project', '--agent-skill', '--no-git']);

      expect(result).toEqual({ projectName: 'test-project', agentSkill: 'claude', gitInit: false });
    });
  });

  describe('runCLI', () => {
    beforeEach(() => {
      mockCreateSite.mockResolvedValue({
        projectName: 'test-project',
        targetDir: './test-project',
      });
    });

    it('should return early when options is null (help shown)', async () => {
      await runCLI(null);

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockCreateSite).not.toHaveBeenCalled();
    });

    it('should prompt for missing project name', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        name: 'prompted-project',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        install: false, // Don't install to avoid package manager prompts
      });

      await runCLI({});

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      expect(prompts?.some((p: { name: string }) => p.name === 'name')).toBe(true);
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'prompted-project',
        }),
      );
    });

    it('should prompt for missing template', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        template: 'blank',
        styling: 'css',
        gitInit: true,
        install: false,
      });

      await runCLI({ projectName: 'test-project' });

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      expect(prompts?.some((p: { name: string }) => p.name === 'template')).toBe(true);
    });

    it('should prompt for missing styling option', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        styling: 'sass',
        gitInit: true,
        install: false,
      });

      await runCLI({ projectName: 'test-project', template: 'blank' });

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      expect(prompts?.some((p: { name: string }) => p.name === 'styling')).toBe(true);
    });

    it('should prompt for gitInit when undefined', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        gitInit: false,
        install: false,
      });

      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
      });

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      expect(prompts?.some((p: { name: string }) => p.name === 'gitInit')).toBe(true);
    });

    it('should prompt for install when undefined', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        install: false,
      });

      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
      });

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      expect(prompts?.some((p: { name: string }) => p.name === 'install')).toBe(true);
    });

    it('should use provided CLI options without prompting', async () => {
      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: false,
      });

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockCreateSite).toHaveBeenCalledWith({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        typescript: false, // TypeScript defaults to false in non-interactive mode
        gitInit: false,
        install: false,
      });
    });

    it('should prompt for agent skill in interactive mode and pass it to createSite', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        styling: 'css',
        typescript: false,
        agentSkill: 'claude',
        gitInit: false,
        install: false,
      });

      await runCLI({ projectName: 'test-project', template: 'blank' });

      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts?.some((p: { name: string }) => p.name === 'agentSkill')).toBe(true);
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({ agentSkill: 'claude' }),
      );
    });

    it('should not pass agentSkill when user declines the prompt', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        styling: 'css',
        typescript: false,
        agentSkill: false,
        gitInit: false,
        install: false,
      });

      await runCLI({ projectName: 'test-project', template: 'blank' });

      expect(mockCreateSite.mock.calls[0]?.[0]).not.toHaveProperty('agentSkill');
    });

    it('should not prompt for agent skill in non-interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({ gitInit: false, install: false });

      await runCLI({ projectName: 'test-project', template: 'blank', styling: 'css' });

      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts?.some((p: { name: string }) => p.name === 'agentSkill')).toBe(false);
      expect(mockCreateSite.mock.calls[0]?.[0]).not.toHaveProperty('agentSkill');
    });

    it('should use --agent-skill flag without prompting for it', async () => {
      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: false,
        agentSkill: 'github',
      });

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({ agentSkill: 'github' }),
      );
    });

    it('should handle createSite errors gracefully', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      mockCreateSite.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        runCLI({
          projectName: 'test-project',
          template: 'blank',
          styling: 'css',
          gitInit: false,
          install: false,
        }),
      ).rejects.toThrow('process.exit: 1');

      mockExit.mockRestore();
    });

    it('should display next steps after successful creation', async () => {
      mockCreateSite.mockResolvedValueOnce({
        projectName: 'my-site',
        targetDir: './my-site',
      });

      await runCLI({
        projectName: 'my-site',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm', // Provide explicit package manager
      });

      expect(mockCreateSite).toHaveBeenCalled();
    });

    it('should show npm install step when install is false', async () => {
      mockCreateSite.mockResolvedValueOnce({
        projectName: 'my-site',
        targetDir: './my-site',
      });

      await runCLI({
        projectName: 'my-site',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: false,
      });

      expect(mockCreateSite).toHaveBeenCalled();
    });

    it('should report agent skill installation only when createSite reports it', async () => {
      const options = {
        projectName: 'my-site',
        template: 'blank' as const,
        styling: 'css' as const,
        gitInit: false,
        install: false,
        agentSkill: 'claude' as const,
      };
      // Local spy: restoreMocks undoes the file-level console.log spy between tests
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const loggedSkillMessage = () =>
        consoleLog.mock.calls.some(([msg]) => String(msg).includes('Stati agent skill installed'));

      // Copy failed: requested but no agentSkillDir in the result
      mockCreateSite.mockResolvedValueOnce({ projectName: 'my-site', targetDir: './my-site' });
      await runCLI(options);
      expect(loggedSkillMessage()).toBe(false);

      consoleLog.mockClear();
      mockCreateSite.mockResolvedValueOnce({
        projectName: 'my-site',
        targetDir: './my-site',
        agentSkillDir: '.claude/skills/stati',
      });
      await runCLI(options);
      expect(loggedSkillMessage()).toBe(true);
    });

    it('should validate project name in prompts', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        name: 'valid-name',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        install: false,
      });

      await runCLI({});

      expect(mockInquirer.prompt).toHaveBeenCalled();
      const prompts = mockInquirer.prompt.mock.calls[0]?.[0];
      expect(prompts).toBeDefined();
      const namePrompt = prompts?.find((p: { name: string }) => p.name === 'name');
      expect(namePrompt).toBeDefined();
      expect(namePrompt.validate).toBeDefined();

      // Test validation function
      expect(namePrompt.validate('valid-name')).toBe(true);
      expect(namePrompt.validate('')).toContain('required');
      expect(namePrompt.validate('Invalid Name')).toContain('valid npm package name');
    });
  });

  describe('runCLI - package manager selection', () => {
    beforeEach(() => {
      mockCreateSite.mockResolvedValue({
        projectName: 'test-project',
        targetDir: './test-project',
      });
    });

    it('should prompt for package manager when multiple are available in interactive mode', async () => {
      mockDetectAvailablePackageManagers.mockResolvedValueOnce(['npm', 'yarn', 'pnpm']);

      // First prompt for basic options
      mockInquirer.prompt.mockResolvedValueOnce({
        name: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        install: true,
      });

      // Second prompt for package manager
      mockInquirer.prompt.mockResolvedValueOnce({
        packageManager: 'yarn',
      });

      await runCLI({});

      expect(mockInquirer.prompt).toHaveBeenCalledTimes(2);
      const pmPrompt = mockInquirer.prompt.mock.calls[1]?.[0];
      expect(pmPrompt).toBeDefined();
      expect(pmPrompt?.some((p: { name: string }) => p.name === 'packageManager')).toBe(true);
    });

    it('should use provided package manager without prompting', async () => {
      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'pnpm',
      });

      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          packageManager: 'pnpm',
        }),
      );
    });

    it('should default to npm when install is false', async () => {
      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: false,
      });

      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.not.objectContaining({
          packageManager: expect.anything(),
        }),
      );
    });

    it('should use the single available manager without prompting', async () => {
      mockDetectAvailablePackageManagers.mockResolvedValueOnce(['npm']);

      mockInquirer.prompt.mockResolvedValueOnce({
        name: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        install: true,
      });

      await runCLI({});

      // Should only prompt once (not for package manager)
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          packageManager: 'npm',
        }),
      );
    });

    it('should default to npm in non-interactive mode when install is true', async () => {
      // Non-interactive: all options provided
      await runCLI({
        projectName: 'test-project',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        // No packageManager specified
      });

      // Should not prompt for anything
      expect(mockInquirer.prompt).not.toHaveBeenCalled();

      // Should use npm as default
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          packageManager: 'npm',
        }),
      );
    });
  });

  describe('parseArgs - error handling', () => {
    it('should exit with error for invalid package manager', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      await expect(parseArgs(['test-project', '--package-manager=invalid'])).rejects.toThrow(
        'process.exit: 1',
      );

      mockExit.mockRestore();
    });

    it('should exit with error for empty package manager value', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      await expect(parseArgs(['test-project', '--package-manager='])).rejects.toThrow(
        'process.exit: 1',
      );

      mockExit.mockRestore();
    });

    it('should exit with error for missing package manager value with space separator', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit: ${code}`);
        });

      await expect(parseArgs(['test-project', '--package-manager'])).rejects.toThrow(
        'process.exit: 1',
      );

      mockExit.mockRestore();
    });
  });
});
