import { ChevronRight } from 'lucide-react'

import { FRAME_PRESET_CATEGORIES, type FramePreset } from '#react/app/editor/frame-presets'
import { useEditorStore } from '#react/app/editor/store'
import { useI18n } from '#react/i18n'

export function FramePresetsSection() {
  const store = useEditorStore()
  const { panels } = useI18n()

  function createFrame(preset: FramePreset) {
    store.createFrameFromPreset(preset)
  }

  return (
    <section aria-label={panels.frame}>
      <div className="flex h-10 items-center border-b border-border px-3">
        <span role="heading" aria-level={2} className="text-[11px] font-semibold text-surface">
          {panels.frame}
        </span>
      </div>
      {FRAME_PRESET_CATEGORIES.map((category) => (
        <details
          key={category.id}
          className="group border-b border-border"
          open={category.id === 'phone'}
        >
          <summary className="flex h-9 w-full cursor-pointer list-none items-center gap-1.5 px-3 text-left text-[11px] text-surface hover:bg-hover [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-3 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{panels[category.labelKey]}</span>
          </summary>
          <div className="pb-1.5">
            {category.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-frame-preset={preset.id}
                className="flex h-7 w-full items-center gap-2 px-7 text-left text-[11px] text-surface hover:bg-hover"
                onClick={() => createFrame(preset)}
              >
                <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {preset.width} × {preset.height}
                </span>
              </button>
            ))}
          </div>
        </details>
      ))}
    </section>
  )
}
