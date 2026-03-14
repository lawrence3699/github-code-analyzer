import { spawn } from 'child_process';
import { tmpdir } from 'os';

const CLI_MODEL = 'claude-haiku-4-5-20251001';
const CLI_TIMEOUT_MS = 120_000;

interface ClaudeCliEnvelope {
  readonly type: string;
  readonly subtype?: string;
  readonly result?: string;
  readonly is_error?: boolean;
}

/**
 * Strips triple-backtick markdown fences from a string.
 * Handles both ```json ... ``` and plain ``` ... ``` variants.
 */
function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(fencePattern);
  return match ? match[1].trim() : trimmed;
}

/**
 * Extracts the actual AI response text from the Claude CLI JSON envelope.
 *
 * Claude CLI with `--output-format json` wraps the response in:
 *   {"type":"result","result":"<actual text>","is_error":false,...}
 *
 * If the output is not a recognised envelope (e.g. plain text), the trimmed
 * raw string is returned unchanged so callers can still attempt to use it.
 *
 * Throws if `is_error` is true inside the envelope.
 */
function extractResultFromCliOutput(raw: string): string {
  const trimmed = raw.trim();

  try {
    const envelope = JSON.parse(trimmed) as ClaudeCliEnvelope;
    if (envelope.type === 'result' && typeof envelope.result === 'string') {
      if (envelope.is_error) {
        throw new Error(`Claude CLI returned an error: ${envelope.result}`);
      }
      return envelope.result;
    }
  } catch (e) {
    // Re-throw errors that we deliberately raised above
    if (e instanceof Error && e.message.startsWith('Claude CLI returned an error')) {
      throw e;
    }
    // stdout was not a CLI envelope — fall through and return the raw text
  }

  return trimmed;
}

/**
 * Spawns the Claude CLI, sends `prompt` via stdin, and resolves with the
 * cleaned response string extracted from the CLI JSON envelope.
 *
 * - Deletes `CLAUDECODE` from the environment to allow nested invocation.
 * - Runs from `os.tmpdir()` to avoid UTF-8 path issues.
 * - Times out after 120 seconds.
 * - Strips markdown fences from the extracted result before returning.
 */
export function callClaudeCli(prompt: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    const proc = spawn(
      'claude',
      ['-p', '--model', CLI_MODEL, '--output-format', 'json'],
      {
        timeout: CLI_TIMEOUT_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        cwd: tmpdir(),
      },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `Claude CLI exited with code ${code}: ${stderr || stdout || 'Unknown error'}`,
          ),
        );
        return;
      }

      try {
        const aiText = extractResultFromCliOutput(stdout);
        const cleaned = stripMarkdownFences(aiText);
        resolve(cleaned);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`Claude CLI error: ${msg}`));
      }
    });

    proc.on('error', (err: Error) => {
      reject(
        new Error(
          `Failed to start Claude CLI: ${err.message}. Is 'claude' installed and in PATH?`,
        ),
      );
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/**
 * Parses a raw string (typically the output of `callClaudeCli`) as JSON of
 * type `T`.  Strips markdown fences before parsing when present.
 *
 * Throws a descriptive error if JSON parsing fails.
 */
export function parseClaudeJsonResponse<T>(raw: string): T {
  const cleaned = stripMarkdownFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse Claude CLI JSON response: ${msg}. Input starts with: "${raw.slice(0, 200)}"`,
    );
  }
}
