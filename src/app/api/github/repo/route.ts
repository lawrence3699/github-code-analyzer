import { NextRequest, NextResponse } from 'next/server';

import { validateGitHubUrl } from '../../../../lib/validators';
import { getRepoInfo, GitHubApiError } from '../../../../lib/github';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { success: false, error: 'Missing required query parameter: url' },
      { status: 400 },
    );
  }

  const validation = validateGitHubUrl(url);

  if (!validation.valid || !validation.owner || !validation.repo) {
    return NextResponse.json(
      { success: false, error: validation.error ?? 'Invalid GitHub URL' },
      { status: 400 },
    );
  }

  try {
    const data = await getRepoInfo(validation.owner, validation.repo);

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
