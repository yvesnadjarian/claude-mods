import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Analysis, Run } from '../types'

const PLUGIN = 'melhorar-prompt'
const PANE = 'melhorar-prompt'
const TITLE = 'Melhorar Prompt'
const MODEL = 'sonnet'

const IDLE: Run = { status: 'idle', source: '', analysis: null, error: null }
const run = atom({ plugin: 'melhorar-prompt', key: 'run' } as const, IDLE, { shape: 'run-1' })

const SYSTEM = `Você é um engenheiro de prompts sênior. O usuário vai te mandar um rascunho de prompt que ele pretende enviar a um assistente de IA de programação (Claude Code). Sua tarefa é analisá-lo e devolver SOMENTE um objeto JSON válido, sem texto antes ou depois, sem cercas de código, com exatamente estas chaves:

{
  "improvedPrompt": string,   // o prompt reescrito: claro, específico, com objetivo, contexto, restrições, critérios de pronto e formato de saída quando fizer sentido. Mantenha a intenção original e o idioma original do rascunho. Não invente fatos; onde faltar informação, use marcadores como [ESPECIFICAR: ...].
  "questions": string[],      // 3 a 6 perguntas de esclarecimento, curtas e objetivas, cujas respostas mudariam de fato o resultado.
  "blindspots": string[],     // 3 a 6 pontos cegos: riscos, casos de borda, suposições implícitas, requisitos não ditos (segurança, desempenho, testes, acessibilidade, compatibilidade, dados, custo, manutenção...). Cada item: o problema e por que importa, em uma frase.
  "features": string[]        // 3 a 6 sugestões de funcionalidades ou melhorias que agregariam valor ao que o usuário quer construir, cada uma em uma frase.
}

Escreva perguntas, pontos cegos e sugestões em português do Brasil. Seja concreto e específico ao rascunho; nada genérico.`

function parseAnalysis(text: string): Analysis {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('a resposta não veio em JSON')
  const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  const improvedPrompt = typeof raw.improvedPrompt === 'string' ? raw.improvedPrompt.trim() : ''
  if (!improvedPrompt) throw new Error('a resposta não trouxe o prompt melhorado')

  return {
    improvedPrompt,
    questions: list(raw.questions),
    blindspots: list(raw.blindspots),
    features: list(raw.features),
  }
}

// Runs one analysis of `source` and stores the result for the pane.
async function analyze($: EngineInterface, source: string) {
  const text = source.trim()
  if (!text) {
    $.ui.toast('Digite seu prompt primeiro (ou use /melhorar <texto>).')
    return
  }
  if ((await read($, run)).status === 'loading') return

  await update($, run, (): Run => ({ status: 'loading', source: text, analysis: null, error: null }))
  void $.ui.open({ id: PANE, title: TITLE, closeOnEscape: true })

  const reply = await $.model.complete({
    model: MODEL,
    system: SYSTEM,
    prompt: `Rascunho do prompt:\n\n<rascunho>\n${text}\n</rascunho>`,
    maxTokens: 4000,
    timeoutMs: 180000,
  })

  if (!reply.isAnswered) {
    const why = reply.reason === 'api-error' ? `erro da API (${reply.status ?? '?'})` : reply.reason
    await update($, run, (r): Run => ({ ...r, status: 'error', error: `Não foi possível analisar: ${why}.` }))
    return
  }

  try {
    const analysis = parseAnalysis(reply.text)
    await update($, run, (r): Run => ({ ...r, status: 'done', analysis }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await update($, run, (r): Run => ({ ...r, status: 'error', error: `Não foi possível ler a análise: ${msg}.` }))
  }
}

// A prompt ending in "/melhorar" (e.g. "faça X /melhorar") is analyzed instead
// of sent. Works in a new session, before the button has been drawn.
const TRIGGER = /(?:^|\s)\/melhorar\s*$/i

async function restoreDraft($: EngineInterface, text: string) {
  // The composer clears itself after a send; put the draft back once it has.
  await $.clock.sleep(300)
  await $.prompt.fill({ text, mode: 'replace' })
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (!TRIGGER.test(e.text)) return next(e)
    const source = e.text.replace(TRIGGER, '').trim()
    if (!source) return { drop: 'Escreva o prompt antes de /melhorar.' }
    void analyze($, source)
    void restoreDraft($, source)

    return { drop: 'Melhorar Prompt: analisando… (o prompt não foi enviado ao Claude)' }
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'melhorar',
      description: 'Melhora o prompt (o texto dado, ou o rascunho na caixa): perguntas, pontos cegos e sugestões',
    })

    return next(e)
  })

  // /melhorar <texto>: uses the typed args, else the draft in the box.
  on('command.run', { command: 'melhorar' }, async ($, e) => {
    if ((await read($, run)).status === 'loading') return { text: 'Já existe uma análise em andamento.' }
    const typed = e.args.trim()
    const source = typed || (await $.prompt.read()).text
    if (!source.trim()) return { text: 'Uso: /melhorar <seu prompt>' }
    void analyze($, source)

    return { text: 'Analisando o prompt… veja o painel "Melhorar Prompt".' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const state = await read($, run)
    const isLoading = state.status === 'loading'

    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="melhorar"
          label={isLoading ? 'Melhorando…' : '✨ Melhorar Prompt'}
          variant="primary"
          onPress={async () => {
            if (isLoading) {
              void $.ui.open({ id: PANE, title: TITLE, closeOnEscape: true })
              return
            }
            const { text } = await $.prompt.read()
            await analyze($, text)
          }}
        />
        {state.status === 'done' && (
          <Button
            key="ver"
            label="Ver análise"
            dimColor
            onPress={() => void $.ui.open({ id: PANE, title: TITLE, closeOnEscape: true })}
          />
        )}
        {/* Opens the New Features Tier List mod's scan (its /tiers command), beside this button. */}
        <Button
          key="tier-list"
          label="New Features Tier List"
          onPress={() => void $.command.run({ command: 'tiers' })}
        />
        {isLoading && <Text dimColor>analisando seu prompt…</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const state = await read($, run)
    const a = state.analysis

    const section = (title: string, items: string[]) =>
      items.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{title}</Text>
          {items.map((item, i) => (
            <Text key={`${title}-${i}`}>
              {i + 1}. {item}
            </Text>
          ))}
        </Box>
      )

    if (state.status === 'idle') {
      return <Text dimColor>Digite um prompt e clique em “✨ Melhorar Prompt”.</Text>
    }
    if (state.status === 'loading') {
      return <Text dimColor>Analisando seu prompt com {MODEL}…</Text>
    }
    if (state.status === 'error' || !a) {
      return (
        <Box flexDirection="column">
          <Text color="red">{state.error ?? 'Algo deu errado.'}</Text>
          <Box marginTop={1}>
            <Button key="retry" label="Tentar de novo" onPress={() => void analyze($, state.source)} />
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text bold>✨ Prompt melhorado</Text>
        <Text>{a.improvedPrompt}</Text>
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Button
            key="usar"
            label="Usar prompt melhorado"
            variant="primary"
            onPress={async () => {
              const r = await $.prompt.fill({ text: a.improvedPrompt, mode: 'replace' })
              $.ui.toast(r.isFilled ? 'Prompt melhorado colocado na caixa.' : 'Não consegui preencher a caixa de prompt.')
            }}
          />
          {a.questions.length > 0 && (
            <Button
              key="responder"
              label="Responder perguntas"
              onPress={async () => {
                const block =
                  '\n\nRespostas às perguntas de esclarecimento:\n' +
                  a.questions.map((q, i) => `${i + 1}. ${q}\n   → `).join('\n')
                const r = await $.prompt.fill({ text: block, mode: 'append' })
                if (r.isFilled) $.ui.toast('Responda na caixa e clique em Melhorar Prompt de novo.')
              }}
            />
          )}
          <Button key="refazer" label="Analisar de novo" dimColor onPress={() => void analyze($, state.source)} />
          <Button key="fechar" label="Fechar" role="dismiss" onPress={() => void $.ui.close({ id: PANE })} />
        </Box>
        {section('❓ Perguntas de esclarecimento', a.questions)}
        {section('⚠️ Pontos cegos', a.blindspots)}
        {section('💡 Sugestões de features', a.features)}
      </Box>
    )
  })
}
