import { Settings2, Type } from 'lucide-react'

import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import {
  sharedStyleLeafName,
  sharedStylePreview,
  sharedStyleSwatch,
  styleGroupMessageKey,
  useSharedStyleCatalog
} from '#react/controls/shared-style'
import { useI18n } from '#react/i18n'

export function StylesSection({ onOpenDialog }: { onOpenDialog: () => void }) {
  const { panels } = useI18n()
  const catalog = useSharedStyleCatalog()

  return (
    <PanelSection
      label={panels.styles}
      actions={
        <IconButton
          label={panels.openStyles}
          data-test-id="open-styles"
          onClick={onOpenDialog}
        >
          <Settings2 className="size-3.5" />
        </IconButton>
      }
    >
      {catalog.count === 0 ? (
        <div className="mt-1 text-[11px] text-muted">{panels.noLocalStyles}</div>
      ) : (
        <div className="mt-1 flex flex-col gap-2" data-test-id="styles-section">
          {catalog.groups.map((group) =>
            group.styles.length === 0 ? null : (
              <div key={group.kind}>
                <div className="mb-0.5 text-[10px] font-semibold text-muted">
                  {panels[styleGroupMessageKey(group.kind)]}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {group.styles.map((style) => {
                    const node = catalog.styleNode(style.nodeId)
                    const swatch = node ? sharedStyleSwatch(node) : null
                    return (
                      <li key={style.id}>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-hover"
                          onClick={onOpenDialog}
                        >
                          {group.kind === 'fill' && swatch ? (
                            <span
                              className="size-3 shrink-0 rounded-sm border border-border"
                              style={{ background: swatch }}
                            />
                          ) : group.kind === 'text' ? (
                            <Type className="size-3 shrink-0 text-muted" />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-[11px] text-surface">
                            {sharedStyleLeafName(style.name)}
                          </span>
                          {node && group.kind === 'text' ? (
                            <span className="max-w-[40%] truncate text-[10px] text-muted">
                              {sharedStylePreview(node)}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </PanelSection>
  )
}
