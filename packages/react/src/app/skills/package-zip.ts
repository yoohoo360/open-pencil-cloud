import { zipSync, type Zippable } from 'fflate'

/** Build a skill package zip from a folder FileList (webkitdirectory). */
export async function zipSkillFolder(files: FileList | File[]): Promise<Blob> {
  const list = Array.from(files)
  if (list.length === 0) throw new Error('Folder is empty')

  const zippable: Zippable = {}
  let rootPrefix = ''
  const firstRel = relativePath(list[0]!)
  const slash = firstRel.indexOf('/')
  if (slash > 0) {
    const candidate = firstRel.slice(0, slash + 1)
    if (list.every((file) => relativePath(file).startsWith(candidate))) {
      rootPrefix = candidate
    }
  }

  for (const file of list) {
    let path = relativePath(file)
    if (rootPrefix && path.startsWith(rootPrefix)) path = path.slice(rootPrefix.length)
    if (!path || path.endsWith('/')) continue
    if (path.includes('..')) throw new Error('Invalid path in folder')
    const bytes = new Uint8Array(await file.arrayBuffer())
    zippable[path] = bytes
  }

  if (!('SKILL.md' in zippable)) {
    throw new Error('Folder must include SKILL.md')
  }

  const zipped = zipSync(zippable, { level: 6 })
  return new Blob([zipped], { type: 'application/zip' })
}

function relativePath(file: File): string {
  const withPath = file as File & { webkitRelativePath?: string }
  const raw = withPath.webkitRelativePath || file.name
  return raw.replace(/\\/g, '/')
}
