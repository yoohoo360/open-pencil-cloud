import { resolveOssReadUrl } from '#react/app/document/oss'
import { useEffect, useState } from 'react'

export function useOssCoverSrc(path: string | undefined, revision?: string | number): string {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!path) {
      setSrc('')
      return
    }

    let cancelled = false
    let objectUrl = ''

    void resolveOssReadUrl(path, revision)
      .then((url) => {
        if (cancelled) {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        objectUrl = url.startsWith('blob:') ? url : ''
        setSrc(url)
      })
      .catch((error) => {
        console.warn('[Document] Failed to load cover', error)
        if (!cancelled) setSrc('')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, revision])

  return src
}

export function OssCoverImage({
  path,
  revision,
  alt,
  className
}: {
  path?: string
  revision?: string | number
  alt: string
  className?: string
}) {
  const src = useOssCoverSrc(path, revision)
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      className={['block', className].filter(Boolean).join(' ')}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  )
}