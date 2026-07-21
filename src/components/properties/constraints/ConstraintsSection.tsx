import { ConstraintsControlRoot, MIXED, useI18n } from '@open-pencil/react'
import { memo, useCallback, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import ConstraintsPinControl from '@/components/properties/constraints/ConstraintsPinControl'
import AppSelect from '@/components/ui/AppSelect'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelSection from '@/components/ui/panel/PanelSection'
import constraintsTheme from '@/theme/constraints'

import type { ConstraintType } from '@open-pencil/scene-graph'

type ConstraintSelectValue = ConstraintType | 'MIXED'

export const ConstraintsSection = memo(function ConstraintsSection() {
  const { panels } = useI18n()
  const styles = useMemo(() => tv(constraintsTheme)(), [])

  const horizontalOptions = useMemo<Array<{ value: ConstraintSelectValue; label: string }>>(
    () => [
      { value: 'MIN', label: panels.constraintLeft },
      { value: 'CENTER', label: panels.constraintCenter },
      { value: 'MAX', label: panels.constraintRight },
      { value: 'STRETCH', label: panels.constraintLeftAndRight },
      { value: 'SCALE', label: panels.constraintScale }
    ],
    [panels]
  )

  const verticalOptions = useMemo<Array<{ value: ConstraintSelectValue; label: string }>>(
    () => [
      { value: 'MIN', label: panels.constraintTop },
      { value: 'CENTER', label: panels.constraintCenter },
      { value: 'MAX', label: panels.constraintBottom },
      { value: 'STRETCH', label: panels.constraintTopAndBottom },
      { value: 'SCALE', label: panels.constraintScale }
    ],
    [panels]
  )

  const optionsWithMixed = useCallback(
    (options: Array<{ value: ConstraintSelectValue; label: string }>, mixed: boolean) =>
      mixed ? [{ value: 'MIXED' as const, label: panels.mixed }, ...options] : options,
    [panels.mixed]
  )

  return (
    <ConstraintsControlRoot>
      {({ active, horizontal, vertical, actions }) =>
        active ? (
          <PanelSection label={panels.constraints} data-property="constraints">
            <div className={styles.root()}>
              <ConstraintsPinControl
                horizontal={horizontal}
                vertical={vertical}
                actions={actions}
              />
              <div className={styles.selects()}>
                <PanelFieldGroup label={panels.horizontalConstraint}>
                  <AppSelect
                    value={horizontal === MIXED ? 'MIXED' : horizontal}
                    label={panels.horizontalConstraint}
                    options={optionsWithMixed(horizontalOptions, horizontal === MIXED)}
                    onValueChange={(value: ConstraintSelectValue) =>
                      value !== 'MIXED' && actions.setHorizontal(value)
                    }
                  />
                </PanelFieldGroup>
                <PanelFieldGroup label={panels.verticalConstraint}>
                  <AppSelect
                    value={vertical === MIXED ? 'MIXED' : vertical}
                    label={panels.verticalConstraint}
                    options={optionsWithMixed(verticalOptions, vertical === MIXED)}
                    onValueChange={(value: ConstraintSelectValue) =>
                      value !== 'MIXED' && actions.setVertical(value)
                    }
                  />
                </PanelFieldGroup>
              </div>
            </div>
          </PanelSection>
        ) : null
      }
    </ConstraintsControlRoot>
  )
})

ConstraintsSection.displayName = 'ConstraintsSection'
export default ConstraintsSection
