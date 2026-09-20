import { nextTick } from 'vue'

/** Move focus only after validation has rendered its field feedback. */
export async function focusInvalidField(container: HTMLElement | null | undefined) {
  await nextTick()
  container?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
