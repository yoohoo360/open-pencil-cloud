import type { TestId } from './test-id'

function applyTestId(el: HTMLElement, value?: TestId | null) {
  if (value) el.setAttribute('data-test-id', value)
  else el.removeAttribute('data-test-id')
}

/**
 * Utility for imperatively setting test IDs on DOM elements.
 * In React, prefer using the `data-test-id` prop directly.
 * This helper is retained for compatibility with headless SDK consumers.
 */
export const vTestId = {
  mounted(el: HTMLElement, value?: TestId | null) {
    applyTestId(el, value)
  },
  updated(el: HTMLElement, value?: TestId | null) {
    applyTestId(el, value)
  }
}
