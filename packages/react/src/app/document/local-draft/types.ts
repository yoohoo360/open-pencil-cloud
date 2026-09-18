export type LocalDraftMeta = {
  key: string
  documentName: string
  savedAt: string
  sceneVersion: number
  figByteLength: number
  updatedAt: string
}

export type LocalDraft = LocalDraftMeta & {
  figBytes: Uint8Array
}

export type LocalDraftWriteInput = {
  key: string
  documentName: string
  savedAt: string
  sceneVersion: number
  figBytes: Uint8Array
}
