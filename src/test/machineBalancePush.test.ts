import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/env', () => ({ env: { terminalToken: 'test-token' } }))

import { applyPushedCredit, refreshMachineBalance } from '../api/machineBalance'
import { useCreditStore } from '../store/useCreditStore'
import { useGameConfigStore } from '../store/useGameConfigStore'

describe('machine balance pushed over MQTT', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('applies a push for the machine of this PC and ignores one for another machine', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ machineId: 5, balance: 10, creditMode: 'MACHINE', notices: [] }))))
    await refreshMachineBalance()
    expect(useGameConfigStore.getState().balance).toBe(10)

    applyPushedCredit({ machineId: 5, balance: 7.5, creditMode: 'TICKET', creditTicket: null, notices: [] })
    expect(useGameConfigStore.getState().balance).toBe(7.5)
    expect(useCreditStore.getState().creditMode).toBe('TICKET')

    vi.spyOn(console, 'warn').mockImplementation(() => {})
    applyPushedCredit({ machineId: 6, balance: 999, creditMode: 'MACHINE', notices: [] })
    applyPushedCredit({ machineId: 5 })
    applyPushedCredit('nope')
    expect(useGameConfigStore.getState().balance).toBe(7.5)
  })
})
