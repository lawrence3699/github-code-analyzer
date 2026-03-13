import { NextRequest, NextResponse } from 'next/server';

import { getFileContent, GitHubApiError } from '../../../../lib/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const owner = request.nextUrl.searchParams.get('owner');
  const repo = request.nextUrl.searchParams.get('repo');
  const path = request.nextUrl.searchParams.get('path');

  if (!owner || !repo || !path) {
    return NextResponse.json(
      { success: false, error: 'Missing required query parameters: owner, repo, path' },
      { status: 400 },
    );
  }

  try {
    const data = await getFileContent(owner, repo, path);

    return NextResponse.json({ success: true, data });
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
