import { useState, type ReactNode } from 'react'
import { Check, Download, Info, Languages, Loader2, Moon, RotateCcw, Sun, Volume2, X } from 'lucide-react'
import { askLLM, llmReady, loadLLM, saveLLM } from '@/lib/llm'
import type { LLMConfig } from '@/lib/llm'
import { useGame } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px]">{label}</div>
        {desc ? <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{desc}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-[var(--surface)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[12px] transition-colors',
            value === o.value ? 'bg-[var(--surface-2)] text-ink' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const t = useT()
  const settings = useGame((s) => s.settings)
  const patch = useGame((s) => s.patchSettings)
  const resetAll = useGame((s) => s.resetAll)
  const profile = useGame((s) => s.profile)
  const cards = useGame((s) => s.cards)
  const logs = useGame((s) => s.logs)
  const runs = useGame((s) => s.runs)

  const [confirming, setConfirming] = useState(false)
  const [llm, setLlm] = useState<LLMConfig>(() => loadLLM())
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'bad' | null>(null)

  const patchLlm = (p: Partial<LLMConfig>) => {
    setLlm(saveLLM(p))
    setTestResult(null)
  }

  const testLlm = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await askLLM([{ role: 'user', content: 'Reply with the single word: ok' }], llm)
      setTestResult('ok')
    } catch {
      setTestResult('bad')
    } finally {
      setTesting(false)
    }
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, cards, logs, runs, settings }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordquest-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-medium tracking-tight sm:text-[26px]">{t('settings.title')}</h1>
      </header>

      <section className="card px-5">
        <Row label={t('settings.lang')} desc="界面语言 / Interface language">
          <Seg
            value={settings.uiLocale}
            onChange={(v) => patch({ uiLocale: v })}
            options={[
              { value: 'zh', label: '中文' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </Row>
        <Row label={t('settings.theme')}>
          <Seg
            value={settings.theme}
            onChange={(v) => patch({ theme: v })}
            options={[
              { value: 'dark', label: t('settings.dark'), icon: <Moon size={12} /> },
              { value: 'light', label: t('settings.light'), icon: <Sun size={12} /> },
            ]}
          />
        </Row>
        <Row label={t('settings.goal')} desc={`${settings.dailyGoal} ${t('common.words')} / day`}>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={settings.dailyGoal}
            onChange={(e) => patch({ dailyGoal: Number(e.target.value) })}
            className="h-1.5 w-[120px] cursor-pointer appearance-none rounded-full bg-[var(--surface-2)] accent-[var(--brand)] sm:w-[160px]"
          />
        </Row>
        <Row label={t('settings.sound')} desc={t('settings.soundDesc')}>
          <button
            onClick={() => patch({ sound: !settings.sound })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              settings.sound ? 'bg-brand' : 'bg-[var(--surface-2)]',
            )}
            aria-pressed={settings.sound}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                settings.sound ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </Row>
      </section>

      <section className="card px-5">
        <Row label={t('settings.llm')} desc={t('settings.llmDesc')}>
          <button
            role="switch"
            aria-checked={llm.enabled}
            onClick={() => patchLlm({ enabled: !llm.enabled })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              llm.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--surface-2)]',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                llm.enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </Row>

        {llm.enabled && (
          <div className="space-y-2.5 pb-4 pt-1">
            <div>
              <div className="mb-1 text-[11px] text-ink-3">{t('settings.llmBase')}</div>
              <input
                value={llm.baseUrl}
                onChange={(e) => patchLlm({ baseUrl: e.target.value })}
                placeholder={t('settings.llmBaseHint')}
                className="w-full rounded-xl border border-line bg-[var(--surface)] px-3 py-2 text-[12.5px] outline-none focus:border-[rgba(var(--brand-rgb)/0.5)]"
                spellCheck={false}
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-ink-3">{t('settings.llmModel')}</div>
              <input
                value={llm.model}
                onChange={(e) => patchLlm({ model: e.target.value })}
                placeholder="gpt-4o-mini / deepseek-chat / qwen-plus"
                className="w-full rounded-xl border border-line bg-[var(--surface)] px-3 py-2 text-[12.5px] outline-none focus:border-[rgba(var(--brand-rgb)/0.5)]"
                spellCheck={false}
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-ink-3">{t('settings.llmKey')}</div>
              <input
                type="password"
                value={llm.apiKey}
                onChange={(e) => patchLlm({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-xl border border-line bg-[var(--surface)] px-3 py-2 text-[12.5px] outline-none focus:border-[rgba(var(--brand-rgb)/0.5)]"
                spellCheck={false}
              />
              <div className="mt-1 text-[10.5px] text-ink-3">{t('settings.llmKeyHint')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn !px-3 !py-2 text-[12px]"
                disabled={testing || !llmReady(llm)}
                onClick={() => void testLlm()}
              >
                {testing ? <Loader2 size={12} className="animate-spin" /> : null}
                {testing ? t('settings.llmTesting') : t('settings.llmTest')}
              </button>
              {testResult === 'ok' && (
                <span className="flex items-center gap-1 text-[11.5px] text-[var(--green)]">
                  <Check size={12} /> {t('settings.llmOk')}
                </span>
              )}
              {testResult === 'bad' && (
                <span className="flex items-center gap-1 text-[11.5px] text-[var(--rose)]">
                  <X size={12} /> {t('settings.llmBad')}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card px-5">
        <Row label={t('settings.export')} desc="JSON · 学习记录与卡片状态">
          <button className="btn !px-3 !py-2 text-[12px]" onClick={exportData}>
            <Download size={13} />
            JSON
          </button>
        </Row>
        <Row label={t('settings.reset')} desc={t('settings.resetDesc')}>
          <button
            className={cn(
              'btn !px-3 !py-2 text-[12px]',
              confirming
                ? '!border-[var(--rose)] !bg-[color-mix(in_srgb,var(--rose)_16%,transparent)] !text-[var(--rose)]'
                : '!text-ink-2',
            )}
            onClick={() => {
              if (!confirming) {
                setConfirming(true)
                window.setTimeout(() => setConfirming(false), 4000)
              } else {
                resetAll()
                setConfirming(false)
              }
            }}
          >
            <RotateCcw size={13} />
            {confirming ? t('settings.resetConfirm') : t('settings.reset')}
          </button>
        </Row>
      </section>

      <section className="card flex items-start gap-3 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-ink-2">
          <Info size={16} />
        </div>
        <div>
          <div className="text-[13px] font-medium">{t('settings.about')} · 词跃 WordQuest v1.0</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{t('settings.aboutDesc')}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-3">
            <span className="flex items-center gap-1">
              <Languages size={11} /> 3 languages
            </span>
            <span className="flex items-center gap-1">
              <Volume2 size={11} /> Web Speech
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
