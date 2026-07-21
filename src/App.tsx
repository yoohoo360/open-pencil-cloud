import * as Tooltip from '@radix-ui/react-tooltip'
import { memo, useEffect, type ReactNode } from 'react'
import { Outlet } from 'react-router'

import { EditorProvider, useI18n } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import { useAppTheme } from '@/app/shell/theme'
import { scheduleStartupUpdateCheck } from '@/app/shell/updater'
import AppToast from '@/components/Shell/AppToast'

export const App = memo(function App() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  useAppTheme()

  useEffect(() => {
    document.title = 'OpenPencil'
  }, [])

  useEffect(() => {
    toast.setupGlobalErrorHandler()
    scheduleStartupUpdateCheck(dialogs)
  }, [dialogs])

  return (
    <EditorProvider editor={store}>
      <Tooltip.Provider delayDuration={400}>
        <Outlet />
        <AppToast />
      </Tooltip.Provider>
    </EditorProvider>
  )
})

App.displayName = 'App'

export default App

// Keep a typed children helper for storybook/wrappers.
export type AppShellProps = { children?: ReactNode }
