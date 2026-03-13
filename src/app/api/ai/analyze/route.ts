import { NextResponse } from 'next/server';

import type { CodeFileInfo, AIProviderName } from '../../../../lib/ai/types';
import { analyzeRepository } from '../../../../lib/ai/analyzer';
import { selectKeyFiles } from '../../../../lib/ai/key-files';
import { getFileContent } from '../../../../lib/github';

interface AnalyzeRequestBody {
  readonly files: readonly CodeFileInfo[];
  readonly repoName: string;
  readonly provider?: AIProviderName;
  readonly owner?: string;
  readonly repo?: string;
}

function validateRequestBody(body: unknown): AnalyzeRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.files)) {
    throw new Error('files must be an array');
  }

  if (obj.files.length === 0) {
    throw new Error('files array must not be empty');
  }

  for (const file of obj.files) {
    if (typeof file !== 'object' || file === null) {
      throw new Error('Each file must be an object');
    }
    const f = file as Record<string, unknown>;
    if (typeof f.path !== 'string' || f.path.length === 0) {
      throw new Error('Each file must have a non-empty path');
    }
    if (typeof f.name !== 'string' || f.name.length === 0) {
      throw new Error('Each file must have a non-empty name');
    }
    if (typeof f.extension !== 'string') {
      throw new Error('Each file must have an extension field');
    }
  }

  if (typeof obj.repoName !== 'string' || obj.repoName.length === 0) {
    throw new Error('repoName must be a non-empty string');
  }

  if (obj.provider !== undefined && typeof obj.provider !== 'string') {
    throw new Error('provider must be a string if specified');
  }

  return {
    files: obj.files as readonly CodeFileInfo[],
    repoName: obj.repoName as string,
    provider: obj.provider as AIProviderName | undefined,
    owner: typeof obj.owner === 'string' ? obj.owner : undefined,
    repo: typeof obj.repo === 'string' ? obj.repo : undefined,
  };
}

/**
 * Fetches content of key config files (package.json, etc.) in parallel.
 * Failures are silently ignored — missing files don't block analysis.
 */
async function fetchKeyFileContents(
  owner: string,
  repo: string,
  filePaths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const keyPaths = selectKeyFiles(filePaths);

  if (keyPaths.length === 0) {
    return new Map();
  }

  const results = await Promise.allSettled(
    keyPaths.map(async (path) => {
      const file = await getFileContent(owner, repo, path);
      return { path, content: file.binary ? '' : file.content };
    }),
  );

  const contentMap = new Map<string, string>();
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.content) {
      contentMap.set(result.value.path, result.value.content);
    }
  }

  return contentMap;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json();
    const body = validateRequestBody(rawBody);

    // Fetch key file contents if owner/repo provided
    let fileContents: ReadonlyMap<string, string> | undefined;
    if (body.owner && body.repo) {
      try {
        const allPaths = body.files.map(f => f.path);
        fileContents = await fetchKeyFileContents(body.owner, body.repo, allPaths);
      } catch (err) {
        // Non-fatal — analysis continues with paths only
        console.warn('[AI Analysis] Failed to fetch key file contents:', err instanceof Error ? err.message : err);
      }
    }

    const response = await analyzeRepository(
      body.files,
      body.repoName,
      body.provider,
      fileContents,
    );

    return NextResponse.json({
      success: true,
      data: response.result,
      meta: {
        provider: response.provider,
        duration_ms: response.duration_ms,
        raw_request: response.raw_request,
        raw_response: response.raw_response,
        key_files_sent: fileContents?.size ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error('[AI Analysis Error]', message);

    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {
          error: message,
        },
      },
      { status: 500 },
    );
  }
}
