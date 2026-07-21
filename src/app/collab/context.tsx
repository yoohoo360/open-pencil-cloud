import { createContext, useContext, type ReactNode } from 'react'

import type { useCollab } from '@/app/collab/use'

export type CollabReturn = ReturnType<typeof useCollab>

const CollabContext = createContext<CollabReturn | null>(null)
CollabContext.displayName = 'Collab'

export const COLLAB_KEY = CollabContext

export type CollabProviderProps = {
  value: CollabReturn
  children?: ReactNode
}

export function CollabProvider({ value, children }: CollabProviderProps) {
  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
}

export function useCollabInjected(): CollabReturn | null {
  return useContext(CollabContext)
}
