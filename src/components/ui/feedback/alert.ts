import { tv, type VariantProps } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import alertTheme from '@/theme/feedback/alert'

export const alert = tv(alertTheme)
export type AlertUI = ComponentUI<typeof alertTheme>
export interface AlertProps {
  heading: string
  description?: string
  tone?: VariantProps<typeof alert>['tone']
  ui?: AlertUI
}
