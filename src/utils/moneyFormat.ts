// Formato de dinero para paneles de apuestas ($1,540) -- distinto del que ya usa Header.tsx
// (balance.toLocaleString con 2 decimales, sin símbolo $): acá no hay decimales y siempre lleva
// el prefijo "$". No existía un formatter compartido para este formato antes de este archivo.
export function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '$0'
  return `$${Math.round(value).toLocaleString('en-US')}`
}

// Formato compacto para los tableros (pedido explícito): $950, $1.5K, $50K, $125K, $1.2M -- las
// celdas de apuestas en vivo (LobbyLiveBetsPanel, LiveTableBetsPanel, LeftStatsSidebar) y la ficha
// de cada zona del tablero de apuestas (BetZoneButton) son chicas y un $1,250,000 no entra. Donde el
// monto tiene que ser exacto (bet slip, ticket, totales, saldo) se sigue usando formatMoney.
const COMPACT_FORMATTER = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatCompactMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '$0'
  return `$${COMPACT_FORMATTER.format(Math.round(value))}`
}
