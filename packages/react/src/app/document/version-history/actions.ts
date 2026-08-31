type VersionHistoryActions = {
  open: () => void
  close: () => void
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

export function closeVersionHistory(): void {
  actions?.close()
}

export function saveNamedDocumentVersion(): void {
  actions?.saveNamed()
}
