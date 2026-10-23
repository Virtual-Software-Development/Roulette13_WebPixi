import { create } from 'zustand'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import type { QuickMoneyPaytableRow } from '../api/roundHistory'

// Tablas del panel derecho del lobby compartido (QuickMoneySplitOverlay): las dos mitades de
// Winning Numbers (sorteos de hoy / de ayer) y Fast Payments. Las carga y recarga
// sync/quickMoneyResultTables.ts.
//
// status: 'loading' hasta la primera respuesta; 'error' si la última carga falló (se reintenta);
// 'ready' si respondió, aunque sea sin datos. dayKey = el día (YYYY-MM-DD, hora de Santo Domingo)
// para el que se cargaron los sorteos -- una falla solo conserva los datos si siguen siendo del día.
export type ResultTableStatus = 'loading' | 'ready' | 'error'

export interface DrawsTable {
  status: ResultTableStatus
  dayKey: string | null
  draws: QuickMoneyLobbyDraw[]
}

export interface PaytableTable {
  status: ResultTableStatus
  rows: QuickMoneyPaytableRow[]
}

interface QuickMoneyResultTablesState {
  today: DrawsTable
  yesterday: DrawsTable
  paytable: PaytableTable
}

export const useQuickMoneyResultTablesStore = create<QuickMoneyResultTablesState>(() => ({
  today: { status: 'loading', dayKey: null, draws: [] },
  yesterday: { status: 'loading', dayKey: null, draws: [] },
  paytable: { status: 'loading', rows: [] },
}))
