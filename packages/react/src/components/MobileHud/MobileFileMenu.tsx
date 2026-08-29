import { Menu } from 'lucide-react'

import { menu, useMenuUI } from '#react/components/ui/menu'
import { useMobileHudContext } from '#react/components/MobileHud/context'

export function MobileFileMenu() {
  const hud = useMobileHudContext()
  const menuCls = useMenuUI({
    content: 'w-48 rounded-xl p-1.5 shadow-xl',
    item: 'w-full gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 active:bg-hover'
  })
  const itemCls = menu({ justify: 'start' }).item({ class: menuCls.item })

  return (
    <details className="relative">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <button
          type="button"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
        >
          <Menu className="size-3.5 text-surface" />
        </button>
      </summary>
      <div className={`absolute right-0 z-20 mt-2 ${menuCls.content}`}>
        {hud.menuItems.map((item) => (
          <button key={item.label} type="button" className={itemCls} onClick={() => item.action()}>
            <item.icon className="size-4 text-muted" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </details>
  )
}
