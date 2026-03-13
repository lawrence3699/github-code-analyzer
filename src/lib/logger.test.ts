import { truncateJsonValues } from './logger';

describe('truncateJsonValues', () => {
  it('should not modify short string values', () => {
    const input = { name: 'hello', count: 42 };
    const result = truncateJsonValues(input);
    expect(result).toEqual({ name: 'hello', count: 42 });
  });

  it('should truncate string values exceeding maxLen', () => {
    const longString = 'a'.repeat(600);
    const input = { data: longString };
    const result = truncateJsonValues(input);
    expect(result.data).toHaveLength(500 + '···(remaining 100 bytes)'.length);
    expect(result.data).toContain('···(remaining 100 bytes)');
  });

  it('should truncate nested string values', () => {
    const longString = 'b'.repeat(700);
    const input = { nested: { deep: { value: longString } } };
    const result = truncateJsonValues(input);
    expect(result.nested.deep.value).toContain('···(remaining 200 bytes)');
  });

  it('should handle arrays with long strings', () => {
    const longString = 'c'.repeat(550);
    const input = { list: ['short', longString] };
    const result = truncateJsonValues(input);
    expect(result.list[0]).toBe('short');
    expect(result.list[1]).toContain('···(remaining 50 bytes)');
  });

  it('should not mutate the original object', () => {
    const longString = 'd'.repeat(600);
    const input = { data: longString };
    const originalData = input.data;
    truncateJsonValues(input);
    expect(input.data).toBe(originalData);
  });

  it('should handle null and undefined values', () => {
    const input = { a: null, b: undefined, c: 'ok' };
    const result = truncateJsonValues(input);
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
    expect(result.c).toBe('ok');
  });

  it('should use custom maxLen', () => {
    const input = { data: 'a'.repeat(20) };
    const result = truncateJsonValues(input, 10);
    expect(result.data).toContain('···(remaining 10 bytes)');
  });

  it('should handle empty objects and arrays', () => {
    expect(truncateJsonValues({})).toEqual({});
    expect(truncateJsonValues({ list: [] })).toEqual({ list: [] });
  });
});
