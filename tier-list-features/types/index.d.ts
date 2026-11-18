export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'
export type ItemType = 'Feature' | 'Fix'
export type Level = 'alto' | 'médio' | 'baixo'

export type Item = {
  id: string
  tier: Tier
  type: ItemType
  title: string
  description: string
  impact: Level
  risk: Level
  value: number
  files: string[]
}

export type Qa = { question: string; answer: string }
export type Index = { label: string; abs: string }

export type Board = {
  status: 'idle' | 'scanning' | 'done' | 'error'
  error: string | null
  summary: string
  limits: { min: number; max: number }
  items: Item[]
  index: Index[]
  selected: string[]
  qa: Record<string, Qa[]>
  asking: string | null
  busy: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'tier-list-features': { board: Shaped<Board> }
  }
}
