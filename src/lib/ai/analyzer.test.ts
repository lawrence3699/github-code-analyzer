import { parseJsonResponse, stripMarkdownFences, validateRequiredFields } from './analyzer';

describe('stripMarkdownFences', () => {
  it('should strip ```json ... ``` fences', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it('should strip ``` ... ``` fences without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it('should return unchanged if no fences', () => {
    const input = '{"key": "value"}';
    expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
  });

  it('should handle whitespace around fences', () => {
    const input = '  ```json\n  {"key": "value"}  \n```  ';
    const result = stripMarkdownFences(input);
    expect(result.trim()).toContain('"key"');
  });
});

describe('parseJsonResponse', () => {
  const validJson = JSON.stringify({
    project_name: 'test',
    primary_languages: [{ language: 'TS', percentage: 100, file_count: 5 }],
    tech_stack: [{ category: 'framework', name: 'Next.js', confidence: 0.9 }],
    entry_files: [{ path: 'src/index.ts', reason: 'main entry', type: 'main' }],
    summary: 'A test project',
  });

  it('should parse valid JSON', () => {
    const result = parseJsonResponse(validJson);
    expect(result.project_name).toBe('test');
  });

  it('should parse JSON wrapped in markdown fences', () => {
    const result = parseJsonResponse(`\`\`\`json\n${validJson}\n\`\`\``);
    expect(result.project_name).toBe('test');
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseJsonResponse('not json at all')).toThrow();
  });

  it('should throw on empty string', () => {
    expect(() => parseJsonResponse('')).toThrow();
  });

  it('should throw on JSON missing required fields', () => {
    expect(() => parseJsonResponse('{"project_name": "test"}')).toThrow('missing required fields');
  });
});

describe('validateRequiredFields', () => {
  const validResult = {
    project_name: 'test',
    primary_languages: [{ language: 'TS', percentage: 100, file_count: 5 }],
    tech_stack: [{ category: 'framework' as const, name: 'Next.js', confidence: 0.9 }],
    entry_files: [{ path: 'src/index.ts', reason: 'main entry', type: 'main' as const }],
    summary: 'A test project',
  };

  it('should not throw for valid result', () => {
    expect(() => validateRequiredFields(validResult)).not.toThrow();
  });

  it('should throw if project_name is missing', () => {
    const rest = { ...validResult };
    delete (rest as Record<string, unknown>).project_name;
    expect(() => validateRequiredFields(rest)).toThrow();
  });

  it('should throw if primary_languages is missing', () => {
    const rest = { ...validResult };
    delete (rest as Record<string, unknown>).primary_languages;
    expect(() => validateRequiredFields(rest)).toThrow();
  });

  it('should throw if primary_languages is not an array', () => {
    expect(() => validateRequiredFields({ ...validResult, primary_languages: 'not array' })).toThrow();
  });

  it('should throw if summary is missing', () => {
    const rest = { ...validResult };
    delete (rest as Record<string, unknown>).summary;
    expect(() => validateRequiredFields(rest)).toThrow();
  });
});
