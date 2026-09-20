import { appCredentialServices } from '@/app/settings/credentials/app'

import { storageProviderRegistry } from '../providers'
import type { StorageProviderID } from '../types'

/** Test a snapshot without changing saved preferences or exposing saved secrets to the form. */
export function testStorageDraft(
  providerID: StorageProviderID,
  preferences: Record<string, string>,
  credentials: Record<string, string>,
  cleared: string[]
) {
  const provider = storageProviderRegistry.get(providerID)
  const fields = new Set(provider.credentialFields.map((field) => field.id))
  const adapter = storageProviderRegistry.createAdapter(providerID, {
    preferences,
    credentials: {
      resolve(reference) {
        if (
          reference.integrationId !== providerID ||
          reference.profileId !== 'default' ||
          !fields.has(reference.field)
        ) {
          throw new Error('Unexpected storage credential reference')
        }
        if (cleared.includes(reference.field)) return Promise.resolve(null)
        const replacement = credentials[reference.field]?.trim()
        return replacement
          ? Promise.resolve(replacement)
          : appCredentialServices.resolver.resolve(reference)
      }
    }
  })
  return adapter.testConnection()
}
