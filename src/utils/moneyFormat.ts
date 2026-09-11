// Formato de dinero para paneles de apuestas ($1,540) -- distinto del que ya usa Header.tsx
// (balance.toLocaleString con 2 decimales, sin símbolo $): acá no hay decimales y siempre lleva
// el prefijo "$". No existía un formatter compartido para este formato antes de este archivo.
export function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '$0'
  return `$${Math.round(value).toLocaleString('en-US')}`
}
