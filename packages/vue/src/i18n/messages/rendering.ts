import { i18n } from '#vue/i18n/create'

export const renderingMessageDefaults = {
  settingsTitle: 'Rendering',
  settingsDescription: 'Choose how OpenPencil presents large canvases.',
  progressiveTiled: 'Progressive rendering',
  progressiveTiledDescription: 'Updates large canvases in smaller tiles as you navigate.',
  experimental: 'Experimental',
  reloadRequired: 'Reload OpenPencil to apply this change.',
  urlOverride:
    'The current session renderer is controlled by a URL override. Your saved preference applies when the override is removed.'
} as const

export const renderingMessages = i18n('rendering', renderingMessageDefaults)
