import { createRouter, createWebHistory } from 'vue-router'

import DocumentListView from './views/DocumentListView.vue'
import DocumentView from './views/DocumentView.vue'
import EditorView from './views/EditorView.vue'
import LoginView from './views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: EditorView },
    { path: '/design/:fileKey', component: DocumentView },
    { path: '/dashboard', component: DocumentListView },
    { path: '/login', component: LoginView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView }
  ]
})

export default router
