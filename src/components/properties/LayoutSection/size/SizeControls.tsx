import { memo, useMemo } from 'react'

import { useI18n } from '@open-pencil/react'

import SizeAxisField from '@/components/properties/LayoutSection/size/SizeAxisField'
import SizeLimitField from '@/components/properties/LayoutSection/size/SizeLimitField'
import { useLayoutContext } from '@/components/properties/LayoutSection/types'
import type { SizeLimitItem } from '@/components/properties/LayoutSection/size/types'
import PanelGrid from '@/components/ui/panel/PanelGrid'

export const SizeControls = memo(function SizeControls() {
  const ctx = useLayoutContext()
  const { panels } = useI18n()

  const sizeLimits = useMemo<SizeLimitItem[]>(
    () => [
      {
        prop: 'minWidth',
        icon: panels.minWidthShort,
        label: panels.minWidthShort,
        setLabel: panels.setToCurrentWidth,
        removeLabel: panels.removeMinWidth
      },
      {
        prop: 'maxWidth',
        icon: panels.maxWidthShort,
        label: panels.maxWidthShort,
        setLabel: panels.setToCurrentWidth,
        removeLabel: panels.removeMaxWidth
      },
      {
        prop: 'minHeight',
        icon: panels.minHeightShort,
        label: panels.minHeightShort,
        setLabel: panels.setToCurrentHeight,
        removeLabel: panels.removeMinHeight
      },
      {
        prop: 'maxHeight',
        icon: panels.maxHeightShort,
        label: panels.maxHeightShort,
        setLabel: panels.setToCurrentHeight,
        removeLabel: panels.removeMaxHeight
      }
    ],
    [
      panels.maxHeightShort,
      panels.maxWidthShort,
      panels.minHeightShort,
      panels.minWidthShort,
      panels.removeMaxHeight,
      panels.removeMaxWidth,
      panels.removeMinHeight,
      panels.removeMinWidth,
      panels.setToCurrentHeight,
      panels.setToCurrentWidth
    ]
  )

  const visibleSizeLimits = useMemo(
    () => sizeLimits.filter((item) => ctx.node[item.prop] != null),
    [ctx.node, sizeLimits]
  )

  return (
    <>
      <PanelGrid columns="two">
        <SizeAxisField axis="width" icon="W" label={panels.width} />
        <SizeAxisField axis="height" icon="H" label={panels.height} />
      </PanelGrid>

      {visibleSizeLimits.length > 0 ? (
        <PanelGrid columns="two" className="mt-1.5">
          {visibleSizeLimits.map((item) => (
            <SizeLimitField key={item.prop} item={item} />
          ))}
        </PanelGrid>
      ) : null}
    </>
  )
})

SizeControls.displayName = 'SizeControls'
export default SizeControls
