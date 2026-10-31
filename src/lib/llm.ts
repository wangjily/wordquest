/**
 * 可选的大模型接入。
 *
 * 站点本身是纯静态的，所以不预置任何 API Key：用户可以在设置里填任意
 * OpenAI 兼容接口（OpenAI / DeepSeek / Moonshot / 本地 Ollama、LM Studio 都行），
 * 填了就由浏览器直连，不填就退回本地引擎。
 */

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
}

const STORE_KEY = 'wordquest-llm-v1'

const DEFAULTS: LLMConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  enabled: false,
}

export function loadLLM(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<LLMConfig>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveLLM(patch: Partial<LLMConfig>): LLMConfig {
  const next = { ...loadLLM(), ...patch }
  localStorage.setItem(STORE_KEY, JSON.stringify(next))
  return next
}

export function llmReady(cfg = loadLLM()): boolean {
  return cfg.enabled && Boolean(cfg.apiKey.trim()) && Boolean(cfg.baseUrl.trim())
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 调用 OpenAI 兼容的 /chat/completions，支持流式增量回调。
 * 出错时抛异常，由调用方决定是否回退到本地引擎。
 */
export async function askLLM(
  messages: ChatMessage[],
  cfg: LLMConfig,
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const url = `${base}/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.4,
      stream: Boolean(onDelta),
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${txt.slice(0, 120)}`)
  }

  if (!onDelta) {
    const json = await res.json()
    return json?.choices?.[0]?.message?.content ?? ''
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应不支持流式读取')

  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json?.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          onDelta(delta)
        }
      } catch {
        // 忽略不完整的 SSE 片段
      }
    }
  }

  return full
}
