import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useBehaviour } from '#react/controls/behaviour/use'
import { useI18n } from '#react/i18n'
import { BEHAVIOUR_KINDS, type BehaviourKind } from '@open-pencil/scene-graph'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

function kindLabel(panels: ReturnType<typeof useI18n>['panels'], kind: BehaviourKind): string {
  const labels: Record<BehaviourKind, string> = {
    button: panels.behaviourButton,
    textField: panels.behaviourTextField,
    textarea: panels.behaviourTextarea,
    numberField: panels.behaviourNumberField,
    toggle: panels.behaviourToggle,
    switch: panels.behaviourSwitch,
    checkbox: panels.behaviourCheckbox,
    radio: panels.behaviourRadio,
    radioGroup: panels.behaviourRadioGroup,
    toggleGroup: panels.behaviourToggleGroup,
    slider: panels.behaviourSlider,
    progress: panels.behaviourProgress,
    tabs: panels.behaviourTabs,
    collapsible: panels.behaviourCollapsible,
    accordion: panels.behaviourAccordion
  }
  return labels[kind]
}

/** Behaviour of the selected main component or component set — Vue `BehaviourPanel` parity. */
export function BehaviourPanel() {
  const behaviour = useBehaviour()
  const { panels } = useI18n()
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!behaviour.active) return null

  const control = behaviour.behaviour

  return (
    <PanelSection
      label={panels.behaviour}
      titleClass="text-component"
      actions={
        control ? (
          <IconButton label={panels.removeBehaviour} onClick={() => behaviour.remove()}>
            <Minus className="size-3.5" />
          </IconButton>
        ) : (
          <div className="relative">
            <IconButton
              label={panels.addBehaviour}
              active={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
            >
              <Plus className="size-3.5" />
            </IconButton>
            {pickerOpen ? (
              <div className="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded border border-border bg-panel py-1 shadow-lg">
                {BEHAVIOUR_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="flex w-full px-2 py-1.5 text-left text-[11px] text-surface hover:bg-hover"
                    onClick={() => {
                      behaviour.add(kind)
                      setPickerOpen(false)
                    }}
                  >
                    {kindLabel(panels, kind)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    >
      {control ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium text-surface">
            {kindLabel(panels, control.kind)}
          </div>
          {control.values.map((value) => (
            <BehaviourValueRow
              key={value.id}
              id={value.id}
              type={value.type}
              propertyId={'propertyId' in value ? value.propertyId : null}
              options={'options' in value ? value.options : []}
              onBind={(propertyId) => {
                if (value.type === 'text') behaviour.bindText(value.id, propertyId)
                else if (value.type === 'boolean') behaviour.bindValue(value.id, propertyId)
              }}
              onCreate={() => {
                if (value.type === 'text') behaviour.createText(value.id, value.id)
                else if (value.type === 'boolean') behaviour.createVariant(value.id, value.id)
              }}
            />
          ))}
          {control.parts.map((part) => (
            <BehaviourValueRow
              key={part.id}
              id={part.id}
              type="slot"
              propertyId={part.propertyId}
              options={part.options}
              onBind={(propertyId) => behaviour.bindPart(part.id, propertyId)}
              onCreate={() => behaviour.createPart(part.id, part.id)}
            />
          ))}
          <div className="flex items-center gap-1">
            <span className="w-20 shrink-0 truncate text-[11px] text-muted">
              {panels.behaviourStates}
            </span>
            {control.states.propertyId ? (
              <span className="min-w-0 flex-1 truncate text-[11px] text-surface">
                {control.states.options.find((item) => item.id === control.states.propertyId)
                  ?.name ?? control.states.propertyId}
              </span>
            ) : (
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-[11px] text-component hover:bg-component/10"
                onClick={() => behaviour.createStates()}
              >
                {panels.behaviourAddStates}
              </button>
            )}
          </div>
          {control.missing.length > 0 ? (
            <p className="text-[10px] text-muted">
              {panels.behaviourNextStep({ names: control.missing.join(', ') })}
            </p>
          ) : (
            <p className="text-[10px] text-muted">{panels.behaviourComplete}</p>
          )}
        </div>
      ) : (
        <p className="py-1 text-[10px] text-muted">{panels.addBehaviour}</p>
      )}
    </PanelSection>
  )
}

function BehaviourValueRow({
  id,
  type,
  propertyId,
  options,
  onBind,
  onCreate
}: {
  id: string
  type: string
  propertyId: string | null
  options: { id: string; name: string }[]
  onBind: (propertyId: string) => void
  onCreate: () => void
}) {
  const { panels } = useI18n()
  return (
    <div className="flex items-center gap-1">
      <span className="w-20 shrink-0 truncate text-[11px] text-muted">{id}</span>
      {propertyId ? (
        <select
          className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1 text-[11px] text-surface"
          value={propertyId}
          onChange={(event) => onBind(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : options.length > 0 ? (
        <select
          className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1 text-[11px] text-surface"
          value=""
          onChange={(event) => {
            if (event.target.value) onBind(event.target.value)
          }}
        >
          <option value="">
            {type === 'slot' ? panels.behaviourChooseSlot : panels.behaviourChooseProperty}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-[11px] text-component hover:bg-component/10"
          onClick={onCreate}
        >
          {type === 'text'
            ? panels.behaviourAddTextLayer
            : type === 'slot'
              ? panels.behaviourAddSlot({ name: id })
              : panels.behaviourAddVariants}
        </button>
      )}
    </div>
  )
}
