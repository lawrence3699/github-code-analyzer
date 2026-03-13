export type {
  PrimaryLanguage,
  TechStackItem,
  EntryFile,
  AIAnalysisResult,
  CodeFileInfo,
  AIProvider,
  AIProviderName,
} from '../../types/ai';

import type { AIAnalysisResult } from '../../types/ai';

export interface AnalysisResponse {
  readonly result: AIAnalysisResult;
  readonly raw_request: string;
  readonly raw_response: string;
  readonly provider: string;
  readonly duration_ms: number;
}
