import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'

import './app.css'
import { preloadFonts } from '@/app/editor/fonts'
import { IS_TAURI } from '@/constants'

import App from './App'
import EditorView from './views/EditorView'

preloadFonts()

const rootEl = document.getElementById('app')
if (!rootEl) {
  throw new Error('[open-pencil] #app root element missing')
}

createRoot(rootEl).render(
  <BrowserRouter>
    <Routes>
      <Route element={<App />}>
        <Route path="/" element={<EditorView />} />
        <Route path="/demo" element={<EditorView demo />} />
        <Route path="/share/:roomId" element={<EditorView />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
    return undefined
  })
}
