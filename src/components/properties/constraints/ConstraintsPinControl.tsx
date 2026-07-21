import { memo, useCallback, useMemo, type MouseEvent } from 'react'
import { tv } from 'tailwind-variants'

import { constraintPins, useI18n } from '@open-pencil/react'

import Tip from '@/components/ui/Tip'
import constraintsTheme from '@/theme/constraints'

import type {
  ConstraintsControlActions,
  ConstraintAxis,
  ConstraintEdge,
  ConstraintValue
} from '@open-pencil/react'

type PinPosition = keyof (typeof constraintsTheme)['variants']['pinPosition']

type PinItem = {
  axis: ConstraintAxis
  edge: ConstraintEdge | 'center'
  position: PinPosition
  label: string
  active: boolean
}

export type ConstraintsPinControlProps = {
  horizontal: ConstraintValue
  vertical: ConstraintValue
  actions: ConstraintsControlActions
}

export const ConstraintsPinControl = memo(function ConstraintsPinControl({
  horizontal,
  vertical,
  actions
}: ConstraintsPinControlProps) {
  const { panels } = useI18n()
  const constraintStyles = useMemo(() => tv(constraintsTheme), [])
  const horizontalPins = useMemo(() => constraintPins(horizontal), [horizontal])
  const verticalPins = useMemo(() => constraintPins(vertical), [vertical])
  const diagramStyles = useMemo(
    () => constraintStyles({ scale: horizontal === 'SCALE' || vertical === 'SCALE' }),
    [constraintStyles, horizontal, vertical]
  )

  const pins = useMemo<PinItem[]>(
    () => [
      {
        axis: 'horizontal',
        edge: 'leading',
        position: 'horizontalLeading',
        label: panels.constraintLeft,
        active: horizontalPins.leading
      },
      {
        axis: 'horizontal',
        edge: 'trailing',
        position: 'horizontalTrailing',
        label: panels.constraintRight,
        active: horizontalPins.trailing
      },
      {
        axis: 'vertical',
        edge: 'leading',
        position: 'verticalLeading',
        label: panels.constraintTop,
        active: verticalPins.leading
      },
      {
        axis: 'vertical',
        edge: 'trailing',
        position: 'verticalTrailing',
        label: panels.constraintBottom,
        active: verticalPins.trailing
      },
      {
        axis: 'horizontal',
        edge: 'center',
        position: 'horizontalCenter',
        label: panels.constraintHorizontalCenter,
        active: horizontalPins.center
      },
      {
        axis: 'vertical',
        edge: 'center',
        position: 'verticalCenter',
        label: panels.constraintVerticalCenter,
        active: verticalPins.center
      }
    ],
    [horizontalPins, panels, verticalPins]
  )

  const pinStyles = useCallback(
    (pin: PinItem) => constraintStyles({ active: pin.active, pinPosition: pin.position }),
    [constraintStyles]
  )

  const activate = useCallback(
    (pin: PinItem, event: MouseEvent<HTMLButtonElement>) => {
      if (pin.edge === 'center') actions.setCenter(pin.axis)
      else actions.togglePin(pin.axis, pin.edge, event.shiftKey)
    },
    [actions]
  )

  return (
    <div
      role="group"
      aria-label={panels.constraints}
      data-slot="diagram"
      data-scale={horizontal === 'SCALE' || vertical === 'SCALE' || undefined}
      className={diagramStyles.diagram()}
    >
      {pins.map((pin) => {
        const styles = pinStyles(pin)
        return (
          <Tip key={pin.position} label={pin.label}>
            <button
              type="button"
              data-slot="pin"
              data-axis={pin.axis}
              data-edge={pin.edge}
              aria-label={pin.label}
              aria-pressed={pin.active}
              className={styles.pin()}
              onClick={(event) => activate(pin, event)}
            >
              <span className={styles.pinMark()} />
            </button>
          </Tip>
        )
      })}
      {horizontalPins.scale || verticalPins.scale ? (
        <span data-slot="scale-badge" className={diagramStyles.scaleBadge()}>
          {panels.constraintScale}
        </span>
      ) : null}
    </div>
  )
})

ConstraintsPinControl.displayName = 'ConstraintsPinControl'
export default ConstraintsPinControl
