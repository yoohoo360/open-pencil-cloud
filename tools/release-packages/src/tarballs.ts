import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

type PackageExports = {
  [key: string]: PackageExports | string | null | undefined
}

type PackageJSON = {
  bin?: Record<string, string> | string
  exports?: PackageExports
  name: string
}

export function packageBinTargets(packageJSON: PackageJSON): Record<string, string> {
  if (typeof packageJSON.bin === 'string') return { [packageJSON.name]: packageJSON.bin }
  return packageJSON.bin ?? {}
}

function packageExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(packageExportTargets)
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(packageExportTargets)
}

export function packageExportTargetPaths(packageJSON: Pick<PackageJSON, 'exports'>): string[] {
  return packageExportTargets(packageJSON.exports)
}

export async function tarballEntries(tarballPath: string): Promise<Set<string>> {
  const { stdout } = await execFileAsync('tar', ['-tf', tarballPath], { encoding: 'utf8' })
  return new Set(stdout.trim().split('\n').filter(Boolean))
}

export async function tarballPackageJSON(tarballPath: string): Promise<PackageJSON> {
  const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, 'package/package.json'], {
    encoding: 'utf8'
  })
  return JSON.parse(stdout) as PackageJSON
}

export async function validateTarballBinTargets(tarballPath: string): Promise<void> {
  const entries = await tarballEntries(tarballPath)
  const packageJSON = await tarballPackageJSON(tarballPath)

  for (const [name, target] of Object.entries(packageBinTargets(packageJSON))) {
    const entry = `package/${target.replace(/^\.\//, '')}`
    if (!entries.has(entry)) {
      throw new Error(`${tarballPath}: bin ${name} target missing from tarball: ${entry}`)
    }
  }
}

function exportTargetPattern(target: string): RegExp {
  const escaped = target.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`)
}
export async function validateTarballExportTargets(tarballPath: string): Promise<void> {
  const entries = await tarballEntries(tarballPath)
  const packageJSON = await tarballPackageJSON(tarballPath)

  for (const target of packageExportTargetPaths(packageJSON)) {
    if (!target.startsWith('./')) continue
    const relativeTarget = target.slice(2)
    let matchingEntries: string[]
    if (relativeTarget.includes('*')) {
      const pattern = exportTargetPattern(relativeTarget)
      matchingEntries = [...entries].filter((entry) => pattern.test(entry.slice('package/'.length)))
    } else {
      const exactEntry = `package/${relativeTarget}`
      matchingEntries = entries.has(exactEntry) ? [exactEntry] : []
    }
    if (matchingEntries.length === 0) {
      throw new Error(
        `${tarballPath}: export target missing from tarball: package/${relativeTarget}`
      )
    }
  }
}

export async function validatePackedTarballs(directory: string): Promise<void> {
  const tarballs = (await readdir(directory)).filter((name) => name.endsWith('.tgz'))
  for (const tarball of tarballs) {
    const path = join(directory, tarball)
    await validateTarballBinTargets(path)
    await validateTarballExportTargets(path)
  }
}
