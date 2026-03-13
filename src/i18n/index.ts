import en from './en.json';
import zh from './zh.json';

export type Locale = 'en' | 'zh';

const translations: Record<Locale, Record<string, unknown>> = { en, zh };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

export function getTranslation(locale: Locale, key: string): string {
  return getNestedValue(translations[locale] ?? translations.en, key);
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}
