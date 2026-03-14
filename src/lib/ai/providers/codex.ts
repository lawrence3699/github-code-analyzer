import { spawn } from 'child_process';
import { tmpdir } from 'os';

import type { AIProvider, AIAnalysisResult, CodeFileInfo } from '../types';
import { buildSystemPrompt, buildUserPrompt } from '../prompt-template';

const CLI_TIMEOUT_MS = 120_000;

function extractTextFromCodexJsonl(output: string): string {
  const lines = output.trim().split('\n');
  let lastAgentText = '';

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;

      // Codex JSONL format: {"type":"item.completed","item":{"type":"agent_message","text":"..."}}
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

  return lastAgentText;
}

async function analyzeViaCli(
  files: readonly CodeFileInfo[],
  repoName: string,
  fileContents?: ReadonlyMap<string, string>,
): Promise<AIAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(repoName, files, fileContents);
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

  return new Promise<AIAnalysisResult>((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    // Run from tmpdir to avoid UTF-8 path issues with Chinese directory names
    const proc = spawn(
      'codex',
      ['exec', '--json', '--skip-git-repo-check', '-'],
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
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Codex CLI exited with code ${code}: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        const aiText = extractTextFromCodexJsonl(stdout);

        if (!aiText) {
          throw new Error(`No agent_message found in Codex output`);
        }

        // Strip markdown fences if present
        let jsonStr = aiText.trim();
        const fenceMatch = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
        if (fenceMatch) {
          jsonStr = fenceMatch[1].trim();
        }

        // Try to extract a JSON object from the text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr) as AIAnalysisResult;
        resolve(parsed);
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        reject(new Error(
          `Failed to parse Codex CLI response: ${msg}. Raw output starts with: "${stdout.slice(0, 300)}"`,
        ));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start Codex CLI: ${err.message}. Is 'codex' installed and in PATH?`));
    });

    proc.stdin.write(combinedPrompt);
    proc.stdin.end();
  });
}

export function createCodexProvider(): AIProvider {
  return Object.freeze({
    name: 'codex',
    analyze: (
      files: readonly CodeFileInfo[],
      repoName: string,
      fileContents?: ReadonlyMap<string, string>,
    ): Promise<AIAnalysisResult> => analyzeViaCli(files, repoName, fileContents),
  });
}
