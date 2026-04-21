import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageSchema = Record<string, any>

const i18n = createI18n<[MessageSchema], 'zh' | 'en'>({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  },
  missingWarn: false,
  fallbackWarn: false
})

export default i18n
