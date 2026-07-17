import { useStore } from '@nanostores/react'
import type { Store, StoreValue } from 'nanostores'

import { locale, setLocale, AVAILABLE_LOCALES, LOCALE_LABELS } from '#react/i18n/locale'
import {
  menuMessages,
  commandMessages,
  toolMessages,
  panelMessages,
  variableTypeMessages,
  pageMessages,
  dialogMessages
} from '#react/i18n/messages'

/**
 * Reactive i18n hooks for OpenPencil React components.
 */
export function useI18nNamespace<MessagesStore extends Store>(messages: MessagesStore) {
  return useStore(messages) as StoreValue<MessagesStore>
}

export function useMenuMessages() {
  return useI18nNamespace(menuMessages)
}

export function useCommandMessages() {
  return useI18nNamespace(commandMessages)
}

export function useToolMessages() {
  return useI18nNamespace(toolMessages)
}

export function usePanelMessages() {
  return useI18nNamespace(panelMessages)
}

export function useVariableTypeMessages() {
  return useI18nNamespace(variableTypeMessages)
}

export function usePageMessages() {
  return useI18nNamespace(pageMessages)
}

export function useDialogMessages() {
  return useI18nNamespace(dialogMessages)
}

export function useI18n() {
  return {
    menu: useMenuMessages(),
    commands: useCommandMessages(),
    tools: useToolMessages(),
    panels: usePanelMessages(),
    variableTypes: useVariableTypeMessages(),
    pages: usePageMessages(),
    dialogs: useDialogMessages(),
    locale: useStore(locale),
    availableLocales: AVAILABLE_LOCALES,
    localeLabels: LOCALE_LABELS,
    setLocale
  }
}
