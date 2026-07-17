import { type ReactNode } from 'react'

import { useLayout } from '#react/controls/layout/use'
import { LayoutControlsProvider } from '#react/primitives/LayoutControls/context'
import type { LayoutControlsContext } from '#react/primitives/LayoutControls/context'

interface LayoutControlsRootProps {
  children?: ReactNode | ((props: LayoutControlsContext) => ReactNode)
}

export function LayoutControlsRoot({ children }: LayoutControlsRootProps) {
  const ctx = useLayout() as LayoutControlsContext

  return (
    <LayoutControlsProvider value={ctx}>
      {typeof children === 'function' ? children(ctx) : children}
    </LayoutControlsProvider>
  )
}
