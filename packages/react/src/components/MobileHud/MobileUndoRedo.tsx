import { Redo2, Undo2 } from 'lucide-react'

import { Tip } from '#react/components/ui/Tip'
import { useMobileHudContext } from '#react/components/MobileHud/context'
import { useI18n } from '#react/i18n'

export function MobileUndoRedo() {
  const { commands } = useI18n()
  const hud = useMobileHudContext()
  return (
    <div className="flex gap-1.5">
      <Tip label={commands.undo}>
        <button
          type="button"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
          onClick={hud.undo}
        >
          <Undo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
      <Tip label={commands.redo}>
        <button
          type="button"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
          onClick={hud.redo}
        >
          <Redo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
    </div>
  )
}
