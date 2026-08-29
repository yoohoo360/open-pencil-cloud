import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import '#react/app/shell/theme'
import { hasAccessToken } from '#react/lib/client'
import CanvasView from './view/CanvasView'
import DocumentListView from './view/DocumentListView'
import DocumentView from './view/DocumentView'
import LoginView from './view/LoginView'

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!hasAccessToken()) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace/>
  }
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  if (hasAccessToken()) return <Navigate to="/dashboard" replace/>
  return children
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginView/>
          </GuestOnly>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DocumentListView/>
          </RequireAuth>
        }
      />
      <Route
        path="/design/:fileKey"
        element={
          <RequireAuth>
            <DocumentView/>
          </RequireAuth>
        }
      />
      <Route path="/demo" element={<CanvasView/>}/>
      <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}
