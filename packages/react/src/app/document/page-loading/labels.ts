import {
  pageLoadingMessageDefaults,
  type PageLoadingMessageKey
} from '#react/i18n/messages/page-loading'
import { locale, type Locale } from '#react/i18n/locale'
import de from '#react/i18n/locales/de/page-loading.json'
import es from '#react/i18n/locales/es/page-loading.json'
import fr from '#react/i18n/locales/fr/page-loading.json'
import it from '#react/i18n/locales/it/page-loading.json'
import ja from '#react/i18n/locales/ja/page-loading.json'
import pl from '#react/i18n/locales/pl/page-loading.json'
import ru from '#react/i18n/locales/ru/page-loading.json'
import zhCN from '#react/i18n/locales/zh-cn/page-loading.json'

type PageLoadingCopy = Record<PageLoadingMessageKey, string>

/**
 * Sync catalogs — overlay copy must resolve before async i18n packs load
 * (document open sets `pageLoading.detail` on the first tick).
 */
const CATALOGS: Record<Locale, PageLoadingCopy> = {
  en: { ...pageLoadingMessageDefaults },
  de: de as PageLoadingCopy,
  es: es as PageLoadingCopy,
  fr: fr as PageLoadingCopy,
  it: it as PageLoadingCopy,
  ja: ja as PageLoadingCopy,
  pl: pl as PageLoadingCopy,
  ru: ru as PageLoadingCopy,
  'zh-CN': zhCN as PageLoadingCopy
}

function copy(): PageLoadingCopy {
  return CATALOGS[locale.get()] ?? CATALOGS.en
}

/**
 * Status copy for the shared canvas page-loading overlay.
 * Work phases only — never document / page titles or node counts.
 */
export const pageLoadingLabels = {
  get loadingDocument() {
    return copy().loadingDocument
  },
  get preparingNodes() {
    return copy().preparingNodes
  },
  get expandingComponents() {
    return copy().expandingComponents
  },
  get resolvingFonts() {
    return copy().resolvingFonts
  },
  get computingLayout() {
    return copy().computingLayout
  },
  get preparingCanvas() {
    return copy().preparingCanvas
  }
} as const

/** Map editor prepare progress → overlay status (no page names / node counts). */
export function pageLoadingProgressDetail(
  progress:
    | {
        detail?: string
        phase?: string
        completed?: number
        total?: number
        stage?: string
      }
    | undefined
): string {
  switch (progress?.phase) {
    case 'resolving-fonts':
    case 'resolving-fallbacks':
      return pageLoadingLabels.resolvingFonts
    case 'layout':
      return pageLoadingLabels.computingLayout
    case 'preparing-render':
      return pageLoadingLabels.preparingCanvas
    case 'populating-page': {
      if (progress.stage === 'instances' || progress.stage === 'overrides') {
        return pageLoadingLabels.expandingComponents
      }
      return pageLoadingLabels.preparingNodes
    }
    default:
      return pageLoadingLabels.preparingNodes
  }
}
