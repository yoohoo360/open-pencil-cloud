import { useSyncExternalStore } from 'react'

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
// Errors stay long enough to read but always self-clean, so a
// stuck/repeating error source can't pile up over the canvas.
const ERROR_TOAST_DURATION = 10000
// Hard cap on stacked toasts. Older toasts drop off when a new one would
// exceed this. Belt-and-suspenders against any error source we missed.
const TOAST_STACK_LIMIT = 5

let toastSnapshot: Toast[] = []
const toastListeners = new Set<() => void>()
let nextId = 0
let errorHandlersInitialized = false

function emitToasts() {
  for (const listener of toastListeners) listener()
}

export function subscribeToasts(listener: () => void) {
  toastListeners.add(listener)
  return () => toastListeners.delete(listener)
}

export function getToastsSnapshot() {
  return toastSnapshot
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribeToasts, getToastsSnapshot, getToastsSnapshot)
}

/** @deprecated Use useToasts() in React components. */
const toasts = {
  get value() {
    return toastSnapshot
  }
}

function push(message: string, variant: ToastVariant) {
  // Dedupe: if the same message+variant is already visible, increment
  // its repeat count instead of stacking a duplicate. Prevents the
  // cascade-on-every-frame failure mode where a single unhealthy
  // event source floods the viewport.
  const existing = toastSnapshot.find((t) => t.message === message && t.variant === variant)
  if (existing) {
    toastSnapshot = toastSnapshot.map((toast) =>
      toast === existing ? { ...toast, count: toast.count + 1, id: ++nextId } : toast
    )
    emitToasts()
    return
  }
  toastSnapshot = [...toastSnapshot, { id: ++nextId, message, variant, count: 1 }].slice(
    -TOAST_STACK_LIMIT
  )
  emitToasts()
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
  toastSnapshot = toastSnapshot.filter((toast) => toast.id !== id)
  emitToasts()
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
  toasts,
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
