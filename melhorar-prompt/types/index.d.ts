export type Analysis = {
  improvedPrompt: string
  questions: string[]
  blindspots: string[]
  features: string[]
}

export type Run = {
  status: 'idle' | 'loading' | 'done' | 'error'
  source: string
  analysis: Analysis | null
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'melhorar-prompt': { run: Shaped<Run> }
  }
}
