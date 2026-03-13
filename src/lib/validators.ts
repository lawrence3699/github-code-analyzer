export interface ValidationResult {
  readonly valid: boolean;
  readonly owner?: string;
  readonly repo?: string;
  readonly error?: string;
}

const GITHUB_REPO_PATTERN = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/;

const REJECTED_HOSTS = [
  'gist.github.com',
  'raw.githubusercontent.com',
];

function isGitHubIoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.github.io');
  } catch {
    return false;
  }
}

export function validateGitHubUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'landing.emptyUrl' };
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    for (const host of REJECTED_HOSTS) {
      if (parsed.hostname === host) {
        return { valid: false, error: 'landing.invalidUrl' };
      }
    }

    if (isGitHubIoUrl(trimmed)) {
      return { valid: false, error: 'landing.invalidUrl' };
    }
  } catch {
    return { valid: false, error: 'landing.invalidUrl' };
  }

  const match = trimmed.match(GITHUB_REPO_PATTERN);
  if (!match) {
    return { valid: false, error: 'landing.invalidUrl' };
  }

  const [, owner, repo] = match;

  return { valid: true, owner, repo };
}
