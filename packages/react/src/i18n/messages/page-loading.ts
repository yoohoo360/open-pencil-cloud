import { i18n } from '#react/i18n/create'

export const pageLoadingMessageDefaults = {
  /** Read / download / decode — open prelude. */
  loadingDocument: 'Parsing document',
  preparingNodes: 'Parsing nodes',
  expandingComponents: 'Expanding components',
  resolvingFonts: 'Loading fonts',
  computingLayout: 'Computing layout',
  preparingCanvas: 'Preparing canvas'
} as const

export type PageLoadingMessageKey = keyof typeof pageLoadingMessageDefaults

export const pageLoadingMessages = i18n('page-loading', pageLoadingMessageDefaults)
