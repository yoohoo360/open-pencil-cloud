<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient, { API_BASE_URL } from '@/lib/client.ts'
import { SceneGraph } from '@open-pencil/scene-graph/index.ts'
import { exportFigFile } from '@open-pencil/core/io'

// ==================== 类型定义 ====================

interface PencilFile {
  id: string
  key: string
  name: string
  description: string
  team_id: string
  project_id: string
  thumbnail_url: string
  version: string
  schema_version: number
  is_deleted: number
  created_by: string
  updated_by: string
  last_modified: number
  created_at: number
  updated_at: number
}

// ==================== 状态 ====================

const router = useRouter()
const loading = ref(false)
const error = ref<string | null>(null)
const files = ref<PencilFile[]>([])
const total = ref(0)

// 筛选和排序
const searchKeyword = ref('')
const sortBy = ref<'created_at' | 'updated_at' | 'name'>('updated_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

// ==================== 弹窗状态 ====================

const showDialog = ref(false)
const dialogLoading = ref(false)
const dialogError = ref<string | null>(null)
const formData = ref({
  name: '',
  description: '',
  team_id: '',
  project_id: ''
})

// ==================== API 调用 ====================

async function fetchFiles() {
  loading.value = true
  error.value = null

  try {
    const res = await apiClient.get('/api/document/list')
    files.value = res.data || []
    total.value = res.data?.length || 0
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    loading.value = false
  }
}

async function deleteFile(key: string) {
  if (!confirm('确定要删除这个文件吗？')) return

  try {
    await apiClient.delete(`/api/document/${key}`)
    await fetchFiles()
  } catch (reason) {
    alert(reason instanceof Error ? reason.message : String(reason))
  }
}

// ==================== 弹窗操作 ====================

function openCreateDialog() {
  // 重置表单
  formData.value = {
    name: '',
    description: '',
    team_id: '',
    project_id: ''
  }
  dialogError.value = null
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  dialogError.value = null
}

async function handleCreate() {
  // 校验
  if (!formData.value.name.trim()) {
    dialogError.value = '请输入文件名称'
    return
  }

  dialogLoading.value = true
  dialogError.value = null

  try {
    const res = await apiClient.post('/api/document', formData.value)

    if (res.success) {
      openFile(res.data)
    }
  } catch (reason) {
    dialogError.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    dialogLoading.value = false
  }
}

// ==================== 过滤和排序 ====================

const filteredFiles = computed(() => {
  let result = [...files.value]
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(
      (file) =>
        file.name.toLowerCase().includes(keyword) ||
        file.description?.toLowerCase().includes(keyword) ||
        file.key.toLowerCase().includes(keyword)
    )
  }

  result.sort((a, b) => {
    let aVal: string | number = a[sortBy.value as keyof PencilFile] ?? ''
    let bVal: string | number = b[sortBy.value as keyof PencilFile] ?? ''

    if (sortBy.value === 'created_at' || sortBy.value === 'updated_at') {
      aVal = aVal as number
      bVal = bVal as number
      return sortOrder.value === 'asc' ? aVal - bVal : bVal - aVal
    }

    return sortOrder.value === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  return result
})

// ==================== 操作 ====================

function openFile(file: PencilFile) {
  router.push(`/design/${file.key}`)
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <main class="flex min-h-screen flex-col bg-app text-surface" data-test-id="file-workspace">
    <!-- ========== Header ========== -->
    <header class="flex h-14 items-center border-b border-border px-6">
      <div>
        <h1 class="text-sm font-semibold">文件管理</h1>
        <p class="text-[10px] text-muted">
          共 {{ total }} 个文件
          <span v-if="searchKeyword.trim()">· 筛选出 {{ filteredFiles.length }} 个</span>
        </p>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <!-- 搜索框 -->
        <div class="relative">
          <icon-lucide-search
            class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
          />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索文件..."
            class="h-8 w-48 rounded-md border border-border bg-panel pl-8 pr-3 text-xs text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="button"
          class="rounded-md p-1.5 text-muted transition hover:bg-hover hover:text-surface"
          @click="fetchFiles"
        >
          <icon-lucide-refresh-cw class="size-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/90"
          @click="openCreateDialog"
        >
          <icon-lucide-plus class="size-3.5" />
          新建文件
        </button>
      </div>
    </header>

    <!-- ========== 主体内容 ========== -->
    <section class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-6">
      <p v-if="error" class="mb-4 text-xs text-danger" role="alert">❌ {{ error }}</p>

      <!-- 统计栏 -->
      <div
        v-if="!loading && filteredFiles.length > 0"
        class="mb-4 flex items-center justify-between text-xs text-muted"
      >
        <span>共 {{ filteredFiles.length }} 个文件</span>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1">
            <span>排序</span>
            <select
              v-model="sortBy"
              class="rounded border border-border bg-panel px-2 py-0.5 text-xs text-surface"
            >
              <option value="created_at">创建时间</option>
              <option value="updated_at">更新时间</option>
              <option value="name">名称</option>
            </select>
          </label>
          <button
            type="button"
            class="p-1 hover:text-surface"
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          >
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>

      <!-- 卡片网格 -->
      <div
        v-if="filteredFiles.length"
        class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
      >
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          style="aspect-ratio: 4 / 3"
          class="flex justify-between flex-col group cursor-pointer overflow-hidden rounded-lg border border-border bg-panel text-left transition hover:border-panel-focus hover:bg-hover"
          :data-file-key="file.key"
          @click="openFile(file)"
        >
          <!-- 4:3 缩略图 (aspect-ratio CSS 属性) -->
          <div class="flex-1bg-panel-field">
            <img
              v-if="file.thumbnail_url"
              :src="API_BASE_URL + file.thumbnail_url"
              :alt="file.name"
              class="size-full object-cover"
            />
            <div
              v-else
              class="flex-0 flex h-[56px] flex-col items-center justify-center text-muted"
            >
              <icon-lucide-file class="size-10" />
              <span class="mt-1 text-[10px]">{{ getInitials(file.name) }}</span>
            </div>
          </div>

          <!-- 文件信息 -->
          <div class="flex gap-2 border-t border-border p-3">
            <p class="truncate text-xs font-medium">{{ file.name }}</p>
            <p class="mt-0.5 text-[10px] text-muted">更新于 {{ formatTime(file.updated_at) }}</p>
          </div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="flex flex-1 flex-col items-center justify-center gap-4">
        <icon-lucide-loader-circle class="size-6 animate-spin text-muted" />
        <p class="text-sm text-muted">加载文件中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-4">
        <icon-lucide-folder-open class="size-12 text-muted" />
        <p class="text-sm text-muted">
          {{ searchKeyword.trim() ? '没有匹配的文件' : '还没有文件，创建一个吧' }}
        </p>
        <button
          v-if="!searchKeyword.trim()"
          type="button"
          class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
          @click="openCreateDialog"
        >
          <icon-lucide-plus class="size-4" />
          新建文件
        </button>
      </div>
    </section>

    <!-- ========== 新建文件弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="showDialog"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="closeDialog"
      >
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/50" />

        <!-- 弹窗内容 -->
        <div
          class="relative w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-xl"
        >
          <!-- 标题 -->
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-surface">新建文件</h2>
            <button
              type="button"
              class="rounded p-1 text-muted hover:bg-hover hover:text-surface"
              @click="closeDialog"
            >
              <icon-lucide-x class="size-4" />
            </button>
          </div>

          <!-- 表单 -->
          <form @submit.prevent="handleCreate">
            <!-- 文件名称 -->
            <div class="mb-4">
              <label class="mb-1 block text-xs font-medium text-surface">
                文件名称 <span class="color-red">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="请输入文件名称"
                class="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <!-- 描述 -->
            <div class="mb-4">
              <label class="mb-1 block text-xs font-medium text-surface">描述</label>
              <textarea
                v-model="formData.description"
                rows="3"
                placeholder="请输入文件描述"
                class="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <!-- 错误提示 -->
            <p v-if="dialogError" class="mb-3 text-xs text-danger">{{ dialogError }}</p>

            <!-- 按钮 -->
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md px-4 py-2 text-sm text-muted transition hover:bg-hover hover:text-surface"
                @click="closeDialog"
              >
                取消
              </button>
              <button
                type="submit"
                class="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="dialogLoading"
              >
                <icon-lucide-loader-circle v-if="dialogLoading" class="size-4 animate-spin" />
                <template v-else> 确定 </template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>
