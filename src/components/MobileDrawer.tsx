import IconLucideCode from '~icons/lucide/code'
import IconLucideLayers from '~icons/lucide/layers'
import IconLucideSlidersHorizontal from '~icons/lucide/sliders-horizontal'
import IconLucideSparkles from '~icons/lucide/sparkles'
import { motion } from 'motion/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ChatPanel from '@/components/ChatPanel'
import CodePanel from '@/components/CodePanel'
import DesignPanel from '@/components/DesignPanel'
import LayerTree from '@/components/LayerTree/LayerTree'
import PagesPanel from '@/components/PagesPanel'
import {
  DRAWER_SPRING_DAMPING,
  DRAWER_SPRING_STIFFNESS,
  HALF_FRAC,
  HUD_TOP,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD
} from '@/constants'
import { useEditorStore } from '@/app/editor/active-store'
import { useSceneComputed } from '@open-pencil/react'

type Snap = 'closed' | 'half' | 'full'
type DrawerTab = 'layers' | 'design' | 'code' | 'ai'

function useElementHeight(ref: React.RefObject<HTMLElement | null>, fallback = 56) {
  const [height, setHeight] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return height
}

function useWindowHeight() {
  const [height, setHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  )

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return height
}

export const MobileDrawer = memo(function MobileDrawer() {
  const store = useEditorStore()
  const headerRef = useRef<HTMLElement | null>(null)
  const headerH = useElementHeight(headerRef, 56)
  const windowH = useWindowHeight()

  const snapHeight = useCallback(
    (value: Snap) => {
      switch (value) {
        case 'full':
          return windowH - HUD_TOP
        case 'half':
          return Math.round(windowH * HALF_FRAC)
        default:
          return headerH
      }
    },
    [headerH, windowH]
  )

  const [snap, setSnap] = useState<Snap>(() => store.state.mobileDrawerSnap)
  const [targetHeight, setTargetHeight] = useState(() => snapHeight(store.state.mobileDrawerSnap))
  const isOpen = snap !== 'closed'

  const getDrawerTab = useCallback((): DrawerTab => {
    if (store.state.activeRibbonTab === 'code') return 'code'
    if (store.state.activeRibbonTab === 'ai') return 'ai'
    return store.state.panelMode === 'design' ? 'design' : 'layers'
  }, [store.state.activeRibbonTab, store.state.panelMode])

  const drawerTab = useSceneComputed(() => getDrawerTab())

  const updateSnap = useCallback(
    (next: Snap) => {
      store.state.mobileDrawerSnap = next
      setSnap(next)
      setTargetHeight(snapHeight(next))
    },
    [snapHeight, store.state]
  )

  const setDrawerTab = useCallback(
    (tab: DrawerTab) => {
      if (tab === 'code' || tab === 'ai') {
        store.state.activeRibbonTab = tab
        return
      }
      store.state.activeRibbonTab = 'panels'
      store.state.panelMode = tab
    },
    [store.state]
  )

  const toggleTab = useCallback(
    (tab: DrawerTab) => {
      if (drawerTab === tab && isOpen) {
        updateSnap('closed')
        return
      }

      setDrawerTab(tab)
      if (!isOpen) updateSnap('half')
    },
    [drawerTab, isOpen, setDrawerTab, updateSnap]
  )

  const onPan = useCallback(
    (_event: PointerEvent, info: { offset: { y: number } }) => {
      const maxHeight = snapHeight('full')
      const raw = snapHeight(snap) - info.offset.y
      setTargetHeight(Math.max(headerH, Math.min(maxHeight, raw)))
    },
    [headerH, snap, snapHeight]
  )

  const onPanEnd = useCallback(
    (_event: PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
      const isSwipeUp =
        info.offset.y < -SWIPE_THRESHOLD || info.velocity.y < -SWIPE_VELOCITY_THRESHOLD
      const isSwipeDown =
        info.offset.y > SWIPE_THRESHOLD || info.velocity.y > SWIPE_VELOCITY_THRESHOLD

      let next = snap
      if (isSwipeUp) {
        next = snap === 'closed' ? 'half' : 'full'
      } else if (isSwipeDown) {
        next = snap === 'full' ? 'half' : 'closed'
      }

      updateSnap(next)
    },
    [snap, updateSnap]
  )

  const drawerTransition = useMemo(
    () => ({
      type: 'spring' as const,
      stiffness: DRAWER_SPRING_STIFFNESS,
      damping: DRAWER_SPRING_DAMPING
    }),
    []
  )

  const tabClass =
    'flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-xs transition-colors outline-none select-none data-[state=active]:text-accent'

  return (
    <motion.div
      data-test-id="mobile-drawer"
      className="fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col rounded-t-3xl bg-panel pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      animate={{ height: `${targetHeight}px` }}
      transition={drawerTransition}
      onPan={onPan}
      onPanEnd={onPanEnd}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <nav ref={headerRef} aria-label="Mobile panel navigation" className="flex shrink-0 flex-col">
          <div className="flex w-full justify-center pt-2">
            <div className="h-1 w-8 rounded-full bg-muted/40" />
          </div>
          <div className="flex w-full items-center px-2 py-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === 'layers'}
              data-test-id="mobile-ribbon-layers"
              data-state={drawerTab === 'layers' ? 'active' : 'inactive'}
              className={tabClass}
              onClick={() => toggleTab('layers')}
            >
              <IconLucideLayers className="size-4" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === 'design'}
              data-test-id="mobile-ribbon-design"
              data-state={drawerTab === 'design' ? 'active' : 'inactive'}
              className={tabClass}
              onClick={() => toggleTab('design')}
            >
              <IconLucideSlidersHorizontal className="size-4" />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === 'code'}
              data-test-id="mobile-ribbon-code"
              data-state={drawerTab === 'code' ? 'active' : 'inactive'}
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('code')}
            >
              <IconLucideCode className="size-4" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === 'ai'}
              data-test-id="mobile-ribbon-ai"
              data-state={drawerTab === 'ai' ? 'active' : 'inactive'}
              className="flex h-full cursor-pointer items-center justify-center px-3 transition-colors outline-none select-none data-[state=active]:text-accent"
              onClick={() => toggleTab('ai')}
            >
              <IconLucideSparkles className="size-4" />
            </button>
          </div>
        </nav>

        <div data-test-id="mobile-drawer-content" className="min-h-0 flex-1 overflow-y-auto">
          <div role="tabpanel" hidden={drawerTab !== 'layers'} className="mt-0 h-full">
            <div data-test-id="mobile-drawer-layers" className="flex h-full flex-col">
              <PagesPanel />
              <div className="border-t border-border" />
              <header className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase">
                Layers
              </header>
              <LayerTree className="min-h-0 flex-1" />
            </div>
          </div>
          <div role="tabpanel" hidden={drawerTab !== 'design'} className="mt-0 h-full">
            <div data-test-id="mobile-drawer-design" className="flex h-full flex-col">
              <DesignPanel />
            </div>
          </div>
          <div role="tabpanel" hidden={drawerTab !== 'code'} className="mt-0 h-full">
            <div data-test-id="mobile-drawer-code" className="flex h-full flex-col">
              <CodePanel />
            </div>
          </div>
          <div role="tabpanel" hidden={drawerTab !== 'ai'} className="mt-0 h-full">
            <div data-test-id="mobile-drawer-ai" className="flex h-full flex-col">
              <ChatPanel />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

MobileDrawer.displayName = 'MobileDrawer'
export default MobileDrawer
