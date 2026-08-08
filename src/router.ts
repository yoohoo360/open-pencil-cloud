import { createRouter, createWebHistory } from 'vue-router'

import EditorView from './views/EditorView.vue'
import LoginView from './views/LoginView.vue'
import StorageView from './views/StorageView.vue'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: EditorView },
    { path: '/storage', component: StorageView },
    { path: '/login', component: LoginView },
    { path: '/demo', component: EditorView, meta: { demo: true } },
    { path: '/share/:roomId', component: EditorView }
  ]
})

export default router
