import { env } from '../config/env'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useCreditStore, type CreditMode, type InsertedCreditTicket, type MachineNotice } from '../store/useCreditStore'
import { useMqttStore } from '../store/useMqttStore'
import { machineBalanceTopic, onMqttMessage } from '../mqtt/topics'
import { errorMessage } from './terminalTicket'
import { onConnectionRestored } from '../hooks/useConnectionIssue'

// Balance of this PC's machine (GET /api/machine/balance, X-Terminal-Token): the credit the cashier
// loads through the external cashier app (quick-money-backend /cashier, see its README). Every
// ticket placed here is paid from it on the backend, so the store's balance is only a copy: the
// backend pushes it over MQTT whenever it changes (a deposit or withdrawal at the cashier, a ticket,
// a prize on the credit ticket...), and it is also re-read after each action here, on focus and,
// as a safety net for a lost connection, every minute. In TICKET credit mode (General Settings) the
// balance is the credit of the ticket inserted in this machine (0 with none), and the player
// inserts and cashes out that ticket here (insertCreditTicket / cashOutCreditTicket).

// Only a safety net: the changes arrive over MQTT.
const POLL_MS = 60_000

interface MachineBalanceResponse {
  // The machine (machine.id); missing on older backends.
  machineId?: number
  balance: number
  // Missing on backends older than the credit modes: MACHINE.
  creditMode?: CreditMode
  creditTicket?: InsertedCreditTicket | null
  notices?: MachineNotice[]
}

// The machine GET /api/machine/balance answers for (this PC's terminal token): a push for any other
// machine is ignored.
let tokenMachineId: number | null = null

function applyCredit(body: MachineBalanceResponse): void {
  useGameConfigStore.getState().setGameConfig({ balance: body.balance })
  useCreditStore.getState().setCredit(body.creditMode ?? 'MACHINE', body.creditTicket ?? null, body.notices ?? [])
}

export async function refreshMachineBalance(): Promise<void> {
  if (!env.terminalToken) return
  try {
    const res = await fetch('/api/machine/balance', { headers: { 'X-Terminal-Token': env.terminalToken } })
    if (!res.ok) throw new Error(await errorMessage(res))
    const body: MachineBalanceResponse = await res.json()
    if (typeof body.machineId === 'number') tokenMachineId = body.machineId
    applyCredit(body)
  } catch (err) {
    // The last known balance stays; the next push or poll updates it.
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
  // Back online: a deposit, withdrawal or prize may have changed it during the outage. The retained
  // push usually brings it too, but it does not when only the backend was down (MQTT stayed up).
  onConnectionRestored('terminal', () => void refreshMachineBalance())
  listenForBalancePushes()
}

// The backend's pushes (retained: the current balance arrives as soon as it subscribes). The topic
// needs the machine id, which comes with the MQTT credentials.
function listenForBalancePushes(): void {
  let unsubscribe: (() => void) | null = null
  let topicMachineId: number | null = null
  const follow = (machineId: number | null) => {
    if (machineId === topicMachineId) return
    unsubscribe?.()
    unsubscribe = null
    topicMachineId = machineId
    if (machineId == null) return
    unsubscribe = onMqttMessage(machineBalanceTopic(machineId), applyPushedCredit)
  }
  follow(useMqttStore.getState().machineId)
  useMqttStore.subscribe((state) => follow(state.machineId))
}

// A balance pushed over MQTT: the same body as GET /api/machine/balance.
export function applyPushedCredit(message: unknown): void {
  if (!message || typeof message !== 'object' || typeof (message as MachineBalanceResponse).balance !== 'number') {
    console.warn('[balance] ignored a malformed balance push')
    return
  }
  const body = message as MachineBalanceResponse
  if (tokenMachineId != null && body.machineId !== tokenMachineId) {
    console.warn(`[balance] ignored a push for machine ${body.machineId}: this PC's token is machine ${tokenMachineId}`)
    return
  }
  applyCredit(body)
}

// TICKET credit mode: inserts the credit ticket with code (typed or scanned) in this machine. Throws
// with the backend's message if it is refused (unknown code, expired, in another machine...).
export async function insertCreditTicket(code: string): Promise<void> {
  if (!env.terminalToken) throw new Error('VITE_TERMINAL_TOKEN is not set: this PC is not a machine')
  const res = await fetch('/api/machine/credit-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Terminal-Token': env.terminalToken },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  await refreshMachineBalance()
}

// TICKET credit mode: takes the inserted credit ticket out of this machine. Its credit stays on it:
// the player keeps playing elsewhere or collects it at the cashier.
export async function cashOutCreditTicket(): Promise<void> {
  if (!env.terminalToken) throw new Error('VITE_TERMINAL_TOKEN is not set: this PC is not a machine')
  const res = await fetch('/api/machine/credit-ticket', { method: 'DELETE', headers: { 'X-Terminal-Token': env.terminalToken } })
  if (!res.ok) throw new Error(await errorMessage(res))
  await refreshMachineBalance()
}

// The player read a notice (the credit mode changed): it isn't shown again on this machine.
export async function acknowledgeMachineNotice(id: number): Promise<void> {
  if (!env.terminalToken) return
  const res = await fetch(`/api/machine/notices/${id}/ack`, { method: 'POST', headers: { 'X-Terminal-Token': env.terminalToken } })
  if (!res.ok && res.status !== 404) throw new Error(await errorMessage(res))
  await refreshMachineBalance()
}
