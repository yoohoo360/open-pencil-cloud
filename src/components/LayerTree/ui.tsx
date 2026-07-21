import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { ComponentUI } from '@/components/ui/types'
import type { LayerTreeTheme } from '@/theme/layer-tree'

export type LayerTreeUI = ComponentUI<LayerTreeTheme>

const LayerTreeUIContext = createContext<LayerTreeUI | undefined>(undefined)
LayerTreeUIContext.displayName = 'LayerTreeUI'

export function LayerTreeUIProvider({
  ui,
  children
}: {
  ui?: LayerTreeUI
  children: ReactNode
}) {
  const value = useMemo(() => ui, [ui])
  return <LayerTreeUIContext.Provider value={value}>{children}</LayerTreeUIContext.Provider>
}

export function useLayerTreeUI(): LayerTreeUI | undefined {
  return useContext(LayerTreeUIContext)
}
