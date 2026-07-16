/// <reference types="vite-plugin-pwa/vanillajs" />
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { setVeauryOptions } from 'veaury'

import './app.css'
import { IS_TAURI } from './constants'
import { preloadFonts } from './engine/fonts'
import { App } from './react_app/App'

// React 19+: veaury needs an explicit createRoot for React-in-Vue islands
setVeauryOptions({
  react: {
    createRoot
  }
})

preloadFonts()

const rootEl = document.getElementById('app')
if (!rootEl) {
  throw new Error('OpenPencil: #app root element is missing')
}

createRoot(rootEl).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
