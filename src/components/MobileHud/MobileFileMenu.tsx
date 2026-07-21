import IconLucideMenu from '~icons/lucide/menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { memo } from 'react'

import { useMobileHudContext } from '@/components/MobileHud/context'
import { menu, useMenuUI } from '@/components/ui/menu'

export const MobileFileMenu = memo(function MobileFileMenu() {
  const hud = useMobileHudContext()
  const menuCls = useMenuUI({
    content: 'w-48 rounded-xl p-1.5 shadow-xl',
    item: 'w-full gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 active:bg-hover'
  })

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
        >
          <IconLucideMenu className="size-3.5 text-surface" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} side="bottom" align="end" className={menuCls.content}>
          {hud.menuItems.map((item) => {
            const ItemIcon = item.icon
            return (
              <DropdownMenu.Item
                key={item.label}
                className={menu({ justify: 'start' }).item({ class: menuCls.item })}
                onSelect={item.action}
              >
                <ItemIcon className="size-4 text-muted" />
                <span>{item.label}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
})

MobileFileMenu.displayName = 'MobileFileMenu'
export default MobileFileMenu
