import { v4 as uuid } from 'uuid'

/** Collab peer/chunk ids via `uuid` (works on plain HTTP; `crypto.randomUUID` does not). */
export function createCollabId(): string {
  return uuid()
}
