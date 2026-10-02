import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './peakHoursHeatmap.css'

// Heatmap día de semana × hora del total apostado -- muestra CUÁNDO se juega (ningún otro chart lo
// muestra) y sirve para elegir días/horas de RTP Scheduling ("Restrict to specific hours"),
// mantenimiento o promociones. Escala secuencial de un solo tono (azul, ramp de dataviz) con el
// ancla invertida para fondo oscuro: poco = oscuro (cerca del surface), mucho = claro.
const RAMP = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6', '#cde2fb']

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const HOUR_LABEL_EVERY = 3

function colorFor(value: number, min: number, max: number): string {
  const t = max > min ? (value - min) / (max - min) : 0
  return RAMP[Math.round(t * (RAMP.length - 1))]
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compactUsd = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`)
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

interface PeakHoursHeatmapProps {
  // values[día 0=Lunes..6=Domingo][hora 0..23] = total apostado en esa franja durante el período.
  values: number[][]
  averageBet: number
  periodLabel: string
}

export function PeakHoursHeatmap({ values, averageBet, periodLabel }: PeakHoursHeatmapProps) {
  const { t, i18n } = useTranslation()
  const [hovered, setHovered] = useState<{ day: number; hour: number } | null>(null)

  // Nombres cortos de los días en el idioma activo (2026-09-28 es lunes).
  const dayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', timeZone: 'UTC' })
  const dayNames = Array.from({ length: 7 }, (_, d) => dayFormatter.format(new Date(Date.UTC(2026, 8, 28 + d))))

  const flat = values.flatMap((row, day) => row.map((value, hour) => ({ day, hour, value })))
  const min = Math.min(...flat.map((c) => c.value))
  const max = Math.max(...flat.map((c) => c.value))
  const peak = flat.reduce((a, b) => (b.value > a.value ? b : a), flat[0])
  const quietest = flat.reduce((a, b) => (b.value < a.value ? b : a), flat[0])

  const cellText = (c: { day: number; hour: number; value: number }) =>
    t('admin.reports.peakHours.cell', {
      day: dayNames[c.day],
      from: hourLabel(c.hour),
      to: `${String(c.hour).padStart(2, '0')}:59`,
      amount: USD.format(c.value),
      rounds: Math.round(c.value / averageBet).toLocaleString(i18n.language),
    })

  const hoveredCell = hovered ? { ...hovered, value: values[hovered.day][hovered.hour] } : null

  return (
    <section className="admin-panel admin-peak-hours">
      <div className="admin-panel-header admin-peak-hours-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.reports.peakHours.title')}</h2>
          <p className="admin-peak-hours-subtitle">{t('admin.reports.peakHours.subtitle', { period: periodLabel })}</p>
        </div>
        <div className="admin-peak-hours-scale" aria-hidden="true">
          <span>{t('admin.reports.peakHours.less')}</span>
          <span className="admin-peak-hours-scale-bar" style={{ background: `linear-gradient(90deg, ${RAMP.join(', ')})` }} />
          <span>{t('admin.reports.peakHours.more')}</span>
        </div>
      </div>

      <div className="admin-peak-hours-grid" role="grid" aria-label={t('admin.reports.peakHours.title')} onMouseLeave={() => setHovered(null)}>
        <span aria-hidden="true" />
        {HOURS.map((h) => (
          <span key={h} className="admin-peak-hours-hour" aria-hidden="true">
            {h % HOUR_LABEL_EVERY === 0 ? String(h).padStart(2, '0') : ''}
          </span>
        ))}

        {values.map((row, day) => (
          <div key={day} className="admin-peak-hours-row" role="row">
            <span className="admin-peak-hours-day" role="rowheader">
              {dayNames[day]}
            </span>
            {row.map((value, hour) => {
              const isPeak = day === peak.day && hour === peak.hour
              return (
                <span
                  key={hour}
                  role="gridcell"
                  className="admin-peak-hours-cell"
                  data-peak={isPeak || undefined}
                  data-dimmed={hovered !== null && !(hovered.day === day && hovered.hour === hour) || undefined}
                  style={{ background: colorFor(value, min, max) }}
                  aria-label={cellText({ day, hour, value })}
                  onMouseEnter={() => setHovered({ day, hour })}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Pie fijo: muestra la franja bajo el mouse, o el pico/valle del período si no hay hover. */}
      <div className="admin-peak-hours-footer" aria-live="polite">
        {hoveredCell ? (
          <span className="admin-peak-hours-detail">{cellText(hoveredCell)}</span>
        ) : (
          <>
            <span className="admin-peak-hours-summary">
              <span className="admin-peak-hours-summary-label">{t('admin.reports.peakHours.busiest')}</span>
              {dayNames[peak.day]} {hourLabel(peak.hour)} · {compactUsd(peak.value)}
            </span>
            <span className="admin-peak-hours-summary">
              <span className="admin-peak-hours-summary-label">{t('admin.reports.peakHours.quietest')}</span>
              {dayNames[quietest.day]} {hourLabel(quietest.hour)} · {compactUsd(quietest.value)}
            </span>
          </>
        )}
      </div>
    </section>
  )
}
