'use client';

import { useState, useCallback, useMemo } from 'react';
import type { AIAnalysisResult, CodeFileInfo, AIProviderName } from '../types/ai';

interface RawData {
  readonly request: unknown;
  readonly response: unknown;
  readonly duration: number;
}

interface AnalyzeOptions {
  readonly provider?: AIProviderName;
  readonly owner?: string;
  readonly repo?: string;
}

interface UseAIAnalysisReturn {
  readonly result: AIAnalysisResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly rawData: RawData | null;
  readonly analyze: (
    files: readonly CodeFileInfo[],
    repoName: string,
    options?: AnalyzeOptions,
  ) => Promise<AIAnalysisResult | null>;
}

export function useAIAnalysis(): UseAIAnalysisReturn {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<RawData | null>(null);

  const analyze = useCallback(
    async (
      files: readonly CodeFileInfo[],
      repoName: string,
      options?: AnalyzeOptions,
    ): Promise<AIAnalysisResult | null> => {
      setLoading(true);
      setError(null);
      setResult(null);
      setRawData(null);

      const requestBody = {
        files,
        repoName,
        provider: options?.provider,
        owner: options?.owner,
        repo: options?.repo,
      };
      const startTime = Date.now();

      try {
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const duration = Date.now() - startTime;
        const responseBody = await res.json();

        setRawData({
          request: requestBody,
          response: responseBody,
          duration,
        });

        if (!res.ok || !responseBody.success) {
          const errMsg = responseBody.meta?.error ?? responseBody.error ?? `AI analysis failed: ${res.status}`;
          setError(errMsg);
          setLoading(false);
          return null;
        }

        const analysisResult = responseBody.data as AIAnalysisResult;
        setResult(analysisResult);
        setLoading(false);
        return analysisResult;
      } catch (err) {
        const duration = Date.now() - startTime;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setRawData({
          request: requestBody,
          response: { error: message },
          duration,
        });
        setLoading(false);
        return null;
      }
    },
    [],
  );

  return useMemo(
    () => ({ result, loading, error, rawData, analyze }),
    [result, loading, error, rawData, analyze],
  );
}
