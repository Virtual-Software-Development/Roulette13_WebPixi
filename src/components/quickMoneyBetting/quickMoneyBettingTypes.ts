// Qué campo tiene el foco para recibir los toques de SharedNumberPad -- uno de los 4 casilleros de
// dígito (por índice) o el campo de monto. null = nada seleccionado todavía.
export type QuickMoneyActiveField = { kind: 'digit'; index: number } | { kind: 'amount' } | null
