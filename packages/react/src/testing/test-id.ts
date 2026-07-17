/** Shared test id attribute used by Playwright (`testIdAttribute: 'data-test-id'`). */
export const TEST_ID_ATTR = 'data-test-id' as const

export function testIdProps(id: string): { 'data-test-id': string } {
  return { 'data-test-id': id }
}

export const TEST_IDS = {
  canvasArea: 'canvas-area',
  canvasElement: 'canvas-element',
  canvasLoading: 'canvas-loading',
  toastItem: 'toast-item',
  toastCopyError: 'toast-copy-error',
  toastClose: 'toast-close',
  reactIslandSmoke: 'react-island-smoke'
} as const
