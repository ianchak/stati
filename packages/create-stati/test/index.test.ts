import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArgs, runCLI } from '../src/index.js';

// Mock external dependencies
const mockInquirer = vi.hoisted(() => ({
  prompt: vi.fn(),
}));

const mockCreateSite = vi.hoisted(() => vi.fn());

// Mock picocolors
const mockPicocolors = vi.hoisted(() => ({
  bold: vi.fn((text) => text),
  blue: vi.fn((text) => text),
  cyan: vi.fn((text) => text),
  dim: vi.fn((text) => text),
  green: vi.fn((text) => text),
  yellow: vi.fn((text) => text),
  red: vi.fn((text) => text),
}));

vi.mock('inquirer', () => ({
  default: mockInquirer,
}));

vi.mock('../src/create.js', () => ({
  createSite: mockCreateSite,
}));

vi.mock('picocolors', () => ({
  default: mockPicocolors,
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('create-stati CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('parseArgs', () => {
    it('should return null when --help flag is provided', async () => {
      const result = await parseArgs(['--help']);
      expect(result).toBeNull();
      // Help message is displayed to console but we're mainly testing the return value
    });

    it('should return null when -h flag is provided', async () => {
      const result = await parseArgs(['-h']);
      expect(result).toBeNull();
      // Help message is displayed to console but we're mainly testing the return value
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

    it('should parse git initialization flags', async () => {
      const result1 = await parseArgs(['test-project', '--git']);
      const result2 = await parseArgs(['test-project', '--no-git']);

      expect(result1).toEqual(
        expect.objectContaining({
          gitInit: true,
        }),
      );

      expect(result2).toEqual(
        expect.objectContaining({
          gitInit: false,
        }),
      );
    });

    it('should parse dependency installation flags', async () => {
      const result1 = await parseArgs(['test-project', '--install']);
      const result2 = await parseArgs(['test-project', '--no-install']);

      expect(result1).toEqual(
        expect.objectContaining({
          installDependencies: true,
        }),
      );

      expect(result2).toEqual(
        expect.objectContaining({
          installDependencies: false,
        }),
      );
    });

    it('should parse multiple arguments correctly', async () => {
      const result = await parseArgs([
        'my-awesome-site',
        '--styling=sass',
        '--no-git',
        '--install',
        '--template=blank',
      ]);

      expect(result).toEqual({
        projectName: 'my-awesome-site',
        styling: 'sass',
        gitInit: false,
        installDependencies: true,
        template: 'blank',
      });
    });

    it('should return empty object for no arguments', async () => {
      const result = await parseArgs([]);

      expect(result).toEqual({});
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
  });
});
