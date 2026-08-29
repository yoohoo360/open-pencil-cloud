import { tv } from 'tailwind-variants'
import type { MouseEvent } from 'react'

import type { ConstraintType } from '@open-pencil/scene-graph'

import { constraintPins, useConstraints, type ConstraintValue } from '#react/controls/constraints'
import { MIXED } from '#react/controls/mixed'
import { AppSelect } from '#react/components/ui/AppSelect'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { Tip } from '#react/components/ui/Tip'
import { useI18n } from '#react/i18n'
import constraintsTheme from '#react/theme/constraints'

type ConstraintSelectValue = ConstraintType | 'MIXED'
type PinPosition = keyof (typeof constraintsTheme)['variants']['pinPosition']

export function ConstraintsSection() {
  const constraints = useConstraints()
  const { panels } = useI18n()
  const styles = tv(constraintsTheme)()
  if (!constraints.active) return null

  const horizontalOptions: Array<{ value: ConstraintSelectValue; label: string }> = [
    { value: 'MIN', label: panels.constraintLeft },
    { value: 'CENTER', label: panels.constraintCenter },
    { value: 'MAX', label: panels.constraintRight },
    { value: 'STRETCH', label: panels.constraintLeftAndRight },
    { value: 'SCALE', label: panels.constraintScale }
  ]
  const verticalOptions: Array<{ value: ConstraintSelectValue; label: string }> = [
    { value: 'MIN', label: panels.constraintTop },
    { value: 'CENTER', label: panels.constraintCenter },
    { value: 'MAX', label: panels.constraintBottom },
    { value: 'STRETCH', label: panels.constraintTopAndBottom },
    { value: 'SCALE', label: panels.constraintScale }
  ]

  function withMixed(
    options: Array<{ value: ConstraintSelectValue; label: string }>,
    mixed: boolean
  ) {
    return mixed ? [{ value: 'MIXED' as const, label: panels.mixed }, ...options] : options
  }

  return (
    <PanelSection label={panels.constraints}>
      <div className={styles.root()}>
        <ConstraintsPinControl
          horizontal={constraints.horizontal}
          vertical={constraints.vertical}
          onTogglePin={constraints.togglePin}
          onSetCenter={constraints.setCenter}
        />
        <div className={styles.selects()}>
          <PanelFieldGroup label={panels.horizontalConstraint}>
            <AppSelect
              label={panels.horizontalConstraint}
              value={constraints.horizontal === MIXED ? 'MIXED' : constraints.horizontal}
              options={withMixed(horizontalOptions, constraints.horizontal === MIXED)}
              onChange={(value) => {
                if (value !== 'MIXED') constraints.setHorizontal(value)
              }}
            />
          </PanelFieldGroup>
          <PanelFieldGroup label={panels.verticalConstraint}>
            <AppSelect
              label={panels.verticalConstraint}
              value={constraints.vertical === MIXED ? 'MIXED' : constraints.vertical}
              options={withMixed(verticalOptions, constraints.vertical === MIXED)}
              onChange={(value) => {
                if (value !== 'MIXED') constraints.setVertical(value)
              }}
            />
          </PanelFieldGroup>
        </div>
      </div>
    </PanelSection>
  )
}

function ConstraintsPinControl({
  horizontal,
  vertical,
  onTogglePin,
  onSetCenter
}: {
  horizontal: ConstraintValue
  vertical: ConstraintValue
  onTogglePin: ReturnType<typeof useConstraints>['togglePin']
  onSetCenter: ReturnType<typeof useConstraints>['setCenter']
}) {
  const { panels } = useI18n()
  const constraintStyles = tv(constraintsTheme)
  const horizontalPins = constraintPins(horizontal)
  const verticalPins = constraintPins(vertical)
  const diagramStyles = constraintStyles({
    scale: horizontal === 'SCALE' || vertical === 'SCALE'
  })
  const pins: Array<{
    axis: 'horizontal' | 'vertical'
    edge: 'leading' | 'trailing' | 'center'
    position: PinPosition
    label: string
    active: boolean
  }> = [
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
  ]

  function activate(
    pin: (typeof pins)[number],
    event: MouseEvent<HTMLButtonElement>
  ) {
    if (pin.edge === 'center') onSetCenter(pin.axis)
    else onTogglePin(pin.axis, pin.edge, event.shiftKey)
  }

  return (
    <div
      role="group"
      aria-label={panels.constraints}
      data-slot="diagram"
      data-scale={horizontal === 'SCALE' || vertical === 'SCALE' || undefined}
      className={diagramStyles.diagram()}
    >
      {pins.map((pin) => {
        const pinStyles = constraintStyles({ active: pin.active, pinPosition: pin.position })
        return (
          <Tip key={pin.position} label={pin.label}>
            <button
              type="button"
              data-slot="pin"
              data-axis={pin.axis}
              data-edge={pin.edge}
              aria-label={pin.label}
              aria-pressed={pin.active}
              className={pinStyles.pin()}
              onClick={(event) => activate(pin, event)}
            >
              <span className={pinStyles.pinMark()} />
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
}
