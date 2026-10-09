import type { LibraryCatalogSource } from '#react/app/libraries/catalog/routed'

interface LibraryPreferences {
  catalogSource: LibraryCatalogSource
  priorities: Record<string, number>
}

const STORAGE_KEY = 'open-pencil:library-preferences'

function readPreferences(): LibraryPreferences {
  if (typeof localStorage === 'undefined') {
    return { catalogSource: 'local', priorities: {} }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { catalogSource: 'local', priorities: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { catalogSource: 'local', priorities: {} }
    const record = parsed as Partial<LibraryPreferences>
    const catalogSource = record.catalogSource === 'storage' ? 'storage' : 'local'
    const priorities =
      record.priorities && typeof record.priorities === 'object' ? { ...record.priorities } : {}
    return { catalogSource, priorities }
  } catch {
    return { catalogSource: 'local', priorities: {} }
  }
}

function writePreferences(next: LibraryPreferences): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function readLibraryCatalogSource(): LibraryCatalogSource {
  return readPreferences().catalogSource
}

export function writeLibraryCatalogSource(source: LibraryCatalogSource): void {
  const current = readPreferences()
  writePreferences({ ...current, catalogSource: source })
}

export function readLibraryPriority(libraryId: string): number {
  const value = readPreferences().priorities[libraryId]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function writeLibraryPriority(libraryId: string, priority: number): void {
  if (!Number.isFinite(priority)) throw new TypeError('Library priority must be finite')
  const current = readPreferences()
  writePreferences({
    ...current,
    priorities: { ...current.priorities, [libraryId]: priority }
  })
}
