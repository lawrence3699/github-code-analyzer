'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  CallGraphNode,
  CallGraphResult,
  FunctionAnalysis,
  SubFunction,
  FunctionLocation,
} from '../types/ai';
import { locateFunctionInSource, detectLanguageFromPath } from '../lib/function-locator';

const MAX_DRILL_DEPTH = 2;

interface AnalyzeContext {
  readonly owner: string;
  readonly repo: string;
  readonly repoName: string;
  readonly summary: string;
  readonly primaryLanguages: readonly string[];
  readonly fileList: readonly string[];
}

interface CallGraphStats {
  readonly analyzed: number;
  readonly total: number;
  readonly depth: number;
}

export interface UseCallGraphReturn {
  readonly callGraph: CallGraphNode | null;
  readonly analyzing: boolean;
  readonly currentFunction: string | null;
  readonly stats: CallGraphStats;
  readonly analyzeEntryFunction: (
    entryPath: string,
    entryFunctionName: string,
    context: AnalyzeContext,
  ) => Promise<CallGraphResult>;
  readonly cancel: () => void;
}

// ===== Immutable tree update helpers =====

function updateNodeInTree(
  root: CallGraphNode,
  nodeId: string,
  updater: (node: CallGraphNode) => CallGraphNode,
): CallGraphNode {
  if (root.id === nodeId) {
    return updater(root);
  }

  const updatedChildren = root.children.map((child) =>
    updateNodeInTree(child, nodeId, updater),
  );

  // Only create a new object if children actually changed
  if (updatedChildren.every((c, i) => c === root.children[i])) {
    return root;
  }

  return { ...root, children: updatedChildren };
}

function addChildrenToNode(
  root: CallGraphNode,
  parentId: string,
  newChildren: readonly CallGraphNode[],
): CallGraphNode {
  return updateNodeInTree(root, parentId, (node) => ({
    ...node,
    children: newChildren,
    status: 'analyzed' as const,
  }));
}

// ===== Fetch file content =====

async function fetchFileContent(owner: string, repo: string, filePath: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(filePath)}`,
    );
    const body = await res.json();
    if (body.success && body.data?.content) {
      return body.data.content as string;
    }
    return null;
  } catch {
    return null;
  }
}

// ===== Analyze a function via API =====

async function analyzeFunctionApi(
  functionCode: string,
  functionName: string,
  filePath: string,
  context: AnalyzeContext,
): Promise<FunctionAnalysis | null> {
  try {
    const res = await fetch('/api/ai/analyze-function', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        functionCode,
        functionName,
        filePath,
        repoName: context.repoName,
        summary: context.summary,
        primaryLanguages: [...context.primaryLanguages],
        fileList: [...context.fileList],
      }),
    });
    const body = await res.json();
    if (body.success) {
      return body.data as FunctionAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

// ===== Search function in GitHub =====

async function searchFunctionApi(
  owner: string,
  repo: string,
  functionName: string,
  language: string,
): Promise<readonly string[]> {
  try {
    const params = new URLSearchParams({ owner, repo, functionName, language });
    const res = await fetch(`/api/github/search-function?${params}`);
    const body = await res.json();
    if (body.success && Array.isArray(body.data?.files)) {
      return body.data.files as readonly string[];
    }
    return [];
  } catch {
    return [];
  }
}

// ===== Locate function in a file =====

async function locateFunction(
  owner: string,
  repo: string,
  functionName: string,
  filePath: string,
): Promise<FunctionLocation | null> {
  const content = await fetchFileContent(owner, repo, filePath);
  if (!content) return null;

  const language = detectLanguageFromPath(filePath);
  return locateFunctionInSource(content, functionName, language, filePath);
}

// ===== Create node from sub function =====

function subFunctionToNode(sub: SubFunction, parentPath: string, depth: number, seq: number): CallGraphNode {
  return {
    id: `${sub.file ?? parentPath}:${sub.name}#${seq}`,
    functionName: sub.name,
    filePath: sub.file ?? parentPath,
    description: sub.description,
    depth,
    children: [],
    status: sub.drillDown === -1 ? 'skipped' : 'pending',
  };
}

export function useCallGraph(): UseCallGraphReturn {
  const [callGraph, setCallGraph] = useState<CallGraphNode | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
  const [stats, setStats] = useState<CallGraphStats>({ analyzed: 0, total: 0, depth: 0 });
  const abortRef = useRef(false);

  const analyzeEntryFunction = useCallback(
    async (
      entryPath: string,
      entryFunctionName: string,
      context: AnalyzeContext,
    ): Promise<CallGraphResult> => {
      abortRef.current = false;
      setAnalyzing(true);
      setCurrentFunction(entryFunctionName);
      setStats({ analyzed: 0, total: 1, depth: 0 });

      const analyzedIds = new Set<string>();
      let nodeSeq = 0;

      try {
        // Step 1: Get entry file content
        const entryContent = await fetchFileContent(context.owner, context.repo, entryPath);
        if (!entryContent) {
          return { success: false, reason: 'entry_file_fetch_failed', nodesAnalyzed: 0 };
        }

        // Step 2: Analyze entry function
        const language = detectLanguageFromPath(entryPath);
        const entryLocation = locateFunctionInSource(entryContent, entryFunctionName, language, entryPath);
        const codeToAnalyze = entryLocation?.code ?? entryContent;

        const analysis = await analyzeFunctionApi(
          codeToAnalyze,
          entryFunctionName,
          entryPath,
          context,
        );

        if (!analysis) {
          return { success: false, reason: 'function_analysis_failed', nodesAnalyzed: 0 };
        }

        // Step 3: Build initial tree
        const childNodes = analysis.sub_functions.map((sub) =>
          subFunctionToNode(sub, entryPath, 1, nodeSeq++),
        );

        const rootNode: CallGraphNode = {
          id: `${entryPath}:${entryFunctionName}`,
          functionName: entryFunctionName,
          filePath: entryPath,
          description: analysis.summary,
          depth: 0,
          children: childNodes,
          status: 'analyzed',
        };

        setCallGraph(rootNode);
        analyzedIds.add(`${entryPath}:${entryFunctionName}`);
        setStats({ analyzed: 1, total: 1 + childNodes.length, depth: 0 });

        // Step 4: BFS drill-down
        let currentTree = rootNode;
        const queue: { readonly node: CallGraphNode; readonly parentFilePath: string }[] =
          childNodes
            .filter((n) => n.status === 'pending')
            .map((n) => ({ node: n, parentFilePath: entryPath }));

        let analyzedCount = 1;

        while (queue.length > 0) {
          if (abortRef.current) {
            return { success: true, nodesAnalyzed: analyzedCount };
          }

          const item = queue.shift()!;
          const { node } = item;

          const semanticId = `${node.filePath}:${node.functionName}`;
          if (node.depth >= MAX_DRILL_DEPTH || analyzedIds.has(semanticId)) {
            currentTree = updateNodeInTree(currentTree, node.id, (n) => ({
              ...n,
              status: 'skipped' as const,
            }));
            setCallGraph(currentTree);
            continue;
          }

          setCurrentFunction(node.functionName);
          analyzedIds.add(semanticId);

          // Three-phase function location
          let located: FunctionLocation | null = null;

          // Phase 1: Check parent file
          located = await locateFunction(
            context.owner,
            context.repo,
            node.functionName,
            item.parentFilePath,
          );

          // Phase 2: Check AI-suggested file
          if (!located && node.filePath !== item.parentFilePath) {
            located = await locateFunction(
              context.owner,
              context.repo,
              node.functionName,
              node.filePath,
            );
          }

          // Phase 3: Search via GitHub API
          if (!located) {
            const primaryLang = context.primaryLanguages[0] ?? 'unknown';
            const files = await searchFunctionApi(
              context.owner,
              context.repo,
              node.functionName,
              primaryLang.toLowerCase(),
            );
            for (const file of files) {
              located = await locateFunction(
                context.owner,
                context.repo,
                node.functionName,
                file,
              );
              if (located) break;
            }
          }

          if (!located) {
            currentTree = updateNodeInTree(currentTree, node.id, (n) => ({
              ...n,
              status: 'not_found' as const,
            }));
            setCallGraph(currentTree);
            analyzedCount++;
            setStats((prev) => ({ ...prev, analyzed: analyzedCount }));
            continue;
          }

          // Analyze the located function
          const fnAnalysis = await analyzeFunctionApi(
            located.code,
            node.functionName,
            located.filePath,
            context,
          );

          if (!fnAnalysis) {
            currentTree = updateNodeInTree(currentTree, node.id, (n) => ({
              ...n,
              status: 'not_found' as const,
            }));
            setCallGraph(currentTree);
            analyzedCount++;
            setStats((prev) => ({ ...prev, analyzed: analyzedCount }));
            continue;
          }

          // Create child nodes and add to tree
          const newChildren = fnAnalysis.sub_functions.map((sub) =>
            subFunctionToNode(sub, located!.filePath, node.depth + 1, nodeSeq++),
          );

          currentTree = addChildrenToNode(currentTree, node.id, newChildren);
          setCallGraph(currentTree);

          analyzedCount++;
          setStats({
            analyzed: analyzedCount,
            total: analyzedCount + queue.length + newChildren.filter((n) => n.status === 'pending').length,
            depth: node.depth + 1,
          });

          // Enqueue drillable children
          for (const child of newChildren) {
            const childSemanticId = `${child.filePath}:${child.functionName}`;
            if (child.status === 'pending' && child.depth < MAX_DRILL_DEPTH && !analyzedIds.has(childSemanticId)) {
              queue.push({ node: child, parentFilePath: located!.filePath });
            }
          }
        }

        return { success: true, nodesAnalyzed: analyzedCount };
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, reason: 'unexpected_error', errorDetail: detail, nodesAnalyzed: 0 };
      } finally {
        setAnalyzing(false);
        setCurrentFunction(null);
        setStats((prev) => ({ ...prev, analyzed: prev.total }));
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return useMemo(
    () => ({
      callGraph,
      analyzing,
      currentFunction,
      stats,
      analyzeEntryFunction,
      cancel,
    }),
    [callGraph, analyzing, currentFunction, stats, analyzeEntryFunction, cancel],
  );
}
