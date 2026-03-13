import { getTranslation, interpolate } from './index';

describe('getTranslation', () => {
  it('should return English translation for a top-level key', () => {
    const result = getTranslation('en', 'common.appName');
    expect(result).toBe('GitHub Code Analyzer');
  });

  it('should return Chinese translation for a top-level key', () => {
    const result = getTranslation('zh', 'common.appName');
    expect(result).toBe('GitHub 代码分析器');
  });

  it('should return deeply nested key', () => {
    const result = getTranslation('en', 'analyze.aiResult.title');
    expect(result).toBe('AI Analysis');
  });

  it('should return the key itself for missing keys', () => {
    const result = getTranslation('en', 'nonexistent.key');
    expect(result).toBe('nonexistent.key');
  });

  it('should return key for partially matching path', () => {
    const result = getTranslation('en', 'common.nonexistent');
    expect(result).toBe('common.nonexistent');
  });

  it('should handle empty key', () => {
    const result = getTranslation('en', '');
    expect(result).toBe('');
  });
});

describe('interpolate', () => {
  it('should replace single placeholder', () => {
    const result = interpolate('Hello {name}', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('should replace multiple placeholders', () => {
    const result = interpolate('{count} of {total}', { count: 5, total: 10 });
    expect(result).toBe('5 of 10');
  });

  it('should replace same placeholder multiple times', () => {
    const result = interpolate('{x} + {x} = {y}', { x: 2, y: 4 });
    expect(result).toBe('2 + 2 = 4');
  });

  it('should leave string unchanged if no matching placeholders', () => {
    const result = interpolate('No placeholders here', { key: 'value' });
    expect(result).toBe('No placeholders here');
  });
});

describe('i18n completeness', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require('./en.json');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zh = require('./zh.json');

  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...getAllKeys(obj[key] as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  it('should have identical key structures in en and zh', () => {
    const enKeys = getAllKeys(en).sort();
    const zhKeys = getAllKeys(zh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('should have no empty values in en', () => {
    const enKeys = getAllKeys(en);
    for (const key of enKeys) {
      const value = getTranslation('en', key);
      expect(value).not.toBe('');
    }
  });

  it('should have no empty values in zh', () => {
    const zhKeys = getAllKeys(zh);
    for (const key of zhKeys) {
      const value = getTranslation('zh', key);
      expect(value).not.toBe('');
    }
  });
});
