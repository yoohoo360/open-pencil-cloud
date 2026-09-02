import { atom } from 'nanostores'

import { isTauri } from '@/app/tauri/env'
import type { ToastVariant } from '@/components/ui/toast'

export type { ToastVariant } from '@/components/ui/toast'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
  /** Number of times this message has been raised since it appeared. */
  count: number
}

const TOAST_DURATION = 3000
const ERROR_TOAST_DURATION = 10000
const TOAST_STACK_LIMIT = 5

export const $toasts = atom<Toast[]>([])
let nextId = 0
let errorHandlersInitialized = false

function push(message: string, variant: ToastVariant) {
  const current = $toasts.get()
  const existing = current.find((t) => t.message === message && t.variant === variant)
  if (existing) {
    existing.count += 1
    existing.id = ++nextId
    $toasts.set([...current])
    return
  }
  const next = [...current, { id: ++nextId, message, variant, count: 1 }]
  if (next.length > TOAST_STACK_LIMIT) {
    next.splice(0, next.length - TOAST_STACK_LIMIT)
  }
  $toasts.set(next)
}

function info(message: string) {
  push(message, 'default')
}

function warning(message: string) {
  push(message, 'warning')
}

function error(message: string) {
  push(message, 'error')
}

function remove(id: number) {
  $toasts.set($toasts.get().filter((t) => t.id !== id))
}

function setupGlobalErrorHandler() {
  if (errorHandlersInitialized) return
  errorHandlersInitialized = true

  window.addEventListener('error', (e) => {
    error(e.message || 'An unexpected error occurred')
  })
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
    error(msg || 'An unexpected error occurred')
  })
}

export const toast = {
  info,
  warning,
  error,
  remove,
  $toasts,
  setupGlobalErrorHandler,
  TOAST_DURATION,
  ERROR_TOAST_DURATION
}

export async function openExternalLink(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank')
  }
}
export function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}
export function decodeTauriStderr(raw: Uint8Array | number[] | string): string {
  if (typeof raw === 'string') return raw
  return new TextDecoder().decode(raw instanceof Uint8Array ? raw : new Uint8Array(raw))
}
