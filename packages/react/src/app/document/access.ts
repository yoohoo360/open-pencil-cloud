import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

/** GitHub-style roles on any resource. */
export type AccessRole = 'read' | 'write' | 'admin'

export type DocumentCapability =
  | 'view'
  | 'edit'
  | 'comment'
  | 'copy'
  | 'duplicate'
  | 'export'
  | 'share'
  | 'manage_access'
  | 'delete'

export type ResourceGrant = {
  id?: string
  principal_type: 'user' | 'team'
  principal_id: string
  principal_name?: string
  principal_username?: string
  principal_email?: string
  role: AccessRole
  granted_by?: string
  created_at?: number
  owner?: boolean
}

export type DocumentAccessSnapshot = {
  resource_type: string
  resource_id: string
  resource_key: string
  owner_id?: string
  organization_id?: string
  allow_copy: boolean
  personal: boolean
  my_role: AccessRole
  capabilities: DocumentCapability[]
  grants: ResourceGrant[]
  /** @deprecated use grants */
  members?: ResourceGrant[]
}

export type DocumentPermissionRequest = {
  id: string
  resource_type?: string
  resource_id: string
  resource_key?: string
  resource_name?: string
  requester_id: string
  requester_name?: string
  requester_username?: string
  requester_email?: string
  requested_role: 'read' | 'write'
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  reviewed_by?: string
  reviewed_at?: number
  created_at?: number
}

const emptyCaps: DocumentCapability[] = ['view']

export const documentAccessStore = atom<DocumentAccessSnapshot | null>(null)

/** Opens the document Share dialog from menu / mobile HUD. */
export const documentShareDialogOpen = atom(false)

export function setDocumentAccess(snapshot: DocumentAccessSnapshot | null) {
  documentAccessStore.set(snapshot)
}

export function openDocumentShareDialog() {
  documentShareDialogOpen.set(true)
}

export function closeDocumentShareDialog() {
  documentShareDialogOpen.set(false)
}

export function useDocumentAccess() {
  return useStore(documentAccessStore)
}

export function useDocumentShareDialogOpen() {
  return useStore(documentShareDialogOpen)
}

export function hasDocumentCapability(
  snapshot: DocumentAccessSnapshot | null | undefined,
  capability: DocumentCapability
): boolean {
  if (!snapshot) return true
  return snapshot.capabilities.includes(capability)
}

export function documentCapabilitiesOrDefault(
  snapshot: DocumentAccessSnapshot | null | undefined
): DocumentCapability[] {
  return snapshot?.capabilities ?? emptyCaps
}

export const DOCUMENT_RESOURCE_TYPE = 'document'
