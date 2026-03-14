import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

import { getRateLimit, updateRateLimit, hasToken } from '../../../../lib/github-cache';

export async function GET(): Promise<NextResponse> {
  // Return cached rate limit if available
  const cached = getRateLimit();
  if (cached) {
    return NextResponse.json({
      success: true,
      data: { ...cached, hasToken: hasToken() },
    });
  }

  // Otherwise, fetch from GitHub API (this call itself costs 1 request)
  try {
    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit(token ? { auth: token } : {});
    const response = await octokit.rest.rateLimit.get();
    updateRateLimit(response.headers as Record<string, string | undefined>);

    const { core } = response.data.resources;
    return NextResponse.json({
      success: true,
      data: {
        remaining: core.remaining,
        limit: core.limit,
        reset: core.reset,
        hasToken: hasToken(),
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { remaining: null, limit: null, reset: null, hasToken: hasToken() },
    });
  }
}
