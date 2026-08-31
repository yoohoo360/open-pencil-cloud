import type { DocumentVersion } from '#react/app/document/version-history/types'

export type VersionHistoryRow =
  | { type: 'current' }
  | { type: 'autosave-group'; versions: DocumentVersion[] }
  | { type: 'named'; version: DocumentVersion }

export function groupVersionHistory(
  autosaves: DocumentVersion[],
  named: DocumentVersion[]
): VersionHistoryRow[] {
  const rows: VersionHistoryRow[] = [{ type: 'current' }]
  if (autosaves.length > 0) {
    rows.push({ type: 'autosave-group', versions: autosaves })
  }
  for (const version of named) {
    rows.push({ type: 'named', version })
  }
  return rows
}
