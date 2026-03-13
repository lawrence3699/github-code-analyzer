import { buildSystemPrompt, buildUserPrompt } from './prompt-template';
import { MAX_README_LINES, MAX_CONTENT_BYTES } from './key-files';
import type { CodeFileInfo } from '../../types/ai';

describe('buildSystemPrompt', () => {
  it('should return a non-empty string', () => {
    const result = buildSystemPrompt();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should mention JSON in the prompt', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('JSON');
  });

  it('should mention the required schema fields', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('project_name');
    expect(result).toContain('primary_languages');
    expect(result).toContain('tech_stack');
    expect(result).toContain('entry_files');
    expect(result).toContain('summary');
  });

  it('should instruct no markdown fences', () => {
    const result = buildSystemPrompt();
    expect(result.toLowerCase()).toContain('no markdown');
  });

  it('should mention config files in the prompt', () => {
    const result = buildSystemPrompt();
    expect(result.toLowerCase()).toContain('config');
  });

  it('should mention key configuration file types', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('package.json');
    expect(result).toContain('go.mod');
    expect(result).toContain('Cargo.toml');
  });

  it('should instruct to use config file contents for tech stack', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('config file contents');
  });
});

describe('buildUserPrompt', () => {
  const files: CodeFileInfo[] = [
    { path: 'src/index.ts', name: 'index.ts', extension: '.ts' },
    { path: 'src/utils.ts', name: 'utils.ts', extension: '.ts' },
    { path: 'package.json', name: 'package.json', extension: '.json' },
  ];

  it('should include repository name', () => {
    const result = buildUserPrompt('my-project', files);
    expect(result).toContain('my-project');
  });

  it('should include file count', () => {
    const result = buildUserPrompt('my-project', files);
    expect(result).toContain('3');
  });

  it('should list all file paths', () => {
    const result = buildUserPrompt('my-project', files);
    expect(result).toContain('src/index.ts');
    expect(result).toContain('src/utils.ts');
    expect(result).toContain('package.json');
  });

  it('should handle empty file list', () => {
    const result = buildUserPrompt('empty-project', []);
    expect(result).toContain('empty-project');
    expect(result).toContain('0');
  });

  it('should be deterministic — same input produces same output', () => {
    const result1 = buildUserPrompt('my-project', files);
    const result2 = buildUserPrompt('my-project', files);
    expect(result1).toBe(result2);
  });

  describe('with fileContents', () => {
    it('should include file content in the output', () => {
      const fileContents = new Map<string, string>([
        ['package.json', '{"name": "test-project", "version": "1.0.0"}'],
        ['tsconfig.json', '{"compilerOptions": {"strict": true}}'],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('--- Key File Contents ---');
      expect(result).toContain('=== package.json ===');
      expect(result).toContain('{"name": "test-project", "version": "1.0.0"}');
      expect(result).toContain('=== tsconfig.json ===');
      expect(result).toContain('{"compilerOptions": {"strict": true}}');
    });

    it('should not include key file contents section when fileContents is empty', () => {
      const emptyMap = new Map<string, string>();

      const result = buildUserPrompt('my-project', files, emptyMap);

      expect(result).not.toContain('--- Key File Contents ---');
      expect(result).not.toContain('===');
    });

    it('should not include key file contents section when fileContents is undefined', () => {
      const result = buildUserPrompt('my-project', files, undefined);

      expect(result).not.toContain('--- Key File Contents ---');
    });

    it('should truncate README content beyond MAX_README_LINES', () => {
      const longReadmeLines = Array.from(
        { length: MAX_README_LINES + 50 },
        (_, i) => `Line ${i + 1} of the README`,
      );
      const longReadme = longReadmeLines.join('\n');

      const fileContents = new Map<string, string>([
        ['README.md', longReadme],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('=== README.md ===');
      expect(result).toContain('... (truncated)');
      // First line should be present
      expect(result).toContain('Line 1 of the README');
      // Line at MAX_README_LINES should be present
      expect(result).toContain(`Line ${MAX_README_LINES} of the README`);
      // Line beyond MAX_README_LINES should NOT be present
      expect(result).not.toContain(`Line ${MAX_README_LINES + 1} of the README`);
    });

    it('should not truncate README content within MAX_README_LINES', () => {
      const shortReadmeLines = Array.from(
        { length: MAX_README_LINES - 10 },
        (_, i) => `Line ${i + 1}`,
      );
      const shortReadme = shortReadmeLines.join('\n');

      const fileContents = new Map<string, string>([
        ['README.md', shortReadme],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('=== README.md ===');
      expect(result).not.toContain('... (truncated)');
      expect(result).toContain(`Line ${MAX_README_LINES - 10}`);
    });

    it('should apply README truncation case-insensitively', () => {
      const longReadmeLines = Array.from(
        { length: MAX_README_LINES + 20 },
        (_, i) => `readme line ${i + 1}`,
      );
      const longReadme = longReadmeLines.join('\n');

      const fileContents = new Map<string, string>([
        ['docs/Readme.md', longReadme],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('... (truncated)');
      expect(result).not.toContain(`readme line ${MAX_README_LINES + 1}`);
    });

    it('should cap total content at MAX_CONTENT_BYTES', () => {
      // Create content that exceeds MAX_CONTENT_BYTES across multiple files
      const largeContent = 'x'.repeat(MAX_CONTENT_BYTES + 5000);

      const fileContents = new Map<string, string>([
        ['package.json', largeContent],
        ['tsconfig.json', '{"strict": true}'],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      // The first file should be truncated to fit within MAX_CONTENT_BYTES
      expect(result).toContain('=== package.json ===');
      expect(result).toContain('... (truncated)');
    });

    it('should skip files once total byte budget is exhausted', () => {
      // Create a file that exactly uses up the entire byte budget
      const fullBudgetContent = 'a'.repeat(MAX_CONTENT_BYTES);

      const fileContents = new Map<string, string>([
        ['package.json', fullBudgetContent],
        ['tsconfig.json', '{"strict": true}'],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('=== package.json ===');
      // The second file should be skipped because budget is exhausted
      expect(result).not.toContain('=== tsconfig.json ===');
    });

    it('should include multiple files when within byte budget', () => {
      const smallContent1 = '{"name": "test"}';
      const smallContent2 = '{"strict": true}';

      const fileContents = new Map<string, string>([
        ['package.json', smallContent1],
        ['tsconfig.json', smallContent2],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('=== package.json ===');
      expect(result).toContain(smallContent1);
      expect(result).toContain('=== tsconfig.json ===');
      expect(result).toContain(smallContent2);
    });

    it('should still include the analyze instruction at the end', () => {
      const fileContents = new Map<string, string>([
        ['package.json', '{"name": "test"}'],
      ]);

      const result = buildUserPrompt('my-project', files, fileContents);

      expect(result).toContain('Analyze this repository and respond with the JSON analysis.');
    });
  });
});
