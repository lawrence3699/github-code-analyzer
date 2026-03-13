import type {
  CodeFileInfo,
  AIProviderName,
  AIProvider,
  AIAnalysisResult,
} from './types';
import type { AnalysisResponse } from './types';
import { buildSystemPrompt, buildUserPrompt } from './prompt-template';
import { createClaudeProvider } from './providers/claude';
import { createCodexProvider } from './providers/codex';

const VALID_PROVIDERS: readonly AIProviderName[] = ['claude', 'codex'];
const DEFAULT_PROVIDER: AIProviderName = 'claude';

const REQUIRED_FIELDS: readonly string[] = [
  'project_name',
  'primary_languages',
  'tech_stack',
  'entry_files',
  'summary',
];

function resolveProvider(name?: string): AIProviderName {
  const value = name ?? process.env.AI_PROVIDER ?? DEFAULT_PROVIDER;
  if (!VALID_PROVIDERS.includes(value as AIProviderName)) {
    throw new Error(
      `Invalid AI provider: "${value}". Must be one of: ${VALID_PROVIDERS.join(', ')}`,
    );
  }
  return value as AIProviderName;
}

function createProvider(name: AIProviderName): AIProvider {
  switch (name) {
    case 'claude':
      return createClaudeProvider();
    case 'codex':
      return createCodexProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = trimmed.match(fencePattern);
  return match ? match[1].trim() : trimmed;
}

function parseJsonResponse(raw: string): AIAnalysisResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const stripped = stripMarkdownFences(raw);
    try {
      parsed = JSON.parse(stripped);
    } catch {
      throw new Error(
        `Failed to parse AI response as JSON. Raw response starts with: "${raw.slice(0, 200)}"`,
      );
    }
  }

  validateRequiredFields(parsed);
  return parsed as AIAnalysisResult;
}

function validateRequiredFields(data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    throw new Error('AI response is not a JSON object');
  }

  const obj = data as Record<string, unknown>;
  const missingFields = REQUIRED_FIELDS.filter(field => !(field in obj));

  if (missingFields.length > 0) {
    throw new Error(
      `AI response is missing required fields: ${missingFields.join(', ')}`,
    );
  }

  if (!Array.isArray(obj.primary_languages)) {
    throw new Error('primary_languages must be an array');
  }

  if (!Array.isArray(obj.tech_stack)) {
    throw new Error('tech_stack must be an array');
  }

  if (!Array.isArray(obj.entry_files)) {
    throw new Error('entry_files must be an array');
  }

  if (typeof obj.project_name !== 'string' || obj.project_name.length === 0) {
    throw new Error('project_name must be a non-empty string');
  }

  if (typeof obj.summary !== 'string' || obj.summary.length === 0) {
    throw new Error('summary must be a non-empty string');
  }
}

export async function analyzeRepository(
  files: readonly CodeFileInfo[],
  repoName: string,
  provider?: AIProviderName,
  fileContents?: ReadonlyMap<string, string>,
): Promise<AnalysisResponse> {
  const resolvedProvider = resolveProvider(provider);

  if (files.length === 0) {
    throw new Error('No code files provided for analysis');
  }

  const aiProvider = createProvider(resolvedProvider);
  const rawRequest = [buildSystemPrompt(), '', buildUserPrompt(repoName, files, fileContents)].join('\n');

  const startTime = performance.now();

  let rawResponse: string;
  let result: AIAnalysisResult;

  try {
    result = await aiProvider.analyze(files, repoName);
    rawResponse = JSON.stringify(result);
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `${resolvedProvider} (cli) failed after ${elapsed}ms: ${message}`,
    );
  }

  const durationMs = Math.round(performance.now() - startTime);

  // Validate the result even if parsing succeeded in the provider
  validateRequiredFields(result);

  return Object.freeze({
    result: Object.freeze(result),
    raw_request: rawRequest,
    raw_response: rawResponse,
    provider: resolvedProvider,
    duration_ms: durationMs,
  });
}

export { parseJsonResponse, stripMarkdownFences, validateRequiredFields };
