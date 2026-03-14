import { NextResponse } from 'next/server';

import { callProviderCli, parseProviderJsonResponse } from '../../../../lib/ai/call-provider';
import type { FunctionAnalysis } from '../../../../types/ai';

interface AnalyzeFunctionRequestBody {
  readonly functionCode: string;
  readonly functionName: string;
  readonly filePath: string;
  readonly repoName: string;
  readonly summary: string;
  readonly primaryLanguages: readonly string[];
  readonly fileList: readonly string[];
}

function validateRequestBody(body: unknown): AnalyzeFunctionRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.functionCode !== 'string' || obj.functionCode.length === 0) {
    throw new Error('functionCode must be a non-empty string');
  }
  if (typeof obj.functionName !== 'string' || obj.functionName.length === 0) {
    throw new Error('functionName must be a non-empty string');
  }
  if (typeof obj.filePath !== 'string' || obj.filePath.length === 0) {
    throw new Error('filePath must be a non-empty string');
  }
  if (typeof obj.repoName !== 'string' || obj.repoName.length === 0) {
    throw new Error('repoName must be a non-empty string');
  }
  if (typeof obj.summary !== 'string') {
    throw new Error('summary must be a string');
  }
  if (!Array.isArray(obj.primaryLanguages)) {
    throw new Error('primaryLanguages must be an array');
  }
  if (!Array.isArray(obj.fileList)) {
    throw new Error('fileList must be an array');
  }

  return {
    functionCode: obj.functionCode,
    functionName: obj.functionName,
    filePath: obj.filePath,
    repoName: obj.repoName,
    summary: obj.summary,
    primaryLanguages: obj.primaryLanguages as readonly string[],
    fileList: obj.fileList as readonly string[],
  };
}

const MAX_FILE_LIST_ITEMS = 500;

function buildAnalyzeFunctionPrompt(body: AnalyzeFunctionRequestBody): string {
  const fileListStr = body.fileList.slice(0, MAX_FILE_LIST_ITEMS).join('\n');

  return `你是一个代码分析专家。分析以下函数中调用的关键子函数。

项目名称：${body.repoName}
项目摘要：${body.summary}
编程语言：${body.primaryLanguages.join(', ')}
函数名：${body.functionName}
所在文件：${body.filePath}

源代码：
---
${body.functionCode}
---

项目文件列表（用于推测子函数所在文件）：
${fileListStr}

要求：
1. 识别调用的关键子函数，不超过20个
2. 排除标准库函数、日志函数、简单getter/setter
3. drillDown: -1=工具函数/不需下钻, 0=不确定, 1=核心业务逻辑需下钻
4. file: 根据函数名和文件列表推测定义文件路径，不确定则null
5. description和summary用中文

仅返回 JSON：
{"function_name":"string","file_path":"string","sub_functions":[{"name":"string","file":"string|null","description":"中文","drillDown":-1|0|1,"category":"core|util|io|config|lifecycle|other"}],"summary":"中文摘要"}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const rawBody: unknown = await request.json();
    const body = validateRequestBody(rawBody);

    const prompt = buildAnalyzeFunctionPrompt(body);
    const raw = await callProviderCli(prompt);
    const result = parseProviderJsonResponse<FunctionAnalysis>(raw);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: { duration_ms: duration },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analyze Function Error]', message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
