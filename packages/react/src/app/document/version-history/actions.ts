type VersionHistoryActions = {
  open: () => void
  saveNamed: () => void
}

let actions: VersionHistoryActions | null = null

export function registerVersionHistoryActions(next: VersionHistoryActions | null): () => void {
  actions = next
  return () => {
    if (actions === next) actions = null
  }
}

export function openVersionHistory(): void {
  actions?.open()
}

export function saveNamedDocumentVersion(): void {
  actions?.saveNamed()
}
