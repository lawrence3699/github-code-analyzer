const DEFAULT_MAX_LEN = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive JSON traversal requires any
export function truncateJsonValues(obj: any, maxLen: number = DEFAULT_MAX_LEN): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    if (obj.length > maxLen) {
      const remaining = obj.length - maxLen;
      return `${obj.slice(0, maxLen)}···(remaining ${remaining} bytes)`;
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => truncateJsonValues(item, maxLen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = truncateJsonValues(value, maxLen);
  }
  return result;
}
