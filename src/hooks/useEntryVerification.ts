'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { EntryFile, EntryFileVerification } from '../types/ai';

interface VerifyContext {
  readonly owner: string;
  readonly repo: string;
  readonly repoName: string;
  readonly repoDescription: string | null;
  readonly primaryLanguages: readonly string[];
  readonly summary: string;
}

interface VerifiedEntry {
  readonly path: string;
  readonly functionName: string;
}

interface VerifyProgress {
  readonly current: number;
  readonly total: number;
}

export interface UseEntryVerificationReturn {
  readonly verifying: boolean;
  readonly verifiedEntry: VerifiedEntry | null;
  readonly currentFile: string | null;
  readonly progress: VerifyProgress;
  readonly verifyEntryFiles: (
    entryFiles: readonly EntryFile[],
    context: VerifyContext,
  ) => Promise<VerifiedEntry | null>;
  readonly cancel: () => void;
}

const CONFIDENCE_THRESHOLD = 0.7;

export function useEntryVerification(): UseEntryVerificationReturn {
  const [verifying, setVerifying] = useState(false);
  const [verifiedEntry, setVerifiedEntry] = useState<VerifiedEntry | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<VerifyProgress>({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const verifyEntryFiles = useCallback(
    async (
      entryFiles: readonly EntryFile[],
      context: VerifyContext,
    ): Promise<VerifiedEntry | null> => {
      if (entryFiles.length === 0) return null;

      abortRef.current = false;
      setVerifying(true);
      setVerifiedEntry(null);
      setProgress({ current: 0, total: entryFiles.length });

      try {
        for (let i = 0; i < entryFiles.length; i++) {
          if (abortRef.current) break;

          const entry = entryFiles[i];
          setCurrentFile(entry.path);
          setProgress({ current: i + 1, total: entryFiles.length });

          try {
            const res = await fetch('/api/ai/verify-entry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                owner: context.owner,
                repo: context.repo,
                filePath: entry.path,
                repoName: context.repoName,
                repoDescription: context.repoDescription,
                primaryLanguages: [...context.primaryLanguages],
                summary: context.summary,
              }),
            });

            const body = await res.json();

            if (body.success) {
              const verification = body.data as EntryFileVerification;

              if (verification.is_entry_file && verification.confidence >= CONFIDENCE_THRESHOLD) {
                const result: VerifiedEntry = {
                  path: entry.path,
                  functionName: verification.entry_function_name ?? 'main',
                };
                setVerifiedEntry(result);
                return result;
              }
            }
          } catch {
            // Single file verification failure doesn't block the loop
            continue;
          }
        }

        return null;
      } finally {
        setVerifying(false);
        setCurrentFile(null);
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return useMemo(
    () => ({
      verifying,
      verifiedEntry,
      currentFile,
      progress,
      verifyEntryFiles,
      cancel,
    }),
    [verifying, verifiedEntry, currentFile, progress, verifyEntryFiles, cancel],
  );
}
