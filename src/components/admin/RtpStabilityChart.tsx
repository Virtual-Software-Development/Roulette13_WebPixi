import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RtpGame, RtpStabilityData } from '../../types/rtpDashboard'
import './rtpStabilityChart.css'

// RTP acumulado vs rondas jugadas, sobre el "embudo" del rango esperado por puro azar (target ±
// 1.96·σ/√n, ~95%): responde "¿esta desviación es real o es suerte?". Si la línea queda dentro del
// embudo, la diferencia con el target la explica la varianza normal; si sale y se mantiene afuera,
// hay algo que revisar. Marca el Correction Window de RTP Settings (rondas que usa el motor para
// calcular el RTP). SVG dibujado al tamaño real del contenedor (ResizeObserver), mismo criterio que
// BetsAndPayoutsChart, para llenar el alto libre de la columna sin deformar el texto.
const FALLBACK_SIZE = { width: 520, height: 240 }
const MARGIN = { top: 12, right: 12, bottom: 26, left: 46 }
const Z_95 = 1.96

const GAMES: { id: RtpGame; labelKey: string; color: string }[] = [
  { id: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette', color: 'var(--admin-red)' },
  { id: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3', color: 'var(--admin-green)' },
  { id: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4', color: 'var(--admin-amber)' },
]

function compactRounds(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n))
}

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
}

export function RtpStabilityChart({ dataByGame }: { dataByGame: Record<RtpGame, RtpStabilityData> }) {
  const { t, i18n } = useTranslation()
  const [game, setGame] = useState<RtpGame>('roulette')
  const [hovered, setHovered] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(FALLBACK_SIZE)

  useLayoutEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const data = dataByGame[game]
  const gameDef = GAMES.find((g) => g.id === game)!
  const halfWidth = (n: number) => (Z_95 * data.sigma * 100) / Math.sqrt(n)
  const points = data.points
  const totalRounds = points[points.length - 1].rounds
  const latest = points[points.length - 1]
  const latestHalf = halfWidth(latest.rounds)
  const withinRange = Math.abs(latest.rtp - data.target) <= latestHalf

  // Eje Y centrado en el target y escalado a la parte "asentada" (desde el ~8% de las rondas): las
  // primeras cientos de rondas son muy ruidosas y aplastarían el resto; lo que se sale del eje se
  // recorta contra el borde (el embudo arranca abierto, que es justamente el mensaje).
  const settledFrom = totalRounds * 0.08
  const settled = points.filter((p) => p.rounds >= settledFrom)
  const yExtent = Math.max(...settled.map((p) => Math.abs(p.rtp - data.target)), halfWidth(settledFrom)) * 1.15
  const yMin = data.target - yExtent
  const yMax = data.target + yExtent
  const yStep = niceStep(yMax - yMin, 4)
  const yTicks: number[] = []
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(Math.round(v * 100) / 100)

  const xStep = niceStep(totalRounds, 4)
  const xTicks: number[] = []
  for (let v = 0; v <= totalRounds; v += xStep) xTicks.push(v)

  const plotW = size.width - MARGIN.left - MARGIN.right
  const plotH = size.height - MARGIN.top - MARGIN.bottom
  const xFor = (n: number) => MARGIN.left + (n / totalRounds) * plotW
  const yFor = (v: number) => MARGIN.top + ((yMax - Math.min(Math.max(v, yMin), yMax)) / (yMax - yMin)) * plotH

  const funnelTop = points.map((p) => `${xFor(p.rounds)},${yFor(data.target + halfWidth(p.rounds))}`)
  const funnelBottom = points.map((p) => `${xFor(p.rounds)},${yFor(data.target - halfWidth(p.rounds))}`).reverse()
  const funnelPath = `M ${funnelTop.join(' L ')} L ${funnelBottom.join(' L ')} Z`
  const linePoints = points.map((p) => `${xFor(p.rounds)},${yFor(p.rtp)}`).join(' ')
  const windowX = data.correctionWindow <= totalRounds ? xFor(data.correctionWindow) : null

  const nf = new Intl.NumberFormat(i18n.language)
  const hp = hovered !== null ? points[hovered] : null

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rounds = ((e.clientX - rect.left) / rect.width) * totalRounds
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].rounds - rounds) < Math.abs(points[best].rounds - rounds)) best = i
    setHovered(best)
  }

  return (
    <section className="admin-panel admin-rtp-stability">
      <div className="admin-panel-header admin-rtp-stability-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.rtp.stability.title')}</h2>
          <p className="admin-rtp-stability-subtitle">{t('admin.rtp.stability.subtitle')}</p>
        </div>
        <div className="admin-rtp-stability-games" role="group">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className="admin-rtp-stability-game"
              data-selected={g.id === game}
              aria-pressed={g.id === game}
              onClick={() => {
                setGame(g.id)
                setHovered(null)
              }}
            >
              {t(g.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-rtp-stability-status" data-within={withinRange}>
        <span className="admin-rtp-stability-status-badge">
          {withinRange ? t('admin.rtp.stability.status.within') : t('admin.rtp.stability.status.outside')}
        </span>
        <span className="admin-rtp-stability-status-text">
          {withinRange ? t('admin.rtp.stability.status.withinDetail') : t('admin.rtp.stability.status.outsideDetail')}
        </span>
      </div>

      <div className="admin-rtp-stability-plot" ref={plotRef} onMouseLeave={() => setHovered(null)}>
        <svg className="admin-rtp-stability-svg" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={t('admin.rtp.stability.title')}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={MARGIN.left} x2={size.width - MARGIN.right} y1={yFor(v)} y2={yFor(v)} className="admin-rtp-stability-gridline" />
              <text x={MARGIN.left - 8} y={yFor(v)} className="admin-rtp-stability-axis-label" textAnchor="end" dominantBaseline="middle">
                {Number.isInteger(v) ? v : v.toFixed(1)}%
              </text>
            </g>
          ))}
          {xTicks.map((v, i) => (
            <text key={v} x={xFor(v)} y={size.height - 7} className="admin-rtp-stability-axis-label" textAnchor={i === 0 ? 'start' : v >= totalRounds ? 'end' : 'middle'}>
              {compactRounds(v)}
            </text>
          ))}

          <path d={funnelPath} className="admin-rtp-stability-funnel" />
          <line x1={MARGIN.left} x2={size.width - MARGIN.right} y1={yFor(data.target)} y2={yFor(data.target)} className="admin-rtp-stability-target" />

          {windowX !== null && (
            <g>
              <line x1={windowX} x2={windowX} y1={MARGIN.top} y2={MARGIN.top + plotH} className="admin-rtp-stability-window" />
              <text x={windowX + 5} y={MARGIN.top + 11} className="admin-rtp-stability-window-label">
                {t('admin.rtp.stability.correctionWindow')}
              </text>
            </g>
          )}

          <polyline points={linePoints} fill="none" stroke={gameDef.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={xFor(latest.rounds)} cy={yFor(latest.rtp)} r={4.5} fill={gameDef.color} className="admin-rtp-stability-dot" />

          {hp && (
            <g>
              <line x1={xFor(hp.rounds)} x2={xFor(hp.rounds)} y1={MARGIN.top} y2={MARGIN.top + plotH} className="admin-rtp-stability-crosshair" />
              <circle cx={xFor(hp.rounds)} cy={yFor(hp.rtp)} r={4.5} fill={gameDef.color} className="admin-rtp-stability-dot" />
            </g>
          )}

          <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill="transparent" onMouseMove={handleMove} />
        </svg>

        {hp && (
          <div
            className="admin-rtp-stability-tooltip"
            data-align={xFor(hp.rounds) / size.width > 0.6 ? 'right' : 'left'}
            style={{ left: xFor(hp.rounds) }}
          >
            <div className="admin-rtp-stability-tooltip-title">{t('admin.rtp.stability.tooltip.after', { rounds: nf.format(hp.rounds) })}</div>
            <div className="admin-rtp-stability-tooltip-row">
              <span>{t('admin.rtp.stability.tooltip.rtp')}</span>
              <strong>{hp.rtp.toFixed(2)}%</strong>
            </div>
            <div className="admin-rtp-stability-tooltip-row">
              <span>{t('admin.rtp.stability.tooltip.expected')}</span>
              <strong>
                {(data.target - halfWidth(hp.rounds)).toFixed(1)}–{(data.target + halfWidth(hp.rounds)).toFixed(1)}%
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="admin-rtp-stability-legend">
        <span className="admin-rtp-stability-legend-item">
          <span className="admin-rtp-stability-legend-line" style={{ background: gameDef.color }} />
          {t('admin.rtp.stability.legend.cumulative')}
        </span>
        <span className="admin-rtp-stability-legend-item">
          <span className="admin-rtp-stability-legend-funnel" />
          {t('admin.rtp.stability.legend.expected')}
        </span>
        <span className="admin-rtp-stability-legend-item">
          <span className="admin-rtp-stability-legend-target" />
          {t('admin.rtp.stability.legend.target', { value: data.target })}
        </span>
      </div>
    </section>
  )
}
