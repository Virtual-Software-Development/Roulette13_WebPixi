import { useEffect, useState } from 'react'
import type { AdminConfig } from '../types/adminConfig'
import { fetchAdminConfig, saveAdminConfig } from '../api/adminConfig'

export function GameConfigPage() {
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    fetchAdminConfig()
      .then((data) => {
        if (!cancelled) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!config) return <p>Loading…</p>

  const update = (patch: Partial<AdminConfig>) => setConfig({ ...config, ...patch })

  const handleSave = async () => {
    setStatus('saving')
    try {
      const saved = await saveAdminConfig(config)
      setConfig(saved)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <h2>Game Config</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
        <label>
          Game name
          <input value={config.gameName} onChange={(e) => update({ gameName: e.target.value })} />
        </label>
        <label>
          Logo URL
          <input value={config.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} />
        </label>
        <label>
          Background URL
          <input value={config.backgroundUrl} onChange={(e) => update({ backgroundUrl: e.target.value })} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.showLogo}
            onChange={(e) => update({ showLogo: e.target.checked })}
          />
          Show logo
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.showDrawInfo}
            onChange={(e) => update({ showDrawInfo: e.target.checked })}
          />
          Show draw info
        </label>
        <button type="button" onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <p>Saved.</p>}
        {status === 'error' && <p style={{ color: 'crimson' }}>Something went wrong.</p>}
      </div>
    </div>
  )
}
