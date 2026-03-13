import { filterCodeFiles } from './file-filter';
import type { TreeNode } from '../types/github';

describe('filterCodeFiles', () => {
  const makeBlob = (path: string, size = 100): TreeNode => ({
    path,
    name: path.split('/').pop() ?? path,
    type: 'blob',
    size,
  });

  const makeTree = (path: string, children: readonly TreeNode[] = []): TreeNode => ({
    path,
    name: path.split('/').pop() ?? path,
    type: 'tree',
    children,
  });

  describe('should include code files', () => {
    it('should include TypeScript files', () => {
      const tree: TreeNode[] = [makeBlob('src/index.ts'), makeBlob('src/App.tsx')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(2);
      expect(result[0].extension).toBe('.ts');
      expect(result[1].extension).toBe('.tsx');
    });

    it('should include JavaScript files', () => {
      const tree: TreeNode[] = [makeBlob('index.js'), makeBlob('App.jsx')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(2);
    });

    it('should include Python files', () => {
      const tree: TreeNode[] = [makeBlob('main.py')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(1);
      expect(result[0].extension).toBe('.py');
    });

    it('should include config files (json, yaml, toml)', () => {
      const tree: TreeNode[] = [
        makeBlob('package.json'),
        makeBlob('config.yaml'),
        makeBlob('settings.toml'),
      ];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(3);
    });

    it('should include shell scripts', () => {
      const tree: TreeNode[] = [makeBlob('deploy.sh'), makeBlob('setup.bash')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(2);
    });

    it('should include markdown files', () => {
      const tree: TreeNode[] = [makeBlob('README.md')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(1);
    });
  });

  describe('should exclude non-code files', () => {
    it('should exclude images', () => {
      const tree: TreeNode[] = [
        makeBlob('logo.png'),
        makeBlob('icon.jpg'),
        makeBlob('banner.svg'),
        makeBlob('photo.webp'),
      ];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude fonts', () => {
      const tree: TreeNode[] = [makeBlob('font.woff'), makeBlob('font.woff2'), makeBlob('font.ttf')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude binary files', () => {
      const tree: TreeNode[] = [makeBlob('app.exe'), makeBlob('lib.dll'), makeBlob('lib.so')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude lock files', () => {
      const tree: TreeNode[] = [
        makeBlob('package-lock.json'),
        makeBlob('yarn.lock'),
        makeBlob('pnpm-lock.yaml'),
        makeBlob('Cargo.lock'),
      ];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude system files', () => {
      const tree: TreeNode[] = [makeBlob('.DS_Store'), makeBlob('Thumbs.db')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude minified files', () => {
      const tree: TreeNode[] = [makeBlob('app.min.js'), makeBlob('style.min.css')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude source maps', () => {
      const tree: TreeNode[] = [makeBlob('app.js.map'), makeBlob('style.css.map')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude env files', () => {
      const tree: TreeNode[] = [makeBlob('.env'), makeBlob('.env.local')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });
  });

  describe('should exclude files in excluded directories', () => {
    it('should exclude node_modules', () => {
      const tree: TreeNode[] = [makeBlob('node_modules/react/index.js')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude .git directory', () => {
      const tree: TreeNode[] = [makeBlob('.git/config')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude dist directory', () => {
      const tree: TreeNode[] = [makeBlob('dist/bundle.js')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });

    it('should exclude __pycache__ directory', () => {
      const tree: TreeNode[] = [makeBlob('__pycache__/module.cpython-39.pyc')];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(0);
    });
  });

  describe('should handle nested tree structures', () => {
    it('should flatten nested trees and filter correctly', () => {
      const tree: TreeNode[] = [
        makeTree('src', [
          makeBlob('src/index.ts'),
          makeBlob('src/logo.png'),
          makeTree('src/lib', [
            makeBlob('src/lib/utils.ts'),
          ]),
        ]),
      ];
      const result = filterCodeFiles(tree);
      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/lib/utils.ts']);
    });
  });

  describe('should return correct CodeFileInfo shape', () => {
    it('should extract path, name, and extension', () => {
      const tree: TreeNode[] = [makeBlob('src/lib/utils.ts', 256)];
      const result = filterCodeFiles(tree);
      expect(result[0]).toEqual({
        path: 'src/lib/utils.ts',
        name: 'utils.ts',
        extension: '.ts',
        size: 256,
      });
    });
  });
});
