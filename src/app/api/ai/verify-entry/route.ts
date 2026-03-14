import { NextResponse } from 'next/server';

import { callProviderCli, parseProviderJsonResponse } from '../../../../lib/ai/call-provider';
import { getFileContent } from '../../../../lib/github';
import type { EntryFileVerification } from '../../../../types/ai';

interface VerifyEntryRequestBody {
  readonly owner: string;
  readonly repo: string;
  readonly filePath: string;
  readonly repoName: string;
  readonly repoDescription: string | null;
  readonly primaryLanguages: readonly string[];
  readonly summary: string;
}

function validateRequestBody(body: unknown): VerifyEntryRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.owner !== 'string' || obj.owner.length === 0) {
    throw new Error('owner must be a non-empty string');
  }
  if (typeof obj.repo !== 'string' || obj.repo.length === 0) {
    throw new Error('repo must be a non-empty string');
  }
  if (typeof obj.filePath !== 'string' || obj.filePath.length === 0) {
    throw new Error('filePath must be a non-empty string');
  }
  if (typeof obj.repoName !== 'string' || obj.repoName.length === 0) {
    throw new Error('repoName must be a non-empty string');
  }
  if (!Array.isArray(obj.primaryLanguages)) {
    throw new Error('primaryLanguages must be an array');
  }
  if (typeof obj.summary !== 'string') {
    throw new Error('summary must be a string');
  }

  return {
    owner: obj.owner,
    repo: obj.repo,
    filePath: obj.filePath,
    repoName: obj.repoName,
    repoDescription: typeof obj.repoDescription === 'string' ? obj.repoDescription : null,
    primaryLanguages: obj.primaryLanguages as readonly string[],
    summary: obj.summary,
  };
}

function truncateFileContent(content: string, maxLines: number = 4000): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) {
    return content;
  }

  const half = Math.floor(maxLines / 2);
  const head = lines.slice(0, half);
  const tail = lines.slice(-half);
  const omitted = lines.length - maxLines;

  return [...head, `\n... (省略中间部分，共 ${omitted} 行) ...\n`, ...tail].join('\n');
}

function buildVerifyPrompt(body: VerifyEntryRequestBody, fileContent: string): string {
  const truncated = truncateFileContent(fileContent);

  return `你是一个代码分析专家。判断以下源代码文件是否是项目的主入口文件。

项目名称：${body.repoName}
项目描述：${body.repoDescription ?? '无'}
编程语言：${body.primaryLanguages.join(', ')}
项目摘要：${body.summary}
文件路径：${body.filePath}

源代码：
---
${truncated}
---

入口文件特征：包含程序的 main 函数、启动入口、CLI 入口、服务器启动代码等。

仅返回 JSON，不要 markdown 标记：
{"is_entry_file":boolean,"entry_function_name":"函数名"|null,"reason":"中文判断理由","confidence":0.0-1.0}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const rawBody: unknown = await request.json();
    const body = validateRequestBody(rawBody);

    const file = await getFileContent(body.owner, body.repo, body.filePath);
    const prompt = buildVerifyPrompt(body, file.content);

    const raw = await callProviderCli(prompt);
    const result = parseProviderJsonResponse<EntryFileVerification>(raw);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: { duration_ms: duration },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Verify Entry Error]', message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
