import { create } from 'zustand'

// Where this machine's credit lives (General Settings → Credit Mode, read from GET
// /api/machine/balance, see api/machineBalance.ts): 'MACHINE' (the default, the machine's balance)
// or 'TICKET' (a credit ticket the player inserts here by entering its code). The amount itself is
// useGameConfigStore.balance either way.
export type CreditMode = 'MACHINE' | 'TICKET'

export interface InsertedCreditTicket {
  // Only the last 6 characters; the full code is the player's money and is never shown here.
  maskedCode: string
  balance: number
  expiresAt: string
}

// A message for the player this machine shows until they acknowledge it (MachineNoticeDialog): the
// admin changed the credit mode and this machine's balance was withdrawn, or its credit ticket was
// returned.
export interface MachineNotice {
  id: number
  kind: 'CREDIT_MODE_WITHDRAWAL' | 'CREDIT_MODE_TICKET_RETURNED'
  creditMode: CreditMode
  amount: number
  creditTicket?: string
}

interface CreditState {
  creditMode: CreditMode
  creditTicket: InsertedCreditTicket | null
  notices: MachineNotice[]
  setCredit: (creditMode: CreditMode, creditTicket: InsertedCreditTicket | null, notices: MachineNotice[]) => void
}

export const useCreditStore = create<CreditState>((set) => ({
  creditMode: 'MACHINE',
  creditTicket: null,
  notices: [],
  setCredit: (creditMode, creditTicket, notices) => set({ creditMode, creditTicket, notices }),
}))
