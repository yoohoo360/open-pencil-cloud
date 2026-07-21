import { memo, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'
import { FillSwatch as FillSwatchPrimitive, type FillSwatchSlotProps } from '@open-pencil/react'
import type { Fill } from '@open-pencil/scene-graph'

import type { ComponentUI } from '@/components/ui/types'
import fillSwatchTheme from '@/theme/fill-swatch'

export type FillSwatchUI = ComponentUI<typeof fillSwatchTheme>

export type FillSwatchProps = {
  fill: Fill
  label?: string
  ui?: FillSwatchUI
  className?: ClassValue
  children?: ReactNode | ((props: FillSwatchSlotProps) => ReactNode)
} & Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children'>

export const FillSwatch = memo(function FillSwatch({
  fill,
  label,
  ui,
  className,
  children,
  ...rest
}: FillSwatchProps) {
  const styles = useMemo(() => tv(fillSwatchTheme)(), [])

  return (
    <FillSwatchPrimitive
      {...rest}
      fill={fill}
      label={label}
      className={styles.root({ class: [ui?.root, className] })}
    >
      {typeof children === 'function'
        ? children
        : children ??
          ((swatch: FillSwatchSlotProps) => (
            <span
              className={styles.preview({ class: ui?.preview })}
              style={{ background: swatch.background }}
            />
          ))}
    </FillSwatchPrimitive>
  )
})

FillSwatch.displayName = 'FillSwatch'
export default FillSwatch
