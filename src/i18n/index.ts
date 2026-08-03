import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: en },
    es: { translation: es },
  },
  lng: 'en-US',
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false }, // no estamos en el DOM, no hace falta escapar HTML
})

export default i18n
