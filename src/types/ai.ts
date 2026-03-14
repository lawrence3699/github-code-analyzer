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
  analyze(
    files: readonly CodeFileInfo[],
    repoName: string,
    fileContents?: ReadonlyMap<string, string>,
  ): Promise<AIAnalysisResult>;
}

export type AIProviderName = 'claude' | 'codex';

// ===== Entry File Verification =====
export interface EntryFileVerification {
  readonly is_entry_file: boolean;
  readonly entry_function_name: string | null;
  readonly reason: string;
  readonly confidence: number;
}

// ===== Function Sub-call Analysis =====
export interface SubFunction {
  readonly name: string;
  readonly file: string | null;
  readonly description: string;
  readonly drillDown: -1 | 0 | 1;
  readonly category: 'core' | 'util' | 'io' | 'config' | 'lifecycle' | 'other';
}

export interface FunctionAnalysis {
  readonly function_name: string;
  readonly file_path: string;
  readonly sub_functions: readonly SubFunction[];
  readonly summary: string;
}

// ===== Call Graph Nodes =====
export type CallGraphNodeStatus = 'analyzed' | 'pending' | 'skipped' | 'not_found';

export interface CallGraphNode {
  readonly id: string;
  readonly functionName: string;
  readonly filePath: string;
  readonly description: string;
  readonly depth: number;
  readonly children: readonly CallGraphNode[];
  readonly status: CallGraphNodeStatus;
}

// ===== Call Graph Analysis Result =====
export type CallGraphFailReason =
  | 'entry_file_fetch_failed'
  | 'function_analysis_failed'
  | 'unexpected_error';

export interface CallGraphResult {
  readonly success: boolean;
  readonly reason?: CallGraphFailReason;
  readonly errorDetail?: string;
  readonly nodesAnalyzed: number;
}

// ===== Function Location Result =====
export interface FunctionLocation {
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly code: string;
  readonly truncated: boolean;
}
