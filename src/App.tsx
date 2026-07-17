import { useEffect } from 'react'
import { RouterProvider } from 'react-router'

import { useHead } from '@unhead/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'

import { scheduleStartupUpdateCheck } from '@/app/shell/updater'
import { useAppTheme } from '@/app/shell/theme'
import { toast } from '@/app/shell/ui'
import { useI18n } from '@open-pencil/react'

import { AppToast } from '@/components/Shell/AppToast'
import { router } from './router'

export default function App() {
  useHead({ titleTemplate: (title) => (title ? `${title} — OpenPencil` : 'OpenPencil') })

  const { dialogs } = useI18n()

  // Keep theme applied reactively
  useAppTheme()

  useEffect(() => {
    toast.setupGlobalErrorHandler()
    scheduleStartupUpdateCheck(dialogs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TooltipProvider delayDuration={400}>
      <RouterProvider router={router} />
      <AppToast />
    </TooltipProvider>
  )
}
