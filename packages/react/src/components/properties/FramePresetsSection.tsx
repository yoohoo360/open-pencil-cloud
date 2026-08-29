import { useEditorStore } from '#react/app/editor/store'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useI18n } from '#react/i18n'

const QUICK_FRAME_PRESETS = [
  { name: 'Desktop', width: 1440, height: 1024 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Phone', width: 390, height: 844 },
  { name: 'Frame', width: 400, height: 400 }
] as const

export function FramePresetsSection() {
  const store = useEditorStore()
  const { panels } = useI18n()

  return (
    <section aria-label={panels.frame}>
      <div className="flex h-10 items-center border-b border-border px-3">
        <span role="heading" aria-level={2} className="text-[11px] font-semibold text-surface">
          {panels.frame}
        </span>
      </div>
      <PanelSection label={panels.framePreset}>
        <div className="flex flex-col gap-1">
          {QUICK_FRAME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="flex h-7 items-center justify-between rounded px-2 text-left text-[11px] text-surface hover:bg-hover"
              onClick={() => store.createFrameFromPreset(preset)}
            >
              <span>{preset.name}</span>
              <span className="text-muted">
                {preset.width} × {preset.height}
              </span>
            </button>
          ))}
        </div>
      </PanelSection>
    </section>
  )
}
