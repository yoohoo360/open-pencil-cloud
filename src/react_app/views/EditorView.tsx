import { createHead } from '@unhead/vue/client'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { applyVueInReact } from 'veaury'

import VueEditorShell from '@/react_app/vue/VueEditorShell.vue'
import router from '@/router'

import type { ComponentType } from 'react'
import type { App as VueApp } from 'vue'

/**
 * React EditorView — root is React; the Vue editor chrome remains wrapped via
 * veaury until remaining panels (canvas, properties, collab, mobile) are ported.
 *
 * Keeps vue-router + @unhead/vue available inside the Vue subtree (CollabPanel,
 * useHead, route.meta.demo) and syncs it with React Router.
 */
const head = createHead()

const VueEditor = applyVueInReact(VueEditorShell, {
  beforeVueAppMount(app) {
    const vueApp = app as VueApp
    vueApp.use(router)
    vueApp.use(head)
  }
}) as ComponentType

function locationToFullPath(location: { pathname: string; search: string; hash: string }): string {
  return location.pathname + location.search + location.hash
}

export function EditorView() {
  const location = useLocation()
  const navigate = useNavigate()
  const fullPath = locationToFullPath(location)
  const fullPathRef = useRef(fullPath)
  fullPathRef.current = fullPath

  // React Router → vue-router (demo meta, CollabPanel room params, useHead)
  useEffect(() => {
    if (router.currentRoute.value.fullPath !== fullPath) {
      void router.replace(fullPath)
    }
  }, [fullPath])

  // vue-router → React Router (e.g. CollabPanel router.push)
  useEffect(() => {
    return router.afterEach((to) => {
      if (to.fullPath !== fullPathRef.current) {
        void navigate(to.fullPath, { replace: true })
      }
    })
  }, [navigate])

  return <VueEditor />
}
