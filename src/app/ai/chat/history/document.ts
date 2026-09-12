import type { EditorStore } from '@/app/editor/active-store'

import type { ConversationStore } from './types'

export type ChatDocumentEditor = Pick<
  EditorStore,
  'getSourceIdentity' | 'getStorageBinding' | 'getDocumentFilePath' | 'getRecoveryId'
> & { state: { documentName: string } }

const fileIds = new WeakMap<FileSystemFileHandle, string>()

export async function resolveChatDocumentId(
  editor: ChatDocumentEditor,
  store: ConversationStore
): Promise<string> {
  const handle = editor.getSourceIdentity().handle
  if (handle && !editor.getStorageBinding() && !editor.getDocumentFilePath()) {
    const id = fileIds.get(handle) ?? (await store.resolveFile(handle))
    fileIds.set(handle, id)
    return id
  }
  return chatDocumentId(editor)
}

/** Runtime tab IDs are not document identities. Recovery IDs survive untitled recovery. */
export function chatDocumentId(editor: ChatDocumentEditor): string {
  const binding = editor.getStorageBinding()
  if (binding) return `storage:${JSON.stringify([binding.providerId, binding.documentId])}`
  const path = editor.getDocumentFilePath()
  if (path) return `file:${path}`
  const handle = editor.getSourceIdentity().handle
  if (handle) {
    const id = fileIds.get(handle)
    if (id) return id
  }
  return `recovery:${editor.getRecoveryId()}`
}
