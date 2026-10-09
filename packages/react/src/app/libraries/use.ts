import { useSyncExternalStore } from 'react'

import {
  getLibraryService,
  type EnabledLibraryAsset,
  type LibraryService
} from '#react/app/libraries/service'
import type { LibrarySummary, LibraryUpdateImpact, LibraryUpdateSummary } from '@open-pencil/core/library'

export function useLibraryService(): LibraryService {
  return getLibraryService()
}

function useLibraryRevision(): number {
  const service = getLibraryService()
  return useSyncExternalStore(
    (onStoreChange) => service.subscribe(onStoreChange),
    () => service.revision,
    () => service.revision
  )
}

export function useLibrarySummaries(): LibrarySummary[] {
  const service = getLibraryService()
  useLibraryRevision()
  return service.summariesSnapshot
}

export function useLibraryEnabledAssets(): EnabledLibraryAsset[] {
  const service = getLibraryService()
  useLibraryRevision()
  return service.enabledAssetsSnapshot
}

export function useLibraryUpdates(): {
  updates: LibraryUpdateSummary[]
  impacts: Map<string, LibraryUpdateImpact>
} {
  const service = getLibraryService()
  useLibraryRevision()
  return {
    updates: service.updatesSnapshot,
    impacts: service.updateImpactsSnapshot
  }
}
