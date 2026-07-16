/**
 * App toast API — backed by the framework-agnostic React toast store so Vue
 * and React shells share the same notifications during migration.
 */
import { toastStore, type Toast, type ToastVariant } from '@/react_app/toast/toastStore'

export type { Toast, ToastVariant }

export const toast = {
  show: toastStore.show,
  remove: toastStore.remove,
  setupGlobalErrorHandler: toastStore.setupGlobalErrorHandler,
  TOAST_DURATION: toastStore.TOAST_DURATION,
  /** @deprecated Prefer React AppToast + toastStore.subscribe; kept for Vue callers. */
  get toasts() {
    return {
      get value() {
        return toastStore.getSnapshot()
      }
    }
  }
}
