import { NextRequest, NextResponse } from 'next/server';

import { getRepoTree, GitHubApiError } from '../../../../lib/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const owner = request.nextUrl.searchParams.get('owner');
  const repo = request.nextUrl.searchParams.get('repo');
  const branch = request.nextUrl.searchParams.get('branch') ?? undefined;

  if (!owner || !repo) {
    return NextResponse.json(
      { success: false, error: 'Missing required query parameters: owner, repo' },
      { status: 400 },
    );
  }

  try {
    const result = await getRepoTree(owner, repo, branch);

    return NextResponse.json({
      success: true,
      data: result.tree,
      truncated: result.truncated,
    });
  } catch (error: unknown) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
