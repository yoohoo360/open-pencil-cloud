import IconLucideFile from '~icons/lucide/file'
import IconLucideX from '~icons/lucide/x'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import SegmentedControl from '@/components/ui/SegmentedControl'
import pageListTheme from '@/theme/page-list'
import tabBarTheme from '@/theme/tab-bar'

const panelOptions = [
  { value: 'file', label: 'File' },
  { value: 'assets', label: 'Assets' }
]

const pageStates = [
  { label: 'Normal', active: false, dragging: false },
  { label: 'Active', active: true, dragging: false },
  { label: 'Dragging', active: false, dragging: true },
  { label: 'Drop before', active: false, dragging: false, dropPosition: 'before' as const },
  { label: 'Drop after', active: false, dragging: false, dropPosition: 'after' as const }
]

export const NavigationThemeDemo = memo(function NavigationThemeDemo() {
  const pageStyles = useMemo(() => tv(pageListTheme), [])
  const tabStyles = useMemo(() => tv(tabBarTheme), [])

  return (
    <div className="grid max-w-3xl grid-cols-2 gap-6">
      <section className="rounded-lg border border-border bg-panel p-3 shadow-lg">
        <h2 className="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Page and panel states
        </h2>
        <SegmentedControl
          value="file"
          options={panelOptions}
          label="Panel"
          ui={{ root: 'w-full' }}
          onValueChange={() => undefined}
        />
        <div className="mt-3 space-y-1">
          {pageStates.map((state) => (
            <div
              key={state.label}
              aria-label={state.label}
              className={pageStyles({
                active: state.active,
                dragging: state.dragging,
                dropPosition: state.dropPosition
              }).row()}
              data-active={state.active ? '' : undefined}
              data-dragging={state.dragging ? '' : undefined}
              data-drop-position={state.dropPosition}
            >
              {state.dropPosition ? (
                <div className={pageStyles({ dropPosition: state.dropPosition }).dropIndicator()} />
              ) : null}
              <button type="button" className={pageStyles({ active: state.active }).item()}>
                <IconLucideFile className={pageStyles().icon()} />
                <span className={pageStyles().label()}>{state.label}</span>
              </button>
            </div>
          ))}
          <div aria-label="Rename" className={pageStyles().renameRow()}>
            <IconLucideFile className={pageStyles().icon()} />
            <input className={pageStyles().renameInput()} defaultValue="Rename page" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-canvas p-3 shadow-lg">
        <h2 className="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Tab states
        </h2>
        <div className={tabStyles().root()}>
          <div className={tabStyles().list()}>
            <button
              type="button"
              aria-label="Active tab"
              className={tabStyles({ active: true }).trigger()}
              data-active
            >
              <IconLucideFile className={tabStyles().icon()} />
              <span className={tabStyles().label()}>Active</span>
              <span className={tabStyles({ active: true }).close()} data-active>
                <IconLucideX className={tabStyles().closeIcon()} />
              </span>
            </button>
            <button
              type="button"
              aria-label="Inactive tab"
              className={tabStyles({ active: false }).trigger()}
            >
              <IconLucideFile className={tabStyles().icon()} />
              <span className={tabStyles().label()}>Inactive</span>
              <span className={tabStyles({ active: false }).close()}>
                <IconLucideX className={tabStyles().closeIcon()} />
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
})

NavigationThemeDemo.displayName = 'NavigationThemeDemo'
export default NavigationThemeDemo
