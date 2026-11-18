// Run: node --experimental-strip-types --test tests/logic.test.ts  (Node 22.6+)
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assignIds,
  buildContext,
  isCandidateFile,
  isIgnoredDir,
  parseItems,
  parseLimits,
  rankScore,
  sortCandidates,
  todoLines,
} from '../../tier-list-features/hooks/logic.ts'

const ok = (title: string, extra: Record<string, unknown> = {}) => ({
  tier: 'B',
  type: 'Fix',
  title,
  description: 'Descrição curta.',
  impact: 'médio',
  risk: 'médio',
  value: 5,
  files: [],
  ...extra,
})

test('ignores generated, dependency and VCS folders, and engine typings', () => {
  assert.equal(isIgnoredDir('node_modules', 'node_modules'), true)
  assert.equal(isIgnoredDir('dist', 'dist'), true)
  assert.equal(isIgnoredDir('.git', '.git'), true)
  assert.equal(isIgnoredDir('.github', '.github'), false)
  assert.equal(isIgnoredDir('types', '.claude-plugin/types'), true)
  assert.equal(isIgnoredDir('src', 'src'), false)
})

test('accepts source, docs and config; rejects secrets, lockfiles, minified and binaries', () => {
  assert.equal(isCandidateFile('register.tsx'), true)
  assert.equal(isCandidateFile('README.md'), true)
  assert.equal(isCandidateFile('Dockerfile'), true)
  assert.equal(isCandidateFile('package-lock.json'), false)
  assert.equal(isCandidateFile('app.min.js'), false)
  assert.equal(isCandidateFile('.env'), false)
  assert.equal(isCandidateFile('server.key'), false)
  assert.equal(isCandidateFile('logo.png'), false)
  assert.equal(isCandidateFile('index.d.ts'), false)
})

test('reads docs and config before source, and tests before plain source', () => {
  assert.equal(rankScore('README.md'), 0)
  assert.equal(rankScore('package.json'), 1)
  assert.equal(rankScore('tests/a.test.ts'), 2)
  assert.equal(rankScore('src/app.ts'), 3)
  const sorted = sortCandidates([
    { label: 'p/src/app.ts', abs: '', rel: 'src/app.ts', size: 1 },
    { label: 'p/README.md', abs: '', rel: 'README.md', size: 1 },
  ])
  assert.equal(sorted[0]?.rel, 'README.md')
})

test('extracts TODO/FIXME lines with file and line number', () => {
  const lines = todoLines('p/a.ts', 'ok\n// TODO: trocar\nfine\nFIXME quebra')
  assert.deepEqual(lines, ['p/a.ts:2: // TODO: trocar', 'p/a.ts:4: FIXME quebra'])
})

test('buildContext wraps files in labelled blocks', () => {
  const out = buildContext([{ label: 'p/a.ts', text: 'x' }], ['p/a.ts:1: TODO'])
  assert.match(out, /<arquivo caminho="p\/a\.ts">\nx\n<\/arquivo>/)
  assert.match(out, /<todos>\np\/a\.ts:1: TODO\n<\/todos>/)
})

test('parses valid JSON, even wrapped in prose or code fences', () => {
  const text = 'Aqui:\n```json\n{"items":[' + JSON.stringify(ok('Corrigir X')) + ']}\n```'
  const items = parseItems(text)
  assert.equal(items.length, 1)
  assert.equal(items[0]?.title, 'Corrigir X')
})

test('drops invalid items, keeps valid ones, normalises type and tier', () => {
  const text = JSON.stringify({
    items: [
      ok('bom', { type: 'feature', tier: 'a' }),
      ok('tier errado', { tier: 'Z' }),
      ok('sem descrição', { description: '' }),
      ok('impacto errado', { impact: 'enorme' }),
      ok('valor fora', { value: 99 }),
    ],
  })
  const items = parseItems(text)
  assert.deepEqual(
    items.map(i => i.title),
    ['bom', 'valor fora'],
  )
  assert.equal(items[0]?.type, 'Feature')
  assert.equal(items[0]?.tier, 'A')
  assert.equal(items[1]?.value, 10)
})

test('throws on non-JSON, malformed JSON, missing items, or nothing valid', () => {
  assert.throws(() => parseItems('sem json'), /não veio em JSON/)
  assert.throws(() => parseItems('{"items": [}'), /malformado/)
  assert.throws(() => parseItems('{"x":1}'), /faltou a lista/)
  assert.throws(() => parseItems('{"items":[{"tier":"Z"}]}'), /nenhum item válido/)
})

test('assigns stable IDs by tier, highest value first', () => {
  const drafts = parseItems(
    JSON.stringify({
      items: [
        ok('c baixo', { tier: 'C', value: 2 }),
        ok('s menor', { tier: 'S', value: 4 }),
        ok('s maior', { tier: 'S', value: 9 }),
        ok('a único', { tier: 'A', value: 1 }),
      ],
    }),
  )
  const items = assignIds(drafts)
  assert.deepEqual(
    items.map(i => [i.id, i.title]),
    [
      ['S1', 's maior'],
      ['S2', 's menor'],
      ['A1', 'a único'],
      ['C1', 'c baixo'],
    ],
  )
})

test('parseLimits: defaults, min/max, and validation', () => {
  assert.deepEqual(parseLimits(''), { min: 8, max: 40 })
  assert.deepEqual(parseLimits('min=5 max=20'), { min: 5, max: 20 })
  assert.deepEqual(parseLimits('max = 12'), { min: 8, max: 12 })
  assert.deepEqual(parseLimits('min=30'), { min: 30, max: 40 })
  assert.match((parseLimits('min=0') as { error: string }).error, /min=0 inválido/)
  assert.ok('error' in parseLimits('max=99'))
  assert.ok('error' in parseLimits('min=abc'))
  assert.ok('error' in parseLimits('min=20 max=5'))
})

test('parseItems stops at the max given', () => {
  const many = { items: Array.from({ length: 10 }, (_, i) => ok(`item ${i}`)) }
  assert.equal(parseItems(JSON.stringify(many), 4).length, 4)
  assert.equal(parseItems(JSON.stringify(many)).length, 10)
})
