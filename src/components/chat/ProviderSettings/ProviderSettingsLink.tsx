import { openExternalLink } from '@/app/shell/ui'
import { AppTextButton } from '@/components/ui/AppTextButton'
import type { ReactNode } from 'react'

export function ProviderSettingsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <AppTextButton size="xs" underline onClick={() => openExternalLink(href)}>
      {children}
    </AppTextButton>
  )
}
