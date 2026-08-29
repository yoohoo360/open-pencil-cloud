import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { File, FolderOpen, LoaderCircle, Plus, RefreshCw, Search, Trash, X } from 'lucide-react'

import {
  API_BASE_URL,
  authAPI,
  documentAPI,
  getAPIErrorMessage,
  type PencilDocument
} from '#react/lib/client'

function toMillis(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatTime(timestamp: string | number | undefined): string {
  const millis = toMillis(timestamp)
  if (!millis) return '-'
  return new Date(millis).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function thumbnailSrc(file: PencilDocument): string {
  if (!file.thumbnail_url) return ''
  if (/^https?:\/\//i.test(file.thumbnail_url)) return file.thumbnail_url
  return `${API_BASE_URL}${file.thumbnail_url}`
}

export default function DocumentListView() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<PencilDocument[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'name'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showDialog, setShowDialog] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  async function fetchFiles(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const res = await documentAPI.list()
      setFiles(res.data || [])
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchFiles()
  }, [])

  const filteredFiles = useMemo(() => {
    let result = [...files]
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      result = result.filter(
        (file) =>
          file.name.toLowerCase().includes(keyword) ||
          file.description?.toLowerCase().includes(keyword) ||
          file.key.toLowerCase().includes(keyword)
      )
    }
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      const aVal = toMillis(a[sortBy])
      const bVal = toMillis(b[sortBy])
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
    return result
  }, [files, searchKeyword, sortBy, sortOrder])

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!formName.trim()) {
      setDialogError('请输入文件名称')
      return
    }
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await documentAPI.create({
        name: formName.trim(),
        description: formDescription
      })
      if (res.success && res.data) void navigate(`/design/${res.data.key}`)
    } catch (reason) {
      setDialogError(getAPIErrorMessage(reason))
    } finally {
      setDialogLoading(false)
    }
  }

  async function handleDelete(key: string): Promise<void> {
    if (!confirm('确定要删除这个文件吗？')) return
    try {
      await documentAPI.delete(key)
      await fetchFiles()
    } catch (reason) {
      alert(getAPIErrorMessage(reason))
    }
  }

  async function handleLogout(): Promise<void> {
    await authAPI.logout()
    void navigate('/login')
  }

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-canvas text-surface" data-test-id="file-workspace">
      <header className="flex h-14 items-center border-b border-border px-6">
        <div>
          <h1 className="text-sm font-semibold">文件管理</h1>
          <p className="text-[10px] text-muted">
            共 {files.length} 个文件
            {searchKeyword.trim() ? ` · 筛选出 ${filteredFiles.length} 个` : null}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <input
              value={searchKeyword}
              type="text"
              placeholder="搜索文件..."
              className="h-8 w-48 rounded-md border border-border bg-panel pr-3 pl-8 text-xs text-surface placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted transition hover:bg-hover hover:text-surface"
            onClick={() => void fetchFiles()}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/90"
            onClick={() => {
              setFormName('')
              setFormDescription('')
              setDialogError(null)
              setShowDialog(true)
            }}
          >
            <Plus className="size-3.5" />
            新建文件
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1.5 text-xs text-muted transition hover:bg-hover hover:text-surface"
            onClick={() => void handleLogout()}
          >
            退出
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-6">
        {error ? (
          <p className="mb-4 text-xs text-danger" role="alert">
            ❌ {error}
          </p>
        ) : null}

        {!loading && filteredFiles.length > 0 ? (
          <div className="mb-4 flex items-center justify-between text-xs text-muted">
            <span>共 {filteredFiles.length} 个文件</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1">
                <span>排序</span>
                <select
                  value={sortBy}
                  className="rounded border border-border bg-panel px-2 py-0.5 text-xs text-surface"
                  onChange={(event) =>
                    setSortBy(event.target.value as 'created_at' | 'updated_at' | 'name')
                  }
                >
                  <option value="created_at">创建时间</option>
                  <option value="updated_at">更新时间</option>
                  <option value="name">名称</option>
                </select>
              </label>
              <button
                type="button"
                className="p-1 hover:text-surface"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        ) : null}

        {filteredFiles.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id || file.key}
                style={{ aspectRatio: '4 / 3' }}
                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-border bg-panel text-left transition hover:border-panel-focus hover:bg-hover"
                data-file-key={file.key}
                onClick={() => void navigate(`/design/${file.key}`)}
              >
                <div className="flex-1 bg-panel-field">
                  {thumbnailSrc(file) ? (
                    <img
                      src={thumbnailSrc(file)}
                      alt={file.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted">
                      <File className="size-10" />
                      <span className="mt-1 text-[10px]">
                        {file.name ? file.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{file.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      更新于 {formatTime(file.updated_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-hover hover:text-danger"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDelete(file.key)
                    }}
                  >
                    <Trash className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <LoaderCircle className="size-6 animate-spin text-muted" />
            <p className="text-sm text-muted">加载文件中...</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <FolderOpen className="size-12 text-muted" />
            <p className="text-sm text-muted">
              {searchKeyword.trim() ? '没有匹配的文件' : '还没有文件，创建一个吧'}
            </p>
            {!searchKeyword.trim() ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="size-4" />
                新建文件
              </button>
            ) : null}
          </div>
        )}
      </section>

      {showDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowDialog(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-surface">新建文件</h2>
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-hover hover:text-surface"
                onClick={() => setShowDialog(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={(event) => void handleCreate(event)}>
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-surface">
                  文件名称 <span className="text-danger">*</span>
                </label>
                <input
                  value={formName}
                  type="text"
                  placeholder="请输入文件名称"
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  onChange={(event) => setFormName(event.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-surface">描述</label>
                <textarea
                  value={formDescription}
                  rows={3}
                  placeholder="请输入文件描述"
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-surface placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  onChange={(event) => setFormDescription(event.target.value)}
                />
              </div>
              {dialogError ? <p className="mb-3 text-xs text-danger">{dialogError}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm text-muted transition hover:bg-hover hover:text-surface"
                  onClick={() => setShowDialog(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={dialogLoading}
                >
                  {dialogLoading ? <LoaderCircle className="size-4 animate-spin" /> : '确定'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
