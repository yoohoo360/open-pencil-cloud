import { MIXED } from '#react/controls/node-props/use'
import {
  NumberFieldInput,
  NumberFieldLeading,
  NumberFieldRoot,
  NumberFieldUnit,
  NumberFieldValue
} from '#react/primitives/NumberField'
import { useState } from 'react'

export function NumberFieldDemo() {
  const [value, setValue] = useState<number | symbol>(24)
  const [mixed] = useState<number | symbol>(MIXED)
  return (
    <div className="w-full max-w-[520px] rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] p-5 text-[var(--vp-c-text-1)]">
      <NumberFieldRoot
        modelValue={value}
        min={0}
        max={200}
        step={2}
        ariaLabel="Interactive number field"
        onValueChange={setValue}
      >
        {({ attrs, editing, actions }) => (
          <div
            {...attrs}
            data-story-control
            className="flex h-[26px] w-56 items-center rounded bg-[var(--vp-c-bg-alt)] text-xs"
            onPointerDown={(event) => !editing && actions.startScrub(event.nativeEvent)}
          >
            <NumberFieldLeading className="px-2">W</NumberFieldLeading>
            <NumberFieldInput
              data-test-id="interactive-number-input"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            <NumberFieldValue className="min-w-0 flex-1" />
            <NumberFieldUnit className="pr-1">px</NumberFieldUnit>
          </div>
        )}
      </NumberFieldRoot>
      <NumberFieldRoot modelValue={mixed} ariaLabel="Mixed number field">
        <div className="mt-3">
          <NumberFieldValue />
        </div>
      </NumberFieldRoot>
      <NumberFieldRoot modelValue={16} ariaLabel="Disabled number field" disabled>
        <div className="mt-3">
          <NumberFieldValue />
        </div>
      </NumberFieldRoot>
      <NumberFieldRoot modelValue={8} ariaLabel="Bound number field" bound>
        <div className="mt-3">
          <NumberFieldValue />
        </div>
      </NumberFieldRoot>
    </div>
  )
}
