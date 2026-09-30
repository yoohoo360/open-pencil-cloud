import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

import { IS_BROWSER } from '@open-pencil/core/constants'

import {
  documentAccessStore,
  hasDocumentCapability
} from '#react/app/document/access'
import { setPropertiesTab } from '#react/app/shell/properties-tab'

/** Figma-style workspace modes: browse, design, or inspect/code. */
export type WorkspaceMode = 'view' | 'edit' | 'dev'

const STORAGE_KEY = 'open-pencil:workspace-mode'

function readStoredMode(): WorkspaceMode {
  if (!IS_BROWSER) return 'edit'
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'view' || raw === 'edit' || raw === 'dev') return raw
  } catch {
    /* ignore */
  }
  return 'edit'
}

function writeStoredMode(mode: WorkspaceMode) {
  if (!IS_BROWSER) return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export const workspaceModeStore = atom<WorkspaceMode>(readStoredMode())

export function getWorkspaceMode(): WorkspaceMode {
  return workspaceModeStore.get()
}

export function useWorkspaceMode(): WorkspaceMode {
  return useStore(workspaceModeStore)
}

/** True when the user may mutate the document in the current mode + ACL. */
export function canMutateInWorkspaceMode(
  mode: WorkspaceMode = workspaceModeStore.get()
): boolean {
  if (mode !== 'edit') return false
  return hasDocumentCapability(documentAccessStore.get(), 'edit')
}

export function useCanMutateWorkspace(): boolean {
  const mode = useWorkspaceMode()
  const access = useStore(documentAccessStore)
  if (mode !== 'edit') return false
  return hasDocumentCapability(access, 'edit')
}

/**
 * Apply a workspace mode. Without edit ACL, Edit is coerced to View.
 * Entering Dev opens the Code tab; entering Edit opens Design.
 */
export function setWorkspaceMode(mode: WorkspaceMode) {
  const canEdit = hasDocumentCapability(documentAccessStore.get(), 'edit')
  const next: WorkspaceMode = mode === 'edit' && !canEdit ? 'view' : mode
  if (workspaceModeStore.get() === next) return
  workspaceModeStore.set(next)
  writeStoredMode(next)
  if (next === 'dev') setPropertiesTab('code')
  else setPropertiesTab('design')
}

/** Keep mode coherent when ACL loads or changes (viewers cannot stay in Edit). */
export function syncWorkspaceModeWithAccess() {
  const canEdit = hasDocumentCapability(documentAccessStore.get(), 'edit')
  if (!canEdit && workspaceModeStore.get() === 'edit') setWorkspaceMode('view')
}

documentAccessStore.listen(() => {
  syncWorkspaceModeWithAccess()
})
