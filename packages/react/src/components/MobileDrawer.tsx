import { useEffect, useRef, useState } from 'react'
import { Code, Layers, SlidersHorizontal, Sparkles } from 'lucide-react'

import { useI18n } from '#react/i18n'
import { ChatPanel } from '#react/components/ChatPanel'
import { CodePanel } from '#react/components/CodePanel'
import { DesignPanel } from '#react/components/DesignPanel'
import { LayerTree } from '#react/components/LayerTree/LayerTree'
import { PagesPanel } from '#react/components/PagesPanel'
import { HALF_FRAC, HUD_TOP } from '#react/constants'
import { useEditorStore } from '#react/app/editor/store'
import { IS_BROWSER } from '@open-pencil/core/constants'

type Snap = 'closed' | 'half' | 'full'
type DrawerTab = 'layers' | 'design' | 'code' | 'ai'

export function MobileDrawer() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const headerRef = useRef<HTMLElement>(null)
  const [headerH, setHeaderH] = useState(56)
  const [windowH, setWindowH] = useState(() => (IS_BROWSER ? window.innerHeight : 800))

  useEffect(() => {
    const header = headerRef.current
    if (header) setHeaderH(header.getBoundingClientRect().height)
    function onResize() {
      setWindowH(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const snap = store.state.mobileDrawerSnap

  function getDrawerTab(): DrawerTab {
    if (store.state.activeRibbonTab === 'code') return 'code'
    if (store.state.activeRibbonTab === 'ai') return 'ai'
    return store.state.panelMode === 'design' ? 'design' : 'layers'
  }

  function setDrawerTab(tab: DrawerTab) {
    if (tab === 'code' || tab === 'ai') {
      store.state.activeRibbonTab = tab
      store.notify()
      return
    }
    store.state.activeRibbonTab = 'panels'
    store.state.panelMode = tab
    store.notify()
  }

  const isOpen = snap !== 'closed'

  function snapHeight(s: Snap): number {
    switch (s) {
      case 'full':
        return windowH - HUD_TOP
      case 'half':
        return Math.round(windowH * HALF_FRAC)
      default:
        return headerH
    }
  }

  const [targetHeight, setTargetHeight] = useState(() => snapHeight(snap))

  function toggleTab(tab: DrawerTab) {
    if (getDrawerTab() === tab && isOpen) {
      store.state.mobileDrawerSnap = 'closed'
      store.notify()
      setTargetHeight(snapHeight('closed'))
      return
    }
    setDrawerTab(tab)
    if (!isOpen) {
      store.state.mobileDrawerSnap = 'half'
      store.notify()
      setTargetHeight(snapHeight('half'))
    }
  }

  const drawerTab = getDrawerTab()
  const triggerClass =
    'flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-xs transition-colors outline-none select-none data-[state=active]:text-accent'

  return (
    <div
      data-test-id="mobile-drawer"
      className="fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col rounded-t-3xl bg-panel pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      style={{
        height: `${targetHeight}px`,
        transition: 'height 200ms ease-out'
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <nav ref={headerRef} aria-label={dialogs.mobilePanelNavigation} className="flex shrink-0 flex-col">
          <div className="flex w-full justify-center pt-2">
            <div className="h-1 w-8 rounded-full bg-muted/40" />
          </div>
          <div className="flex w-full items-center px-2 py-2">
            <button
              type="button"
              data-test-id="mobile-ribbon-layers"
              data-state={drawerTab === 'layers' ? 'active' : undefined}
              className={triggerClass}
              onClick={() => toggleTab('layers')}
            >
              <Layers className="size-4" />
            </button>
            <button
              type="button"
              data-test-id="mobile-ribbon-design"
              data-state={drawerTab === 'design' ? 'active' : undefined}
              className={triggerClass}
              onClick={() => toggleTab('design')}
            >
              <SlidersHorizontal className="size-4" />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              data-test-id="mobile-ribbon-code"
              data-state={drawerTab === 'code' ? 'active' : undefined}
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('code')}
            >
              <Code className="size-4" />
            </button>
            <button
              type="button"
              data-test-id="mobile-ribbon-ai"
              data-state={drawerTab === 'ai' ? 'active' : undefined}
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('ai')}
            >
              <Sparkles className="size-4" />
            </button>
          </div>
        </nav>
        <div data-test-id="mobile-drawer-content" className="min-h-0 flex-1 overflow-y-auto">
          {drawerTab === 'layers' ? (
            <div data-test-id="mobile-drawer-layers" className="flex h-full flex-col">
              <PagesPanel />
              <div className="border-t border-border" />
              <header className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase">
                Layers
              </header>
              <LayerTree className="min-h-0 flex-1" />
            </div>
          ) : null}
          {drawerTab === 'design' ? (
            <div data-test-id="mobile-drawer-design" className="flex h-full flex-col">
              <DesignPanel />
            </div>
          ) : null}
          {drawerTab === 'code' ? (
            <div data-test-id="mobile-drawer-code" className="flex h-full flex-col">
              <CodePanel active={isOpen && drawerTab === 'code'} />
            </div>
          ) : null}
          {drawerTab === 'ai' ? (
            <div data-test-id="mobile-drawer-ai" className="flex h-full flex-col">
              <ChatPanel />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
