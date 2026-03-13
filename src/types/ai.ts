export interface PrimaryLanguage {
  readonly language: string;
  readonly percentage: number;
  readonly file_count: number;
}

export interface TechStackItem {
  readonly category: 'framework' | 'library' | 'tool' | 'runtime' | 'database' | 'testing' | 'ci_cd' | 'other';
  readonly name: string;
  readonly confidence: number;
}

export interface EntryFile {
  readonly path: string;
  readonly reason: string;
  readonly type: 'main' | 'config' | 'app_entry' | 'server_entry' | 'build_entry';
}

export interface AIAnalysisResult {
  readonly project_name: string;
  readonly primary_languages: readonly PrimaryLanguage[];
  readonly tech_stack: readonly TechStackItem[];
  readonly entry_files: readonly EntryFile[];
  readonly summary: string;
}

export interface CodeFileInfo {
  readonly path: string;
  readonly name: string;
  readonly extension: string;
  readonly size?: number;
}

export interface AIProvider {
  readonly name: string;
  analyze(files: readonly CodeFileInfo[], repoName: string): Promise<AIAnalysisResult>;
}

export type AIProviderName = 'claude' | 'codex';
