import { spawn } from 'child_process';
import { tmpdir } from 'os';

import type { AIProvider, AIAnalysisResult, CodeFileInfo } from '../types';
import { buildSystemPrompt, buildUserPrompt } from '../prompt-template';

const CLI_MODEL = 'claude-haiku-4-5-20251001';
const CLI_TIMEOUT_MS = 120_000;

interface ClaudeCliJsonOutput {
  readonly type: string;
  readonly subtype?: string;
  readonly result?: string;
  readonly is_error?: boolean;
}

function extractResultFromCliOutput(raw: string): string {
  const trimmed = raw.trim();

  // --output-format json wraps response in { "type":"result", "result":"<actual text>", ... }
  try {
    const envelope = JSON.parse(trimmed) as ClaudeCliJsonOutput;
    if (envelope.type === 'result' && typeof envelope.result === 'string') {
      if (envelope.is_error) {
        throw new Error(`Claude CLI returned an error: ${envelope.result}`);
      }
      return envelope.result;
    }
  } catch (e) {
    // If it's our own thrown error, rethrow
    if (e instanceof Error && e.message.startsWith('Claude CLI returned an error')) {
      throw e;
    }
    // Not a CLI envelope — maybe raw text output, fall through
  }

  return trimmed;
}

async function analyzeViaCli(
  files: readonly CodeFileInfo[],
  repoName: string,
): Promise<AIAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(repoName, files);
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

  return new Promise<AIAnalysisResult>((resolve, reject) => {
    // Unset CLAUDECODE to allow nested CLI invocation from Next.js server
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

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr || stdout || 'Unknown error'}`));
        return;
      }

      try {
        // Extract the actual AI response from the CLI envelope
        const aiText = extractResultFromCliOutput(stdout);

        // Strip markdown fences if present
        let jsonStr = aiText.trim();
        const fenceMatch = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
        if (fenceMatch) {
          jsonStr = fenceMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr) as AIAnalysisResult;
        resolve(parsed);
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        reject(new Error(
          `Failed to parse Claude CLI response: ${msg}. Raw output starts with: "${stdout.slice(0, 300)}"`,
        ));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start Claude CLI: ${err.message}. Is 'claude' installed and in PATH?`));
    });

    proc.stdin.write(combinedPrompt);
    proc.stdin.end();
  });
}

export function createClaudeProvider(): AIProvider {
  return Object.freeze({
    name: 'claude',
    analyze: (files: readonly CodeFileInfo[], repoName: string): Promise<AIAnalysisResult> =>
      analyzeViaCli(files, repoName),
  });
}
