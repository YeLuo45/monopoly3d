import en from './locales/en';
import zh from './locales/zh';

export const LOCALES = {
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '中文' },
};

const STORAGE_KEY = 'monopoly3d_locale';

function getDefaultLocale() {
  // Try stored preference
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES[stored]) return stored;
  } catch (_) {}

  // Try browser language
  const browserLang = navigator.language.split('-')[0];
  if (LOCALES[browserLang]) return browserLang;

  return 'en';
}

let currentLocale = getDefaultLocale();

const translations = { en, zh };

export function t(key) {
  const locale = translations[currentLocale] || translations.en;
  return locale[key] || translations.en[key] || key;
}

export function setLocale(locale) {
  if (LOCALES[locale]) {
    currentLocale = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (_) {}
    // Dispatch event so components can re-render
    window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
  }
}

export function getLocale() {
  return currentLocale;
}

export function getLocaleName(locale) {
  return LOCALES[locale]?.nativeName || locale;
}
