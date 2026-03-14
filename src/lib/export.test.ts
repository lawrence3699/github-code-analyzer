import type { AIAnalysisResult, CallGraphNode } from '../types/ai';
import { exportAsJson, exportAsMarkdown } from './export';

const SAMPLE_AI_RESULT: AIAnalysisResult = {
  project_name: 'test-project',
  primary_languages: [
    { language: 'TypeScript', percentage: 75, file_count: 30 },
    { language: 'JavaScript', percentage: 25, file_count: 10 },
  ],
  tech_stack: [
    { category: 'framework', name: 'Next.js', confidence: 0.95 },
    { category: 'library', name: 'React', confidence: 0.9 },
    { category: 'tool', name: 'ESLint', confidence: 0.8 },
  ],
  entry_files: [
    { path: 'src/app/page.tsx', reason: 'Main app entry', type: 'app_entry' },
    { path: 'src/index.ts', reason: 'Package entry point', type: 'main' },
  ],
  summary: 'A Next.js application with TypeScript and React.',
};

const SAMPLE_CALL_GRAPH: CallGraphNode = {
  id: 'root-1',
  functionName: 'main',
  filePath: 'src/index.ts',
  description: 'Application entry point',
  depth: 0,
  status: 'analyzed',
  children: [
    {
      id: 'child-1',
      functionName: 'initApp',
      filePath: 'src/app.ts',
      description: 'Initialize application',
      depth: 1,
      status: 'analyzed',
      children: [
        {
          id: 'grandchild-1',
          functionName: 'loadConfig',
          filePath: 'src/config.ts',
          description: 'Load configuration',
          depth: 2,
          status: 'pending',
          children: [],
        },
      ],
    },
    {
      id: 'child-2',
      functionName: 'startServer',
      filePath: 'src/server.ts',
      description: 'Start HTTP server',
      depth: 1,
      status: 'skipped',
      children: [],
    },
  ],
};

describe('exportAsJson', () => {
  it('should produce valid JSON with both analysis and callGraph fields', () => {
    const json = exportAsJson(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('analysis');
    expect(parsed).toHaveProperty('callGraph');
    expect(parsed.analysis.project_name).toBe('test-project');
    expect(parsed.callGraph.functionName).toBe('main');
  });

  it('should pretty-print with 2-space indentation', () => {
    const json = exportAsJson(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    // Pretty-printed JSON has newlines and indentation
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  it('should include all AI result fields', () => {
    const json = exportAsJson(SAMPLE_AI_RESULT, null);
    const parsed = JSON.parse(json);

    expect(parsed.analysis.project_name).toBe('test-project');
    expect(parsed.analysis.primary_languages).toHaveLength(2);
    expect(parsed.analysis.tech_stack).toHaveLength(3);
    expect(parsed.analysis.entry_files).toHaveLength(2);
    expect(parsed.analysis.summary).toBe('A Next.js application with TypeScript and React.');
  });

  it('should set callGraph to null when not provided', () => {
    const json = exportAsJson(SAMPLE_AI_RESULT, null);
    const parsed = JSON.parse(json);

    expect(parsed.callGraph).toBeNull();
  });

  it('should include nested call graph children', () => {
    const json = exportAsJson(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);
    const parsed = JSON.parse(json);

    expect(parsed.callGraph.children).toHaveLength(2);
    expect(parsed.callGraph.children[0].children).toHaveLength(1);
    expect(parsed.callGraph.children[0].children[0].functionName).toBe('loadConfig');
  });

  it('should handle empty arrays in AI result', () => {
    const emptyResult: AIAnalysisResult = {
      project_name: 'empty-project',
      primary_languages: [],
      tech_stack: [],
      entry_files: [],
      summary: '',
    };
    const json = exportAsJson(emptyResult, null);
    const parsed = JSON.parse(json);

    expect(parsed.analysis.primary_languages).toEqual([]);
    expect(parsed.analysis.tech_stack).toEqual([]);
    expect(parsed.analysis.entry_files).toEqual([]);
  });
});

describe('exportAsMarkdown', () => {
  it('should include the project name as a heading', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('# test-project');
  });

  it('should include the summary section', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('## Summary');
    expect(md).toContain('A Next.js application with TypeScript and React.');
  });

  it('should include a languages table with headers', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('## Languages');
    expect(md).toContain('| Language | Percentage | Files |');
    expect(md).toContain('|----------|-----------|-------|');
    expect(md).toContain('| TypeScript | 75% | 30 |');
    expect(md).toContain('| JavaScript | 25% | 10 |');
  });

  it('should include tech stack items grouped by category', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('## Tech Stack');
    expect(md).toContain('**framework**');
    expect(md).toContain('Next.js');
    expect(md).toContain('confidence: 0.95');
    expect(md).toContain('**library**');
    expect(md).toContain('React');
    expect(md).toContain('**tool**');
    expect(md).toContain('ESLint');
  });

  it('should include entry files with path, reason, and type', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('## Entry Files');
    expect(md).toContain('`src/app/page.tsx`');
    expect(md).toContain('Main app entry');
    expect(md).toContain('app_entry');
    expect(md).toContain('`src/index.ts`');
    expect(md).toContain('Package entry point');
    expect(md).toContain('main');
  });

  it('should include the call graph section with tree structure', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    expect(md).toContain('## Call Graph');
    expect(md).toContain('main');
    expect(md).toContain('src/index.ts');
    expect(md).toContain('Application entry point');
    expect(md).toContain('initApp');
    expect(md).toContain('loadConfig');
    expect(md).toContain('startServer');
  });

  it('should render nested call graph with indentation', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);
    const lines = md.split('\n');

    // Root node at top-level bullet
    const rootLine = lines.find((l) => l.includes('main') && l.includes('src/index.ts'));
    expect(rootLine).toBeDefined();
    expect(rootLine!.startsWith('- ')).toBe(true);

    // Child nodes indented
    const childLine = lines.find((l) => l.includes('initApp') && l.includes('src/app.ts'));
    expect(childLine).toBeDefined();
    expect(childLine!.startsWith('  - ')).toBe(true);

    // Grandchild nodes further indented
    const grandchildLine = lines.find((l) => l.includes('loadConfig') && l.includes('src/config.ts'));
    expect(grandchildLine).toBeDefined();
    expect(grandchildLine!.startsWith('    - ')).toBe(true);
  });

  it('should omit the Call Graph section when callGraph is null', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, null);

    expect(md).not.toContain('## Call Graph');
    // Other sections should still be present
    expect(md).toContain('## Summary');
    expect(md).toContain('## Languages');
    expect(md).toContain('## Tech Stack');
    expect(md).toContain('## Entry Files');
  });

  it('should handle empty arrays gracefully', () => {
    const emptyResult: AIAnalysisResult = {
      project_name: 'empty-project',
      primary_languages: [],
      tech_stack: [],
      entry_files: [],
      summary: '',
    };
    const md = exportAsMarkdown(emptyResult, null);

    expect(md).toContain('# empty-project');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Languages');
    expect(md).toContain('## Tech Stack');
    expect(md).toContain('## Entry Files');
    expect(md).not.toContain('## Call Graph');
  });

  it('should not end with excessive trailing newlines', () => {
    const md = exportAsMarkdown(SAMPLE_AI_RESULT, SAMPLE_CALL_GRAPH);

    // Should end with a single newline at most
    expect(md.endsWith('\n\n\n')).toBe(false);
  });
});
