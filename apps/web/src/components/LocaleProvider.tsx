'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Locale = 'en' | 'he';

interface LocaleContext {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<LocaleContext | null>(null);

const STORAGE_KEY = 'nbk_locale';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === 'en' || saved === 'he') {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return (
    <Ctx.Provider value={{ locale, dir: locale === 'he' ? 'rtl' : 'ltr', setLocale }}>{children}</Ctx.Provider>
  );
}

export function useLocale(): LocaleContext {
  return (
    useContext(Ctx) ?? {
      locale: 'en',
      dir: 'ltr',
      setLocale: () => {},
    }
  );
}

/**
 * Tiny bilingual lookup helper. The dashboard isn't fully translated yet — this
 * is the foundation: components use t('agents', 'סוכנים') style fallback, so
 * any string that hasn't been translated still renders in English.
 */
export function useT(): (en: string, he?: string) => string {
  const { locale } = useLocale();
  return (en: string, he?: string) => (locale === 'he' && he ? he : en);
}
