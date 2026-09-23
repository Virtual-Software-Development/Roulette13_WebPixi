import type { QuickMoneyGameType } from '../../types/quickMoneyBet'

// UI-only -- no vive en types/quickMoneyBet.ts (ese es dominio: una apuesta real SIEMPRE es
// pick3 o pick4, nunca "both"). 'both' es puramente la pestaña activa en GameTypeTabs, controla
// qué grupo(s) de dígitos muestra DigitEntryCard.
export type QuickMoneyTabValue = QuickMoneyGameType | 'both'

// Qué campo tiene el foco para recibir los toques de SharedNumberPad -- un casillero de dígito
// (identificado por gameType + índice) o el campo de monto. null = nada seleccionado todavía.
export type QuickMoneyActiveField = { kind: 'digit'; gameType: QuickMoneyGameType; index: number } | { kind: 'amount' } | null
