import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { IS_TAURI } from '@open-pencil/core/constants'

import { App } from './App'

import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root mount element')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

if (!IS_TAURI && import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
}
