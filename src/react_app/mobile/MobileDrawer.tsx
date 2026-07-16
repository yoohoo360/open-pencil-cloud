import * as Tabs from '@radix-ui/react-tabs'
import { Code, Layers, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { applyVueInReact } from 'veaury'

import ChatPanelVue from '@/components/ChatPanel.vue'
import {
  DRAWER_SPRING_DAMPING,
  DRAWER_SPRING_STIFFNESS,
  HALF_FRAC,
  HUD_TOP,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD
} from '@/constants'
import { LayerTree } from '@/react_app/layers/LayerTree'
import { PagesPanel } from '@/react_app/pages/PagesPanel'
import { CodePanel } from '@/react_app/panels/CodePanel'
import { DesignPanel } from '@/react_app/properties/DesignPanel'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { useEditor, useEditorNotify, useEditorVersion } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type Snap = 'closed' | 'half' | 'full'
type DrawerTab = 'layers' | 'design' | 'code' | 'ai'

type AppEditor = Editor & {
  state: Editor['state'] & {
    mobileDrawerSnap: Snap
    activeRibbonTab: 'panels' | 'code' | 'ai'
    panelMode: 'layers' | 'design'
  }
}

const ChatPanel = applyVueInReact(ChatPanelVue) as ComponentType

function MobileDrawerInner() {
  const store = useEditor() as AppEditor
  useEditorVersion()
  const notify = useEditorNotify()
  const headerRef = useRef<HTMLElement | null>(null)
  const [headerH, setHeaderH] = useState(56)
  const [windowH, setWindowH] = useState(typeof window !== 'undefined' ? window.innerHeight : 800)
  const [targetHeight, setTargetHeight] = useState(56)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  useEffect(() => {
    function onResize() {
      setWindowH(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height || 56))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const snap = store.state.mobileDrawerSnap

  useEffect(() => {
    setTargetHeight(snapHeight(snap))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snap/header/window drive height
  }, [snap, headerH, windowH])

  function getDrawerTab(): DrawerTab {
    if (store.state.activeRibbonTab === 'code') return 'code'
    if (store.state.activeRibbonTab === 'ai') return 'ai'
    return store.state.panelMode === 'design' ? 'design' : 'layers'
  }

  function setDrawerTab(tab: DrawerTab) {
    if (tab === 'code' || tab === 'ai') {
      store.state.activeRibbonTab = tab
    } else {
      store.state.activeRibbonTab = 'panels'
      store.state.panelMode = tab
    }
    notify()
  }

  const isOpen = snap !== 'closed'

  function toggleTab(tab: DrawerTab) {
    if (getDrawerTab() === tab && isOpen) {
      store.state.mobileDrawerSnap = 'closed'
      setTargetHeight(snapHeight('closed'))
      notify()
      return
    }
    setDrawerTab(tab)
    if (!isOpen) {
      store.state.mobileDrawerSnap = 'half'
      setTargetHeight(snapHeight('half'))
      notify()
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY
    dragStartHeight.current = targetHeight
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const dy = e.clientY - dragStartY.current
    const maxHeight = snapHeight('full')
    const raw = dragStartHeight.current - dy
    setTargetHeight(Math.max(headerH, Math.min(maxHeight, raw)))
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const dy = e.clientY - dragStartY.current
    const isSwipeUp = dy < -SWIPE_THRESHOLD
    const isSwipeDown = dy > SWIPE_THRESHOLD
    // Velocity approximation from distance
    const isFastUp = dy < -SWIPE_VELOCITY_THRESHOLD
    const isFastDown = dy > SWIPE_VELOCITY_THRESHOLD

    let next: Snap = snap
    if (isSwipeUp || isFastUp) {
      next = snap === 'closed' ? 'half' : 'full'
    } else if (isSwipeDown || isFastDown) {
      next = snap === 'full' ? 'half' : 'closed'
    } else {
      // Snap to nearest
      const half = snapHeight('half')
      const full = snapHeight('full')
      if (targetHeight < (headerH + half) / 2) next = 'closed'
      else if (targetHeight < (half + full) / 2) next = 'half'
      else next = 'full'
    }
    store.state.mobileDrawerSnap = next
    setTargetHeight(snapHeight(next))
    notify()
  }

  const tab = getDrawerTab()

  return (
    <div
      data-test-id="mobile-drawer"
      className="fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col rounded-t-3xl bg-panel pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      style={{
        height: `${targetHeight}px`,
        transition: `height ${DRAWER_SPRING_STIFFNESS > 0 ? 280 : 0}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Tabs.Root value={tab} className="flex min-h-0 flex-1 flex-col">
        <nav
          ref={headerRef}
          aria-label="Mobile panel navigation"
          className="flex shrink-0 flex-col"
        >
          <div className="flex w-full justify-center pt-2">
            <div className="h-1 w-8 rounded-full bg-muted/40" />
          </div>
          <Tabs.List className="flex w-full items-center px-2 py-2">
            <Tabs.Trigger
              data-test-id="mobile-ribbon-layers"
              value="layers"
              className="flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-xs transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('layers')}
            >
              <Layers className="size-4" />
            </Tabs.Trigger>
            <Tabs.Trigger
              data-test-id="mobile-ribbon-design"
              value="design"
              className="flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-xs transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('design')}
            >
              <SlidersHorizontal className="size-4" />
            </Tabs.Trigger>
            <div className="flex-1" />
            <Tabs.Trigger
              data-test-id="mobile-ribbon-code"
              value="code"
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('code')}
            >
              <Code className="size-4" />
            </Tabs.Trigger>
            <Tabs.Trigger
              data-test-id="mobile-ribbon-ai"
              value="ai"
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('ai')}
            >
              <Sparkles className="size-4" />
            </Tabs.Trigger>
          </Tabs.List>
        </nav>

        <div data-test-id="mobile-drawer-content" className="min-h-0 flex-1 overflow-y-auto">
          <Tabs.Content value="layers" className="mt-0 h-full data-[state=inactive]:hidden">
            <div data-test-id="mobile-drawer-layers" className="flex h-full flex-col">
              <PagesPanel editor={store} />
              <div className="border-t border-border" />
              <header className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase">
                Layers
              </header>
              <div className="min-h-0 flex-1">
                <LayerTree editor={store} />
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="design" className="mt-0 h-full data-[state=inactive]:hidden">
            <div data-test-id="mobile-drawer-design" className="flex h-full flex-col">
              <DesignPanel />
            </div>
          </Tabs.Content>
          <Tabs.Content value="code" className="mt-0 h-full data-[state=inactive]:hidden">
            <div data-test-id="mobile-drawer-code" className="flex h-full flex-col">
              <CodePanel />
            </div>
          </Tabs.Content>
          <Tabs.Content value="ai" className="mt-0 h-full data-[state=inactive]:hidden">
            <div data-test-id="mobile-drawer-ai" className="flex h-full flex-col">
              <ChatPanel />
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}

export function MobileDrawer({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <MobileDrawerInner />
    </EditorBridge>
  )
}

// silence unused damping constant reference for parity with Vue spring config
void DRAWER_SPRING_DAMPING
