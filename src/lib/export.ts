import type { AIAnalysisResult, CallGraphNode } from '../types/ai';

interface ExportPayload {
  readonly analysis: AIAnalysisResult;
  readonly callGraph: CallGraphNode | null;
}

/**
 * Export AI analysis result and call graph as pretty-printed JSON.
 */
export function exportAsJson(
  aiResult: AIAnalysisResult,
  callGraph: CallGraphNode | null,
): string {
  const payload: ExportPayload = {
    analysis: aiResult,
    callGraph,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Render a call graph node tree as indented markdown bullet list.
 */
function renderCallGraphNode(node: CallGraphNode, indent: number): string {
  const prefix = '  '.repeat(indent);
  const line = `${prefix}- ${node.functionName} (${node.filePath}) — ${node.description}`;
  const childLines = node.children.map((child) =>
    renderCallGraphNode(child, indent + 1),
  );
  return [line, ...childLines].join('\n');
}

/**
 * Export AI analysis result and call graph as structured Markdown.
 */
export function exportAsMarkdown(
  aiResult: AIAnalysisResult,
  callGraph: CallGraphNode | null,
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${aiResult.project_name} — Analysis Report`);

  // Summary
  sections.push('## Summary');
  sections.push(aiResult.summary);

  // Languages table
  sections.push('## Languages');
  sections.push('| Language | Percentage | Files |');
  sections.push('|----------|-----------|-------|');
  for (const lang of aiResult.primary_languages) {
    sections.push(`| ${lang.language} | ${lang.percentage}% | ${lang.file_count} |`);
  }

  // Tech Stack
  sections.push('## Tech Stack');
  const grouped: Record<string, readonly { readonly name: string; readonly confidence: number }[]> = {};
  for (const item of aiResult.tech_stack) {
    const existing = grouped[item.category] ?? [];
    grouped[item.category] = [...existing, { name: item.name, confidence: item.confidence }];
  }
  for (const [category, items] of Object.entries(grouped)) {
    for (const item of items) {
      sections.push(`- **${category}**: ${item.name} (confidence: ${item.confidence})`);
    }
  }

  // Entry Files
  sections.push('## Entry Files');
  for (const file of aiResult.entry_files) {
    sections.push(`- \`${file.path}\` — ${file.reason} (${file.type})`);
  }

  // Call Graph (only if present)
  if (callGraph !== null) {
    sections.push('## Call Graph');
    sections.push(renderCallGraphNode(callGraph, 0));
  }

  return sections.join('\n\n') + '\n';
}
