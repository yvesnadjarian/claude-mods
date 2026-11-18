// Pure helpers for the Tier List mod. No engine calls and no Node built-ins,
// so they can be unit-tested directly (see tests/logic.test.ts).

import type { Item, ItemType, Level, Qa, Tier } from '../types'

export const TIERS: readonly Tier[] = ['S', 'A', 'B', 'C', 'D']
export type { Item, ItemType, Level, Qa, Tier }

export type Draft = Omit<Item, 'id'>
export type Doc = { label: string; text: string }

export const MIN_ITEMS = 1
export const MAX_ITEMS = 60
export const MAX_SCAN_FILES = 150
export const MAX_FILE_BYTES = 60_000
export const MAX_CONTEXT_CHARS = 160_000
export const MAX_TODOS = 80

// Folders the scan never enters. Generated output, dependencies and VCS data.
const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'target', 'vendor',
  '__pycache__', 'venv', 'env', 'bower_components', 'site-packages',
])
// Dot-folders are skipped too, except these.
const ALLOWED_DOT_DIRS = new Set(['.github', '.claude-plugin'])

// Engine typings and other generated or sensitive files.
const IGNORED_FILES: RegExp[] = [
  /\.lock$/i, /(^|[-.])lock\.(json|ya?ml)$/i, /\.min\.(js|css)$/i, /\.map$/i,
  /\.d\.ts$/i, /^\.env/i, /\.(pem|key|p12|pfx)$/i, /^id_(rsa|ed25519)/i,
  /credential/i, /secret/i,
]

const TEXT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'cs', 'rb',
  'php', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp', 'vue', 'svelte', 'html', 'css', 'scss',
  'md', 'txt', 'json', 'yaml', 'yml', 'toml', 'ini', 'sh', 'ps1', 'sql', 'graphql',
  'xml', 'gradle',
])
const TEXT_NAMES = new Set(['dockerfile', 'makefile'])

const LEVELS: readonly Level[] = ['alto', 'médio', 'baixo']

export function isIgnoredDir(name: string, relPath: string): boolean {
  if (IGNORED_DIRS.has(name)) return true
  if (name.startsWith('.') && !ALLOWED_DOT_DIRS.has(name)) return true
  return /(^|\/)\.claude-plugin\/types(\/|$)/.test(relPath)
}

export function isCandidateFile(name: string): boolean {
  if (IGNORED_FILES.some(re => re.test(name))) return false
  const lower = name.toLowerCase()
  if (TEXT_NAMES.has(lower)) return true
  const dot = lower.lastIndexOf('.')
  return dot > 0 && TEXT_EXTENSIONS.has(lower.slice(dot + 1))
}

// Lower score = read first. Docs and project config come before source, tests after.
export function rankScore(rel: string): number {
  const name = rel.split('/').pop() ?? rel
  if (/^readme/i.test(name)) return 0
  if (/^(package\.json|tsconfig.*\.json|pyproject\.toml|setup\.py|cargo\.toml|go\.mod|pom\.xml|plugin\.json|hooks\.json|claude\.md|makefile|dockerfile)$/i.test(name)) return 1
  if (/(^|[./_-])(tests?|specs?|__tests__)([./_-]|$)/i.test(rel)) return 2
  return 3
}

export type Candidate = { label: string; abs: string; rel: string; size: number }

export function sortCandidates(list: Candidate[]): Candidate[] {
  const depth = (c: Candidate) => c.rel.split('/').length
  return [...list].sort(
    (a, b) => rankScore(a.rel) - rankScore(b.rel) || depth(a) - depth(b) || a.label.localeCompare(b.label),
  )
}

export function todoLines(label: string, text: string): string[] {
  const out: string[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) out.push(`${label}:${i + 1}: ${line.trim().slice(0, 200)}`)
  })
  return out
}

export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[… trecho cortado]`
}

// Builds the project block sent to the model. Everything here is data, not instructions.
export function buildContext(docs: Doc[], todos: string[]): string {
  const files = docs
    .map(d => `<arquivo caminho="${d.label}">\n${d.text}\n</arquivo>`)
    .join('\n')
  const todoBlock = todos.slice(0, MAX_TODOS).join('\n') || '(nenhum)'
  return `<projeto>\n${files}\n</projeto>\n\n<todos>\n${todoBlock}\n</todos>`
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function level(v: unknown): Level | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  return (LEVELS as readonly string[]).includes(s) ? (s as Level) : null
}

function tier(v: unknown): Tier | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase()
  return (TIERS as readonly string[]).includes(s) ? (s as Tier) : null
}

function itemType(v: unknown): ItemType | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (s === 'feature') return 'Feature'
  if (s === 'fix') return 'Fix'
  return null
}

// Parses and validates the model's JSON. Invalid items are dropped; throws when
// nothing usable is left so the caller can retry or show an error.
export function parseItems(text: string, max: number = MAX_ITEMS): Draft[] {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('a resposta não veio em JSON')
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('o JSON veio malformado')
  }
  const list = raw && typeof raw === 'object' ? (raw as { items?: unknown }).items : undefined
  if (!Array.isArray(list)) throw new Error('faltou a lista "items"')

  const out: Draft[] = []
  for (const x of list) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const t = tier(o.tier)
    const type = itemType(o.type)
    const title = str(o.title, 120)
    const description = str(o.description, 300)
    const impact = level(o.impact)
    const risk = level(o.risk)
    if (!t || !type || !title || !description || !impact || !risk) continue
    const value =
      typeof o.value === 'number' && Number.isFinite(o.value)
        ? Math.min(10, Math.max(1, Math.round(o.value)))
        : 5
    const files = Array.isArray(o.files)
      ? o.files.filter((f): f is string => typeof f === 'string' && f.trim() !== '').slice(0, 3)
      : []
    out.push({ tier: t, type, title, description, impact, risk, value, files })
    if (out.length >= max) break
  }
  if (out.length < MIN_ITEMS) throw new Error('nenhum item válido na resposta')
  return out
}

// Sorts by tier (S first), then value (highest first) and gives each item a
// short ID such as S1 or A3. IDs are assigned once per scan and do not change.
export function assignIds(drafts: Draft[]): Item[] {
  const order = (t: Tier) => TIERS.indexOf(t)
  const sorted = [...drafts].sort(
    (a, b) => order(a.tier) - order(b.tier) || b.value - a.value || a.title.localeCompare(b.title),
  )
  const counter: Partial<Record<Tier, number>> = {}
  return sorted.map(d => {
    const n = (counter[d.tier] ?? 0) + 1
    counter[d.tier] = n
    return { ...d, id: `${d.tier}${n}` }
  })
}

// Words of a title that carry meaning, for matching items to files.
export function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-zà-ú0-9]+/i).filter(w => w.length > 3))]
}

export const DEFAULT_MIN = 8
export const DEFAULT_MAX = 40
export type Limits = { min: number; max: number }
export const DEFAULT_LIMITS: Limits = { min: DEFAULT_MIN, max: DEFAULT_MAX }

// Reads optional "min=N" and "max=N" from the text after /tiers. Missing values
// keep their defaults. Returns an error message instead of limits when invalid.
export function parseLimits(text: string): Limits | { error: string } {
  let min = DEFAULT_MIN
  let max = DEFAULT_MAX
  for (const m of text.matchAll(/\b(min|max)\s*=\s*(\S+)/gi)) {
    const n = Number(m[2])
    const key = (m[1] ?? '').toLowerCase()
    if (!Number.isInteger(n) || n < 1 || n > MAX_ITEMS) {
      return { error: `${key}=${m[2]} inválido: use um inteiro de 1 a ${MAX_ITEMS}.` }
    }
    if (key === 'min') min = n
    else max = n
  }
  if (min > max) return { error: `min (${min}) não pode ser maior que max (${max}).` }
  return { min, max }
}

export function formatReference(items: Item[]): string {
  return items.map(i => `${i.id} — ${i.title}`).join('\n')
}
