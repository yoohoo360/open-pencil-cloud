export type ToastVariant = 'default' | 'warning' | 'error'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

export const TOAST_DURATION = 3000

type Listener = () => void

const listeners = new Set<Listener>()
let toasts: Toast[] = []
let nextId = 0
let errorHandlersInitialized = false

function emit() {
  for (const listener of listeners) listener()
}

function show(message: string, variant: ToastVariant = 'default') {
  toasts = [...toasts, { id: ++nextId, message, variant }]
  emit()
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return toasts
}

function setupGlobalErrorHandler() {
  if (errorHandlersInitialized) return
  errorHandlersInitialized = true

  window.addEventListener('error', (e) => {
    show(e.message || 'An unexpected error occurred', 'error')
  })
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
    show(msg || 'An unexpected error occurred', 'error')
  })
}

/** Framework-agnostic toast API shared by Vue shim and React AppToast. */
export const toastStore = {
  show,
  remove,
  subscribe,
  getSnapshot,
  setupGlobalErrorHandler,
  TOAST_DURATION
}
