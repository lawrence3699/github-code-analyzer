import type { FunctionLocation } from '../types/ai';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LINES = 200;
const HEAD_LINES = 100;
const TAIL_LINES = 100;
const TRUNCATION_MARKER = '... (省略)';

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const EXTENSION_MAP: Readonly<Record<string, string>> = {
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  py: 'python',
  go: 'go',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
};

export function detectLanguageFromPath(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filePath.length - 1) {
    return 'unknown';
  }
  const ext = filePath.slice(lastDot + 1).toLowerCase();
  return EXTENSION_MAP[ext] ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Regex pattern builders
// ---------------------------------------------------------------------------

function escapeRegex(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type PatternEntry = {
  readonly pattern: RegExp;
};

function buildPatterns(name: string, language: string): readonly PatternEntry[] | null {
  const n = escapeRegex(name);

  switch (language) {
    case 'c':
    case 'cpp':
      return [
        { pattern: new RegExp(`^\\s*(static\\s+)?\\w[\\w\\s*]+\\b${n}\\s*\\(`, 'm') },
      ];

    case 'python':
      return [
        { pattern: new RegExp(`^([ \\t]*)(async\\s+)?def\\s+${n}\\s*\\(`, 'm') },
      ];

    case 'go':
      return [
        { pattern: new RegExp(`^\\s*func\\s+(\\(\\w+\\s+\\*?\\w+\\)\\s+)?${n}\\s*\\(`, 'm') },
      ];

    case 'java':
      return [
        { pattern: new RegExp(`^\\s*(public|private|protected|static|\\s)+[\\w<>\\[\\]]+\\s+${n}\\s*\\(`, 'm') },
      ];

    case 'kotlin':
      return [
        { pattern: new RegExp(`^\\s*(public|private|protected|static|\\s)*fun\\s+${n}\\s*\\(`, 'm') },
      ];

    case 'javascript':
    case 'typescript':
      return [
        { pattern: new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${n}`, 'm') },
        { pattern: new RegExp(`^\\s*(export\\s+)?(const|let|var)\\s+${n}\\s*[=:]`, 'm') },
      ];

    case 'rust':
      return [
        { pattern: new RegExp(`^\\s*(pub\\s+)?(async\\s+)?fn\\s+${n}`, 'm') },
      ];

    case 'ruby':
      return [
        { pattern: new RegExp(`^([ \\t]*)def\\s+${n}`, 'm') },
      ];

    case 'php':
      return [
        { pattern: new RegExp(`^\\s*(public|private|protected|static|\\s)*function\\s+${n}\\s*\\(`, 'm') },
      ];

    case 'swift':
      return [
        { pattern: new RegExp(`^\\s*(public|private|internal|fileprivate|open|\\s)*(static\\s+)?func\\s+${n}`, 'm') },
      ];

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Body extraction helpers
// ---------------------------------------------------------------------------

type BodyStrategy = 'brace' | 'indent';

function getBodyStrategy(language: string): BodyStrategy | null {
  switch (language) {
    case 'c':
    case 'cpp':
    case 'java':
    case 'go':
    case 'rust':
    case 'javascript':
    case 'typescript':
    case 'kotlin':
    case 'swift':
    case 'php':
      return 'brace';
    case 'python':
    case 'ruby':
      return 'indent';
    default:
      return null;
  }
}

/**
 * Extract the opening indentation (spaces/tabs) from a line.
 */
function lineIndent(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === ' ') {
      count += 1;
    } else if (ch === '\t') {
      count += 4; // treat tab as 4 spaces for comparison purposes
    } else {
      break;
    }
  }
  return count;
}

/**
 * Extract a function body using brace nesting (C-family, Go, Rust, JS/TS, Kotlin, Swift, PHP).
 * Returns the source lines (inclusive) from startLineIndex to endLineIndex.
 * If no opening brace is found (e.g. single-line arrow functions), returns just
 * the definition line.
 */
function extractBraceBody(
  sourceLines: readonly string[],
  defLineIndex: number,
): readonly string[] | null {
  let depth = 0;
  let started = false;

  for (let i = defLineIndex; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    for (const ch of line) {
      if (ch === '{') {
        depth += 1;
        started = true;
      } else if (ch === '}') {
        depth -= 1;
      }
    }
    if (started && depth === 0) {
      return sourceLines.slice(defLineIndex, i + 1);
    }
  }

  // No braces found — treat the definition line as a single-line body (e.g. arrow functions)
  if (!started) {
    return [sourceLines[defLineIndex]];
  }

  return null;
}

/**
 * Extract a function body using indentation (Python, Ruby).
 * The body is everything after the def line whose indentation is strictly
 * greater than that of the def line, until we see a line with indent <= def indent
 * (ignoring blank lines at the boundary).
 */
function extractIndentBody(
  sourceLines: readonly string[],
  defLineIndex: number,
): readonly string[] {
  const defIndent = lineIndent(sourceLines[defLineIndex]);
  const result: string[] = [sourceLines[defLineIndex]];

  for (let i = defLineIndex + 1; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    const isBlank = line.trim().length === 0;

    if (!isBlank && lineIndent(line) <= defIndent) {
      break;
    }
    result.push(line);
  }

  // Trim trailing blank lines from the result
  while (result.length > 1 && result[result.length - 1].trim().length === 0) {
    result.pop();
  }

  return result;
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

function applyTruncation(bodyLines: readonly string[]): {
  readonly code: string;
  readonly truncated: boolean;
} {
  if (bodyLines.length <= MAX_LINES) {
    return { code: bodyLines.join('\n'), truncated: false };
  }

  const head = bodyLines.slice(0, HEAD_LINES);
  const tail = bodyLines.slice(bodyLines.length - TAIL_LINES);
  const code = [...head, TRUNCATION_MARKER, ...tail].join('\n');
  return { code, truncated: true };
}

// ---------------------------------------------------------------------------
// Main locator
// ---------------------------------------------------------------------------

/**
 * Search source code for a function definition and return its location.
 * Returns null if the function is not found or the language is unsupported.
 */
export function locateFunctionInSource(
  source: string,
  functionName: string,
  language: string,
  filePath: string = '',
): FunctionLocation | null {
  if (!source || !functionName) {
    return null;
  }

  const patterns = buildPatterns(functionName, language);
  if (patterns === null) {
    return null;
  }

  const strategy = getBodyStrategy(language);
  if (strategy === null) {
    return null;
  }

  const sourceLines = source.split('\n');

  for (const { pattern } of patterns) {
    const matchResult = findFirstMatch(source, pattern);
    if (matchResult === null) {
      continue;
    }

    const { lineIndex } = matchResult;
    let bodyLines: readonly string[] | null;

    if (strategy === 'brace') {
      bodyLines = extractBraceBody(sourceLines, lineIndex);
    } else {
      bodyLines = extractIndentBody(sourceLines, lineIndex);
    }

    if (bodyLines === null || bodyLines.length === 0) {
      continue;
    }

    const startLine = lineIndex + 1; // 1-based
    const endLine = startLine + bodyLines.length - 1;
    const { code, truncated } = applyTruncation(bodyLines);

    return {
      filePath,
      startLine,
      endLine,
      code,
      truncated,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Match helper — find which line in the source a regex first matches
// ---------------------------------------------------------------------------

function findFirstMatch(
  source: string,
  pattern: RegExp,
): { readonly lineIndex: number } | null {
  const match = pattern.exec(source);
  if (match === null) {
    return null;
  }

  // The pattern uses `^\s*` which in multiline mode can match a leading newline
  // from the end of the previous line. Advance past any such leading newlines
  // so that lineIndex points to the actual definition line.
  let idx = match.index;
  while (idx < source.length && (source[idx] === '\n' || source[idx] === '\r')) {
    idx += 1;
  }

  const before = source.slice(0, idx);
  const lineIndex = (before.match(/\n/g) ?? []).length;

  return { lineIndex };
}
