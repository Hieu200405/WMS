import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi/translation.json';
import en from './locales/en/translation.json';

const resources = {
  vi: { translation: vi },
  en: { translation: en },
};

const DEFAULT_LANG = 'vi';

export function bootstrapI18n() {
  if (i18n.isInitialized) return i18n;

  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
}

export default i18n;
