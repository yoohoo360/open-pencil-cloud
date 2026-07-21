import { memo } from 'react'

import { openExternalLink } from '@/app/shell/ui'
import AppTextButton from '@/components/ui/AppTextButton'

export type ProviderSettingsLinkProps = {
  href: string
  children: React.ReactNode
}

export const ProviderSettingsLink = memo(function ProviderSettingsLink({
  href,
  children
}: ProviderSettingsLinkProps) {
  return (
    <AppTextButton size="xs" underline onClick={() => openExternalLink(href)}>
      {children}
    </AppTextButton>
  )
})

ProviderSettingsLink.displayName = 'ProviderSettingsLink'
export default ProviderSettingsLink
