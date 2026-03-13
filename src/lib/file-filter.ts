import type { TreeNode } from '../types/github';
import type { CodeFileInfo } from '../types/ai';

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.next', 'vendor', 'target', '.idea', '.vscode',
]);

const EXCLUDED_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Binary
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.o', '.a',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.jar', '.war',
  // Media
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt',
  // Source maps
  '.map',
]);

const EXCLUDED_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Cargo.lock', 'Gemfile.lock', 'poetry.lock', 'composer.lock',
  '.DS_Store', 'Thumbs.db',
]);

const ENV_FILE_PATTERN = /^\.env(\..*)?$/;

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return filename.slice(dotIndex);
}

function isMinifiedFile(filename: string): boolean {
  return filename.endsWith('.min.js') || filename.endsWith('.min.css');
}

function isInExcludedDir(path: string): boolean {
  const parts = path.split('/');
  return parts.some(part => EXCLUDED_DIRS.has(part));
}

function isExcludedFile(filename: string, extension: string): boolean {
  if (EXCLUDED_FILENAMES.has(filename)) return true;
  if (EXCLUDED_EXTENSIONS.has(extension)) return true;
  if (isMinifiedFile(filename)) return true;
  if (ENV_FILE_PATTERN.test(filename)) return true;
  return false;
}

function flattenTree(nodes: readonly TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    if (node.type === 'blob') {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }

  return result;
}

export function filterCodeFiles(tree: readonly TreeNode[]): CodeFileInfo[] {
  const blobs = flattenTree(tree);

  return blobs
    .filter(node => {
      if (isInExcludedDir(node.path)) return false;
      const filename = node.name;
      const ext = getExtension(filename);
      return !isExcludedFile(filename, ext);
    })
    .map(node => ({
      path: node.path,
      name: node.name,
      extension: getExtension(node.name),
      size: node.size,
    }));
}
