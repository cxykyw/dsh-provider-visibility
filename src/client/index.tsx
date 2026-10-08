import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import React, { useCallback, useLayoutEffect, useSyncExternalStore } from 'react'

const NS = 'provider-visibility' as const
/** 所有自定义提供方所在的 settings 命名空间（provider-card 插槽按 settingsNs 分发）。 */
const LLM_NS = 'llm-pi-ai'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'provider-visibility': 'label' | 'tooltip'
  }
  interface SlotMap {
    'settings.models.provider-card': {
      kind: 'keyed'
      scope: 'root'
      owner: {
        provider: {
          provider: string
          displayName?: string
          settingsNs: string
          settingsPath: string[]
          declared?: boolean
        }
        configured: boolean
        keyConfigured: boolean
      }
    }
  }
}

// DSH 0.2.x: the client-side `settingsScope` service was removed along with
// `dsh-client-runtime`. Settings are read through `ctx.remote.settings` and
// refreshed on the `settings/document-updated` push, so only services that
// still exist may be declared here — cordis holds effects until every
// injected service arrives, and a missing one would silently disable the UI.
export const inject = [
  'slots',
  'locale',
  'remote',
  'remote.settings',
  'modelDirectories',
] as const

/* ------------------------- 状态读取 ------------------------- */

type DescribeView = {
  writable?: boolean
  namespaces?: Array<{ ns: string; value?: unknown }>
}

function hiddenSetFromView(view: DescribeView | undefined): Set<string> {
  const ns = view?.namespaces?.find((v) => v?.ns === LLM_NS)
  const providers = (ns?.value as any)?.providers
  if (!providers || typeof providers !== 'object') return new Set()
  return new Set(
    Object.keys(providers).filter((id) => {
      const p = (providers as any)[id]
      return p !== null && typeof p === 'object' && p.pickerHidden === true
    }),
  )
}

/** 从 remote describe 的各种返回形态里提取带 namespaces 的视图。 */
function pickView(raw: unknown): DescribeView | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const v = raw as any
  if (Array.isArray(v.namespaces)) return v
  if (v.view && Array.isArray(v.view.namespaces)) return v.view
  if (v.value && Array.isArray(v.value.namespaces)) return v.value
  return undefined
}

/**
 * 0.1.x 的 settingsScope.describe() 返回带响应式 store 的镜像；0.2.x 里该
 * service 已删除，改用 remote.settings.describe() 拉取 + settings/document-updated
 * 推送刷新，自建一个接口兼容的 mirror（{ store: {getSnapshot, subscribe}, ensure }），
 * 组件侧的 useSyncExternalStore 用法保持不变。
 */
function createSettingsMirror(ctx: ClientContext) {
  let view: DescribeView | undefined
  const listeners = new Set<() => void>()
  const store = {
    getSnapshot: () => view,
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
  const refresh = async () => {
    try {
      const raw: any = await (ctx as any).remote.settings.describe()
      const next = pickView(raw?.ok ? raw.value : raw)
      if (next !== view) {
        view = next
        for (const cb of listeners) cb()
      }
    } catch (error) {
      console.warn('[provider-visibility] settings describe failed:', error)
    }
  }
  const mirror = { store, ensure: () => refresh() }
  ctx.effect(() => {
    void refresh()
    return ctx.on('settings/document-updated' as never, (() => {
      void refresh()
    }) as never)
  }, 'provider-visibility: settings mirror')
  return mirror
}

/* ------------------------- 胶囊开关 ------------------------- */

function CapsuleSwitch({ on, pending, onToggle }: { on: boolean; pending: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={onToggle}
      style={{
        width: 28,
        height: 16,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        position: 'relative',
        flex: '0 0 auto',
        background: on
          ? 'var(--dsw-alias-state-success-primary, #22c55e)'
          : 'var(--dsw-alias-bg-overlay, rgba(128,128,128,.45))',
        cursor: pending ? 'wait' : 'pointer',
        transition: 'background .18s ease',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transform: on ? 'translateX(12px)' : 'translateX(0)',
          transition: 'transform .18s ease',
          display: 'block',
        }}
      />
    </button>
  )
}

type ToggleProps = {
  provider: { provider: string; settingsNs: string; settingsPath: string[] }
  face: any
  mutate: (ns: string, ops: Array<Record<string, unknown>>) => Promise<unknown>
  t: (key: 'label' | 'tooltip') => string
}

function ProviderVisibilityToggle({ provider, face, mutate, t }: ToggleProps) {
  const getSnapshot = useCallback(() => face.store.getSnapshot(), [face])
  const subscribe = useCallback((cb: () => void) => face.store.subscribe(cb), [face])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  const hidden = hiddenSetFromView(snapshot?.view).has(provider.provider)

  const [pending, setPending] = React.useState(false)
  const toggle = useCallback(async () => {
    if (pending) return
    const path = [...(provider.settingsPath ?? [])]
    if (path.length === 0) return
    setPending(true)
    try {
      const op = hidden
        ? { op: 'unset', path: [...path, 'pickerHidden'] }
        : { op: 'set', path: [...path, 'pickerHidden'], value: true }
      const res: any = await mutate(provider.settingsNs, [op])
      if (res && res.ok === false) console.warn('[provider-visibility] write refused:', res.error?.message)
    } catch (error) {
      console.warn('[provider-visibility] write failed:', error)
    } finally {
      setPending(false)
    }
  }, [hidden, mutate, pending, provider])

  // 官方插槽渲染在标题行下一行；把本节点搬进标题行右侧的 rowActions
  // （「编辑/删除」所在 span），插在编辑按钮前面，视觉上与操作按钮同行。
  // 每次提交后重新挂靠：React 重渲染重建节点时也能跟回正确的位置。
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    let host: HTMLElement | null = node.parentElement
    let editBtn: HTMLButtonElement | undefined
    while (host) {
      editBtn = [...host.querySelectorAll('button')].find((b) =>
        /^(Edit|编辑)$/.test((b.textContent || '').trim()),
      )
      if (editBtn) break
      host = host.parentElement
    }
    const actions = editBtn?.parentElement
    if (!actions || actions === node.parentElement) return
    actions.insertBefore(node, editBtn)
  })

  return (
    <div
      ref={rootRef}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 2 }}
    >
      <CapsuleSwitch on={hidden} pending={pending} onToggle={() => void toggle()} />
      <span
        title={t('tooltip')}
        style={{
          fontSize: 12,
          color: 'var(--dsw-alias-label-tertiary, #999)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {t('label')}
      </span>
    </div>
  )
}

/* ------------------------- 模型列表过滤 ------------------------- */

/**
 * 包装共享 modelCatalog 的 load：把宿主返回的 groups 按 pickerHidden 过滤后
 * 写回 catalog store。/model 弹窗与输入框模型座都从这份数据派生，一处生效。
 * settings/document-updated 推送会触发 catalog.refresh()，勾选即时生效。
 */
function wrapCatalogFilter(ctx: ClientContext, modelDirectories: any): void {
  const catalog = modelDirectories?.catalog
  if (!catalog || typeof catalog.load !== 'function' || (catalog as any).__pvWrapped) return
  ;(catalog as any).__pvWrapped = true
  const store = catalog.store
  const origLoad = catalog.load.bind(catalog)
  catalog.load = async (...args: unknown[]) => {
    const value = await origLoad(...args)
    try {
      const snap: any = store.getSnapshot()
      if (snap?.status === 'ready' && snap.value && Array.isArray(snap.value.groups)) {
        const described: any = await (ctx as any).remote.settings.describe()
        const hidden = described?.ok ? hiddenSetFromView(described.value) : new Set<string>()
        if (hidden.size > 0) {
          const groups = snap.value.groups.filter((g: any) => !hidden.has(g?.id))
          if (groups.length !== snap.value.groups.length) {
            const filtered = { ...snap.value, groups }
            store.set({ value: filtered, status: 'ready', error: null })
            return filtered
          }
        }
      }
    } catch (error) {
      console.warn('[provider-visibility] filter failed:', error)
    }
    return value
  }
}

/* ------------------------- 插件入口 ------------------------- */

export function apply(ctx: ClientContext): void {
  ctx.effect(
    () =>
      ctx.locale.register(NS, {
        zh: { label: '对话框隐藏', tooltip: '打开后，该提供方的模型不出现在对话框的模型选择列表里' },
        en: { label: 'Hide in chat', tooltip: "Hide this provider's models from the chat model picker" },
      }),
    'provider-visibility: locale',
  )

  const mirror: any = createSettingsMirror(ctx)
  mirror.ensure?.()

  const mutate = (ns: string, ops: Array<Record<string, unknown>>) =>
    (ctx as any).remote.settings.mutate(ns, ops, undefined)

  // 过滤：modelDirectories 由 ui-model-selection 提供，core bundle 先于用户插件激活
  const modelDirectories: any = (ctx as any).modelDirectories
  if (modelDirectories?.catalog) {
    wrapCatalogFilter(ctx, modelDirectories)
  } else {
    console.warn('[provider-visibility] modelDirectories unavailable — picker filter disabled')
  }

  ctx.slots.inject('settings.models.provider-card', () =>
    ctx.slots.register(
      {
        // 0.2.x：id → registrant（缺省自动取 fiber name），order → priority；
        // options 在运行时整体透传，字段名按新类型走。
        name: 'settings.models.provider-card',
        key: LLM_NS,
        priority: 50,
        locale: NS,
        registrant: 'provider-visibility',
        inject: () => ({ face: mirror, mutate, t: ctx.locale.bind(NS) }),
      } as never,
      ProviderVisibilityToggle as never,
    ),
  )
}
