import { validateGitHubUrl } from './validators';

describe('validateGitHubUrl', () => {
  describe('valid URLs', () => {
    it('should accept standard GitHub repo URL', () => {
      const result = validateGitHubUrl('https://github.com/facebook/react');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept URL with trailing slash', () => {
      const result = validateGitHubUrl('https://github.com/facebook/react/');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept URL with .git suffix', () => {
      const result = validateGitHubUrl('https://github.com/facebook/react.git');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept URL with branch/tree path and strip it', () => {
      const result = validateGitHubUrl('https://github.com/facebook/react/tree/main/packages');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept URL with www prefix', () => {
      const result = validateGitHubUrl('https://www.github.com/facebook/react');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept URL with http (not https)', () => {
      const result = validateGitHubUrl('http://github.com/facebook/react');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
    });

    it('should accept owner/repo with dots and hyphens', () => {
      const result = validateGitHubUrl('https://github.com/my-org/my.project-name');
      expect(result.valid).toBe(true);
      expect(result.owner).toBe('my-org');
      expect(result.repo).toBe('my.project-name');
    });
  });

  describe('invalid URLs', () => {
    it('should reject empty string', () => {
      const result = validateGitHubUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-GitHub URL', () => {
      const result = validateGitHubUrl('https://gitlab.com/user/repo');
      expect(result.valid).toBe(false);
    });

    it('should reject gist URL', () => {
      const result = validateGitHubUrl('https://gist.github.com/user/abc123');
      expect(result.valid).toBe(false);
    });

    it('should reject github.io URL', () => {
      const result = validateGitHubUrl('https://user.github.io/repo');
      expect(result.valid).toBe(false);
    });

    it('should reject raw.githubusercontent.com URL', () => {
      const result = validateGitHubUrl('https://raw.githubusercontent.com/user/repo/main/file.txt');
      expect(result.valid).toBe(false);
    });

    it('should reject URL with only owner (no repo)', () => {
      const result = validateGitHubUrl('https://github.com/facebook');
      expect(result.valid).toBe(false);
    });

    it('should reject plain text', () => {
      const result = validateGitHubUrl('not a url');
      expect(result.valid).toBe(false);
    });

    it('should reject URL with invalid characters in owner', () => {
      const result = validateGitHubUrl('https://github.com/user name/repo');
      expect(result.valid).toBe(false);
    });
  });
});
