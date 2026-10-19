import { env } from '../config/env'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { errorMessage } from './terminalTicket'

// Balance of this PC's machine (GET /api/machine/balance, X-Terminal-Token): the credit the cashier
// loads through the external cashier app (quick-money-backend /cashier, see its README). Every
// ticket placed here is paid from it on the backend, so the store's balance is only a copy: it is
// re-read every few seconds (a deposit or withdrawal at the cashier shows up on its own) and right
// after each ticket.

const POLL_MS = 3_000

interface MachineBalanceResponse {
  balance: number
}

export async function refreshMachineBalance(): Promise<void> {
  if (!env.terminalToken) return
  try {
    const res = await fetch('/api/machine/balance', { headers: { 'X-Terminal-Token': env.terminalToken } })
    if (!res.ok) throw new Error(await errorMessage(res))
    const body: MachineBalanceResponse = await res.json()
    useGameConfigStore.getState().setGameConfig({ balance: body.balance })
  } catch (err) {
    // The last known balance stays; the next poll tries again.
    console.warn('[balance] could not read the machine balance:', err instanceof Error ? err.message : err)
  }
}

let started = false

// Started once by main.tsx on the game and betting servers (the Admin is not a machine).
export function startMachineBalanceSync(): void {
  if (started) return
  started = true
  if (!env.terminalToken) {
    console.warn('[balance] VITE_TERMINAL_TOKEN is not set: this PC has no machine balance (it stays at 0)')
    return
  }
  void refreshMachineBalance()
  window.setInterval(() => void refreshMachineBalance(), POLL_MS)
  window.addEventListener('focus', () => void refreshMachineBalance())
}
