import type { TestId } from './test-id'

/** React prop helper for integration test IDs. */
export function testIdProps(value?: TestId | null): Record<string, string> | undefined {
  return value ? { 'data-test-id': value } : undefined
}

/** @deprecated Vue directive — use {@link testIdProps} in React. */
export const vTestId = testIdProps
