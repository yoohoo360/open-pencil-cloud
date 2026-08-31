type CommentActions = {
  open: () => void
  close: () => void
  toggle: () => void
  cancel: () => boolean
}

let actions: CommentActions | null = null

export function registerCommentActions(next: CommentActions | null): () => void {
  actions = next
  return () => {
    if (actions === next) actions = null
  }
}

export function openComments(): void {
  actions?.open()
}

export function closeComments(): void {
  actions?.close()
}

export function toggleComments(): void {
  actions?.toggle()
}

export function cancelCommentInteraction(): boolean {
  return actions?.cancel() ?? false
}
