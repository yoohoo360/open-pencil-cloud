import './app.css'

import { createHead } from '@unhead/react/client'
import { UnheadProvider } from '@unhead/react/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { preloadFonts } from '@/app/editor/fonts'
import { IS_TAURI } from '@/constants'

import App from './App'

preloadFonts()

const head = createHead()

const container = document.getElementById('app')
if (!container) throw new Error('Root element #app not found')

createRoot(container).render(
  <StrictMode>
    <UnheadProvider head={head}>
      <App />
    </UnheadProvider>
  </StrictMode>
)

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
    return undefined
  })
}
