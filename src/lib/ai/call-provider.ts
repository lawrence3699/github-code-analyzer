import { spawn } from 'child_process';
import { tmpdir } from 'os';

const CLI_TIMEOUT_MS = 120_000;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

type ProviderKind = 'claude' | 'codex';

// ---------------------------------------------------------------------------
// Output extractors
// ---------------------------------------------------------------------------

interface ClaudeCliEnvelope {
  readonly type: string;
  readonly result?: string;
  readonly is_error?: boolean;
}

function extractFromClaudeOutput(raw: string): string {
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
    if (e instanceof Error && e.message.startsWith('Claude CLI returned an error')) {
      throw e;
    }
  }
  return trimmed;
}

function extractFromCodexOutput(raw: string): string {
  const lines = raw.trim().split('\n');
  let lastAgentText = '';

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.type === 'item.completed') {
        const item = event.item as Record<string, unknown> | undefined;
        if (item && item.type === 'agent_message' && typeof item.text === 'string') {
          lastAgentText = item.text;
        }
      }
    } catch {
      // Not valid JSON line, skip
    }
  }

  return lastAgentText || raw.trim();
}

// ---------------------------------------------------------------------------
// Markdown fence stripper
// ---------------------------------------------------------------------------

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(fencePattern);
  return match ? match[1].trim() : trimmed;
}

// ---------------------------------------------------------------------------
// Resolve provider
// ---------------------------------------------------------------------------

function resolveProvider(): ProviderKind {
  const envVal = process.env.AI_PROVIDER;
  if (envVal === 'codex') return 'codex';
  return 'claude';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calls the appropriate CLI based on AI_PROVIDER env var and returns the
 * cleaned response text (markdown fences stripped).
 */
export function callProviderCli(prompt: string): Promise<string> {
  const provider = resolveProvider();

  return new Promise<string>((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    const command = provider === 'codex' ? 'codex' : 'claude';
    const args =
      provider === 'codex'
        ? ['exec', '--json', '--skip-git-repo-check', '-']
        : ['-p', '--model', CLAUDE_MODEL, '--output-format', 'json'];

    const proc = spawn(command, args, {
      timeout: CLI_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: tmpdir(),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code !== 0 && (provider !== 'codex' || !stdout.trim())) {
        reject(
          new Error(
            `${command} CLI exited with code ${code}: ${stderr || stdout || 'Unknown error'}`,
          ),
        );
        return;
      }

      try {
        const aiText =
          provider === 'codex'
            ? extractFromCodexOutput(stdout)
            : extractFromClaudeOutput(stdout);
        const cleaned = stripMarkdownFences(aiText);
        resolve(cleaned);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`${command} CLI error: ${msg}`));
      }
    });

    proc.on('error', (err: Error) => {
      reject(
        new Error(
          `Failed to start ${command} CLI: ${err.message}. Is '${command}' installed and in PATH?`,
        ),
      );
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/**
 * Parses a raw string as JSON of type T, stripping markdown fences first.
 */
export function parseProviderJsonResponse<T>(raw: string): T {
  const cleaned = stripMarkdownFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse CLI JSON response: ${msg}. Input starts with: "${raw.slice(0, 200)}"`,
    );
  }
}
