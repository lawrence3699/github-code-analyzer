export interface RepoInfo {
  readonly name: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly defaultBranch: string;
  readonly stars: number;
  readonly forks: number;
  readonly language: string | null;
}

export interface TreeNode {
  readonly path: string;
  readonly name: string;
  readonly type: 'blob' | 'tree';
  readonly size?: number;
  readonly children?: readonly TreeNode[];
}

export interface FileContent {
  readonly path: string;
  readonly name: string;
  readonly content: string;
  readonly size: number;
  readonly encoding: string;
  readonly binary?: boolean;
}

export interface TreeResult {
  readonly tree: readonly TreeNode[];
  readonly truncated: boolean;
}
