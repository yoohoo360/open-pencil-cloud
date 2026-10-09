const ACTIVE_ORG_KEY = 'open-pencil.active-org-id'

/** Normalize CHAR(36)/UUID ids — DB may pad with spaces. */
export function normalizeOrgId(id: string | null | undefined): string {
  return id?.trim() ?? ''
}

export function readActiveOrgId(): string {
  try {
    return normalizeOrgId(localStorage.getItem(ACTIVE_ORG_KEY))
  } catch {
    return ''
  }
}

export function writeActiveOrgId(id: string): void {
  try {
    const normalized = normalizeOrgId(id)
    if (normalized) localStorage.setItem(ACTIVE_ORG_KEY, normalized)
    else localStorage.removeItem(ACTIVE_ORG_KEY)
  } catch {
    /* ignore */
  }
}
