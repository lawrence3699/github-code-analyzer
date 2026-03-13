/**
 * Key configuration/entry files whose content is sent to the AI
 * for higher-quality analysis. These are "signal-rich" files that
 * reveal the tech stack, dependencies, and project structure.
 */

/** Maximum total bytes of key file content to send to AI */
export const MAX_CONTENT_BYTES = 30_000;

/** Maximum number of key files to fetch */
export const MAX_KEY_FILES = 15;

/** Maximum lines to include from README files */
export const MAX_README_LINES = 100;

/**
 * Exact file names (case-insensitive) that are always key files.
 */
const EXACT_NAMES: ReadonlySet<string> = new Set([
  'package.json',
  'cargo.toml',
  'pyproject.toml',
  'go.mod',
  'go.sum',
  'build.gradle',
  'build.gradle.kts',
  'pom.xml',
  'gemfile',
  'requirements.txt',
  'composer.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'next.config.js',
  'next.config.ts',
  'next.config.mjs',
  'vite.config.ts',
  'vite.config.js',
  'webpack.config.js',
  'webpack.config.ts',
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'makefile',
  '.env.example',
  'setup.py',
  'setup.cfg',
  'mix.exs',
  'pubspec.yaml',
  'deno.json',
  'bun.lockb',
]);

/**
 * Path patterns that indicate a key file (matched against the full path).
 */
const PATH_PATTERNS: readonly RegExp[] = [
  /^\.github\/workflows\/[^/]+\.ya?ml$/i,
  /^readme\.md$/i,
  /^readme$/i,
];

/**
 * Checks whether a file path is a "key file" whose content
 * should be sent to the AI for better analysis quality.
 */
export function isKeyFile(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase() ?? '';

  if (EXACT_NAMES.has(name)) return true;

  for (const pattern of PATH_PATTERNS) {
    if (pattern.test(path)) return true;
  }

  return false;
}

/**
 * Selects key file paths from a list, respecting the max file count.
 */
export function selectKeyFiles(filePaths: readonly string[]): readonly string[] {
  const selected: string[] = [];

  for (const path of filePaths) {
    if (selected.length >= MAX_KEY_FILES) break;
    if (isKeyFile(path)) {
      selected.push(path);
    }
  }

  return selected;
}
