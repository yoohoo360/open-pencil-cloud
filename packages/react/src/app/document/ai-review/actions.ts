type AiReviewActions = {
  open: () => void
  close: () => void
  toggle: () => void
}

let actions: AiReviewActions | null = null

export function registerAiReviewActions(
  next: AiReviewActions | null
): () => void {
  actions = next
  return () => {
    if (actions === next) actions = null
  }
}

export function openAiReview(): void {
  actions?.open()
}

export function closeAiReview(): void {
  actions?.close()
}

export function toggleAiReview(): void {
  actions?.toggle()
}
