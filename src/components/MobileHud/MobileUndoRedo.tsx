import { useI18n } from '@open-pencil/react'

import { Tip } from '@/components/ui/Tip'
import { useMobileHudContext } from '@/components/MobileHud/context'

import IconLucideUndo2 from '~icons/lucide/undo-2'
import IconLucideRedo2 from '~icons/lucide/redo-2'

export function MobileUndoRedo() {
  const hud = useMobileHudContext()
  const { commands } = useI18n()

  return (
    <div className="flex gap-1.5">
      <Tip label={commands.undo}>
        <button
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
          onClick={hud.undo}
        >
          <IconLucideUndo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
      <Tip label={commands.redo}>
        <button
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
          onClick={hud.redo}
        >
          <IconLucideRedo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
    </div>
  )
}
