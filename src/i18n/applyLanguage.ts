import i18n from '.'

// Código de idioma del backend (general_settings.default_language: 'en' / 'es') -> recurso de i18n.
const LANGUAGE_MAP: Record<string, string> = { es: 'es', en: 'en-US' }

export function applyAppLanguage(language: string) {
  void i18n.changeLanguage(LANGUAGE_MAP[language] ?? language)
}
