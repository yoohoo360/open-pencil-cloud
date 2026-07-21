import { useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentUI } from '@/components/ui/types'
import theme from '@/theme/color-slider'

export type ColorSliderUI = ComponentUI<typeof theme>

export function useColorSliderUI(checkerboard: boolean, ui?: ColorSliderUI) {
  return useMemo(() => {
    const styles = tv(theme)({ checkerboard })
    return {
      root: styles.root({ class: ui?.root }),
      label: styles.label({ class: ui?.label }),
      slider: styles.slider({ class: ui?.slider }),
      track: styles.track({ class: ui?.track }),
      thumb: styles.thumb({ class: ui?.thumb }),
      input: styles.input({ class: ui?.input })
    }
  }, [checkerboard, ui])
}
