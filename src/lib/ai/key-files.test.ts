import { isKeyFile, selectKeyFiles, MAX_KEY_FILES } from './key-files';

describe('isKeyFile', () => {
  it('should match exact config file names', () => {
    expect(isKeyFile('package.json')).toBe(true);
    expect(isKeyFile('Cargo.toml')).toBe(true);
    expect(isKeyFile('go.mod')).toBe(true);
    expect(isKeyFile('requirements.txt')).toBe(true);
    expect(isKeyFile('Dockerfile')).toBe(true);
    expect(isKeyFile('tsconfig.json')).toBe(true);
    expect(isKeyFile('next.config.ts')).toBe(true);
    expect(isKeyFile('docker-compose.yml')).toBe(true);
  });

  it('should match exact names case-insensitively', () => {
    expect(isKeyFile('PACKAGE.JSON')).toBe(true);
    expect(isKeyFile('Makefile')).toBe(true);
  });

  it('should match exact names in subdirectories', () => {
    expect(isKeyFile('packages/web/package.json')).toBe(true);
    expect(isKeyFile('backend/go.mod')).toBe(true);
  });

  it('should match GitHub workflow files', () => {
    expect(isKeyFile('.github/workflows/ci.yml')).toBe(true);
    expect(isKeyFile('.github/workflows/deploy.yaml')).toBe(true);
  });

  it('should match README.md at root', () => {
    expect(isKeyFile('README.md')).toBe(true);
    expect(isKeyFile('readme.md')).toBe(true);
  });

  it('should not match generic source files', () => {
    expect(isKeyFile('src/index.ts')).toBe(false);
    expect(isKeyFile('lib/utils.py')).toBe(false);
    expect(isKeyFile('main.go')).toBe(false);
    expect(isKeyFile('App.tsx')).toBe(false);
  });

  it('should not match deeply nested non-workflow files', () => {
    expect(isKeyFile('.github/ISSUE_TEMPLATE/bug.md')).toBe(false);
    expect(isKeyFile('docs/readme.md')).toBe(false);
  });
});

describe('selectKeyFiles', () => {
  it('should select key files from a list', () => {
    const paths = [
      'package.json',
      'src/index.ts',
      'tsconfig.json',
      'src/App.tsx',
      'README.md',
    ];
    const selected = selectKeyFiles(paths);
    expect(selected).toEqual(['package.json', 'tsconfig.json', 'README.md']);
  });

  it('should respect the maximum file count', () => {
    const paths = Array.from({ length: 30 }, (_, i) => `pkg${i}/package.json`);
    const selected = selectKeyFiles(paths);
    expect(selected.length).toBe(MAX_KEY_FILES);
  });

  it('should return empty array when no key files exist', () => {
    const paths = ['src/index.ts', 'lib/utils.py', 'main.go'];
    const selected = selectKeyFiles(paths);
    expect(selected).toEqual([]);
  });
});
