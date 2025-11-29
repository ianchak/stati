import { describe, it, expect } from 'vitest';
import { setupTypeScript } from '../src/typescript-processor.js';

describe('typescript-processor', () => {
  describe('setupTypeScript', () => {
    it('should return files Map with tsconfig.json and src/main.ts', () => {
      // Act
      const result = setupTypeScript();

      // Assert
      expect(result.files).toBeInstanceOf(Map);
      expect(result.files.size).toBe(2);
      expect(result.files.has('tsconfig.json')).toBe(true);
      expect(result.files.has('src/main.ts')).toBe(true);
    });

    it('should return correct devDependencies', () => {
      // Act
      const result = setupTypeScript();

      // Assert
      expect(result.devDependencies).toEqual({
        typescript: '^5.6.0',
      });
    });

    it('should return correct scripts', () => {
      // Act
      const result = setupTypeScript();

      // Assert
      expect(result.scripts).toEqual({
        typecheck: 'tsc --noEmit',
      });
    });

    it('should generate valid JSON for tsconfig.json', () => {
      // Act
      const result = setupTypeScript();
      const tsconfigContent = result.files.get('tsconfig.json');

      // Assert - should be valid JSON
      expect(tsconfigContent).toBeDefined();
      expect(() => JSON.parse(tsconfigContent as string)).not.toThrow();

      // Verify structure
      const tsconfig = JSON.parse(tsconfigContent as string);
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.include).toBeDefined();
    });

    it('should generate tsconfig with correct compiler options', () => {
      // Act
      const result = setupTypeScript();
      const tsconfigContent = result.files.get('tsconfig.json') as string;
      const tsconfig = JSON.parse(tsconfigContent);

      // Assert - verify required compiler options
      expect(tsconfig.compilerOptions.target).toBe('ES2022');
      expect(tsconfig.compilerOptions.module).toBe('ESNext');
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
      expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
      expect(tsconfig.compilerOptions.noEmit).toBe(true);
      expect(tsconfig.compilerOptions.lib).toContain('ES2022');
      expect(tsconfig.compilerOptions.lib).toContain('DOM');
      expect(tsconfig.compilerOptions.lib).toContain('DOM.Iterable');
    });

    it('should generate tsconfig with correct include pattern', () => {
      // Act
      const result = setupTypeScript();
      const tsconfigContent = result.files.get('tsconfig.json') as string;
      const tsconfig = JSON.parse(tsconfigContent);

      // Assert
      expect(tsconfig.include).toEqual(['src/**/*.ts']);
    });

    it('should generate valid TypeScript for main.ts', () => {
      // Act
      const result = setupTypeScript();
      const mainTsContent = result.files.get('src/main.ts');

      // Assert - should be a non-empty string
      expect(mainTsContent).toBeDefined();
      expect(typeof mainTsContent).toBe('string');
      expect((mainTsContent as string).length).toBeGreaterThan(0);
    });

    it('should include console.log in main.ts', () => {
      // Act
      const result = setupTypeScript();
      const mainTsContent = result.files.get('src/main.ts') as string;

      // Assert
      expect(mainTsContent).toContain('console.log');
    });

    it('should include DOMContentLoaded event listener in main.ts', () => {
      // Act
      const result = setupTypeScript();
      const mainTsContent = result.files.get('src/main.ts') as string;

      // Assert
      expect(mainTsContent).toContain('DOMContentLoaded');
      expect(mainTsContent).toContain('addEventListener');
    });

    it('should include helpful comments in main.ts', () => {
      // Act
      const result = setupTypeScript();
      const mainTsContent = result.files.get('src/main.ts') as string;

      // Assert - should have some comments
      expect(mainTsContent).toContain('//');
    });
  });
});
