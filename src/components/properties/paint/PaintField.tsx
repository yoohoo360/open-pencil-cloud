import { memo, useMemo, type ReactNode } from 'react'
import { tv, type ClassValue } from 'tailwind-variants'

import NumberField from '@/components/inputs/NumberField'
import type { ComponentUI } from '@/components/ui/types'
import paintFieldTheme from '@/theme/paint-field'

export type PaintFieldUI = ComponentUI<typeof paintFieldTheme>

export type PaintFieldProps = {
  opacity: number
  opacityLabel: string
  className?: ClassValue
  ui?: PaintFieldUI
  preview?: ReactNode
  value?: ReactNode
  binding?: ReactNode
  onOpacityChange?: (opacity: number) => void
}

export const PaintField = memo(function PaintField({
  opacity,
  opacityLabel,
  className,
  ui,
  preview,
  value,
  binding,
  onOpacityChange
}: PaintFieldProps) {
  const styles = useMemo(() => tv(paintFieldTheme)(), [])

  return (
    <div
      className={styles.root({ class: [ui?.root, className] })}
      data-slot="paint-field"
      data-property="paint"
    >
      <div className={styles.preview({ class: ui?.preview })} data-slot="preview">
        {preview}
      </div>
      <div className={styles.value({ class: ui?.value })} data-slot="value">
        {value}
      </div>
      <div className={styles.divider({ class: ui?.divider })} data-slot="divider" />
      <NumberField
        className={styles.opacity({ class: ui?.opacity })}
        aria-label={opacityLabel}
        suffix="%"
        value={Math.round(opacity * 100)}
        min={0}
        max={100}
        ui={{
          root: 'h-full rounded-none border-0 bg-transparent shadow-none',
          leading: 'hidden'
        }}
        data-property="opacity"
        onValueChange={(next) =>
          onOpacityChange?.(Math.max(0, Math.min(1, next / 100)))
        }
      />
      {binding ? (
        <div className={styles.binding({ class: ui?.binding })} data-slot="binding">
          {binding}
        </div>
      ) : null}
    </div>
  )
})

PaintField.displayName = 'PaintField'
export default PaintField
