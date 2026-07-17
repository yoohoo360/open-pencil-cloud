import { createContext, useContext } from 'react'

import type { useCollab } from '@/app/collab/use'

export type CollabReturn = ReturnType<typeof useCollab>

export const CollabContext = createContext<CollabReturn | undefined>(undefined)

export const COLLAB_KEY = CollabContext

export function useCollabInjected(): CollabReturn | undefined {
  return useContext(CollabContext)
}
