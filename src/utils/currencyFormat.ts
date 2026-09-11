const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Distinto de formatMoney (utils/moneyFormat.ts): ese redondea a dólares enteros para las celdas
// chicas de LiveTableBetsPanel, este mantiene siempre 2 decimales + símbolo -- pensado para el
// valor grande y focal de TOTAL POT (ResultStatsPanel). Reemplazar por moneda real del proyecto
// (si aparece una) es cuestión de cambiar `currency` acá, sin tocar el componente.
export function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return CURRENCY_FORMATTER.format(0)
  return CURRENCY_FORMATTER.format(value)
}
