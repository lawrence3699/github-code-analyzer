import type { CodeFileInfo } from './types';
import { MAX_README_LINES, MAX_CONTENT_BYTES } from './key-files';

const JSON_SCHEMA = `{
  "project_name": "string",
  "primary_languages": [
    { "language": "string", "percentage": "number (0-100)", "file_count": "number" }
  ],
  "tech_stack": [
    { "category": "framework|library|tool|runtime|database|testing|ci_cd|other", "name": "string", "confidence": "number (0-1)" }
  ],
  "entry_files": [
    { "path": "string", "reason": "string", "type": "main|config|app_entry|server_entry|build_entry" }
  ],
  "summary": "string (1-2 sentences describing the project)"
}`;

export function buildSystemPrompt(): string {
  return [
    'You are a code repository analyst. Your task is to analyze a repository based on its file structure and the content of key configuration files, then return a structured JSON analysis.',
    '',
    'You will receive:',
    '1. A list of file paths from the repository',
    '2. The content of key configuration/entry files (package.json, go.mod, Cargo.toml, etc.)',
    '',
    'Based on the file names, extensions, directory structure, AND the actual content of config files, determine:',
    '1. The project name',
    '2. The primary programming languages used (with estimated percentages and file counts)',
    '3. The tech stack (frameworks, libraries, tools, runtimes, databases, testing tools, CI/CD, etc.)',
    '4. The likely entry files (main entry points, config files, app entries, server entries, build entries)',
    '5. A brief 1-2 sentence summary of what the project is',
    '',
    'Respond ONLY with valid JSON matching this exact schema:',
    JSON_SCHEMA,
    '',
    'Rules:',
    '- Respond with ONLY the JSON object. No markdown fences, no explanation, no extra text.',
    '- All percentage values in primary_languages must sum to 100.',
    '- Confidence values in tech_stack must be between 0 and 1.',
    '- Only include entry_files that actually appear in the provided file list.',
    '- The summary should be concise: 1-2 sentences maximum.',
    '- The "summary" field MUST be written in Chinese (中文).',
    '- The "reason" field in entry_files MUST be written in Chinese (中文).',
    '- Technical names (languages, frameworks, file paths) remain in English.',
    '- Use config file contents (dependencies, scripts, etc.) to accurately determine the tech stack rather than guessing from file names alone.',
  ].join('\n');
}

export function buildUserPrompt(
  repoName: string,
  files: readonly CodeFileInfo[],
  fileContents?: ReadonlyMap<string, string>,
): string {
  const fileList = files.map(f => f.path).join('\n');

  const parts: string[] = [
    `Repository: ${repoName}`,
    `Total code files: ${files.length}`,
    '',
    'File list:',
    fileList,
  ];

  if (fileContents && fileContents.size > 0) {
    parts.push('', '--- Key File Contents ---');
    let totalBytes = 0;

    for (const [path, content] of fileContents) {
      if (totalBytes >= MAX_CONTENT_BYTES) break;

      let truncatedContent = content;

      // Truncate README to first N lines
      if (/readme/i.test(path)) {
        const lines = content.split('\n');
        if (lines.length > MAX_README_LINES) {
          truncatedContent = lines.slice(0, MAX_README_LINES).join('\n') + '\n... (truncated)';
        }
      }

      // Cap per-file size to stay within total budget
      const remaining = MAX_CONTENT_BYTES - totalBytes;
      if (truncatedContent.length > remaining) {
        truncatedContent = truncatedContent.slice(0, remaining) + '\n... (truncated)';
      }

      parts.push('', `=== ${path} ===`, truncatedContent);
      totalBytes += truncatedContent.length;
    }
  }

  parts.push('', 'Analyze this repository and respond with the JSON analysis.');
  return parts.join('\n');
}
