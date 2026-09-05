import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { consumeReturnTo, finishReturnTo, rememberReturnTo } from '#react/app/auth/redirect'
import '#react/app/shell/theme'
import { hasAccessToken } from '#react/lib/client'
import CanvasView from './view/CanvasView'
import DocumentListView from './view/DocumentListView'
import DocumentView from './view/DocumentView'
import LoginView from './view/LoginView'
import RegisterView from './view/RegisterView'
import VerifyEmailView from './view/VerifyEmailView'

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!hasAccessToken()) {
    rememberReturnTo(location.pathname, location.search)
    return <Navigate to="/login" state={{ from: location }} replace/>
  }
  const pending = finishReturnTo(location.pathname, location.search)
  if (pending) {
    return <Navigate to={pending} replace/>
  }
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (hasAccessToken()) {
    return <Navigate to={consumeReturnTo(location.state)} replace/>
  }
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
        path="/register"
        element={
          <GuestOnly>
            <RegisterView/>
          </GuestOnly>
        }
      />
      <Route
        path="/verify-email"
        element={
          <GuestOnly>
            <VerifyEmailView/>
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
