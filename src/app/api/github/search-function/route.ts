import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface SearchQuery {
  readonly owner: string;
  readonly repo: string;
  readonly functionName: string;
  readonly language: string;
}

function parseSearchParams(url: URL): SearchQuery {
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');
  const functionName = url.searchParams.get('functionName');
  const language = url.searchParams.get('language') ?? 'unknown';

  if (!owner || !repo || !functionName) {
    throw new Error('Missing required query params: owner, repo, functionName');
  }

  return { owner, repo, functionName, language };
}

const LANGUAGE_PATTERNS: Readonly<Record<string, string>> = {
  go: 'func {NAME}',
  python: 'def {NAME}',
  javascript: 'function {NAME}',
  typescript: 'function {NAME}',
  java: '{NAME}(',
  rust: 'fn {NAME}',
  c: '{NAME}(',
  cpp: '{NAME}(',
  ruby: 'def {NAME}',
  php: 'function {NAME}',
  swift: 'func {NAME}',
  kotlin: 'fun {NAME}',
};

function buildSearchQuery(params: SearchQuery): string {
  const pattern = LANGUAGE_PATTERNS[params.language] ?? `${params.functionName}(`;
  const searchTerm = pattern.replace('{NAME}', params.functionName);
  return `${searchTerm} repo:${params.owner}/${params.repo}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const params = parseSearchParams(url);

    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit(token ? { auth: token } : {});

    const query = buildSearchQuery(params);

    const { data } = await octokit.rest.search.code({
      q: query,
      per_page: 10,
    });

    const files = data.items.map((item) => item.path);

    return NextResponse.json({
      success: true,
      data: { files },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Search Function Error]', message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
