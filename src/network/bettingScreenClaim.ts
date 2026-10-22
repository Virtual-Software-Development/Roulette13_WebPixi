import { useEffect, useRef, useState } from 'react'

// Only one betting screen (roulette or Quick Money, player or cashier) can place tickets on this
// machine at a time: two windows betting at once would charge the same balance twice in parallel.
// Every betting screen is on the betting server (one origin), so the windows agree over a
// BroadcastChannel -- unlike navigator.locks, it also works when a terminal loads the screens over
// plain http from a LAN address. The newest screen wins: it announces its claim and any older one
// yields (and shows "Use here" to take it back). Two screens opening at the same instant settle on
// the newer claim, compared by time and then id.

const CHANNEL_NAME = 'qm-betting-screen'

export interface Claim {
  at: number
  id: string
}

interface ClaimMessage extends Claim {
  type: 'claim'
}

// The part of BroadcastChannel this uses (a fake in the tests).
export interface ChannelLike {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent) => void) | null
  close(): void
}

export function isNewer(a: Claim, b: Claim): boolean {
  return a.at > b.at || (a.at === b.at && a.id > b.id)
}

function isClaimMessage(data: unknown): data is ClaimMessage {
  if (!data || typeof data !== 'object') return false
  const m = data as Partial<ClaimMessage>
  return m.type === 'claim' && typeof m.at === 'number' && typeof m.id === 'string'
}

let idCounter = 0
function newClaim(now: number): Claim {
  idCounter += 1
  return { at: now, id: `${Math.random().toString(36).slice(2)}-${idCounter}` }
}

// Claims the betting screen on channel and reports, through onChange, whether this window holds it.
export function createBettingScreenClaim(channel: ChannelLike, onChange: (active: boolean) => void, now: () => number = Date.now) {
  let mine = newClaim(now())
  let active = true
  // The newest claim seen from another window: "Use here" must beat it even if this clock is behind.
  let latestSeen = 0

  const announce = () => channel.postMessage({ type: 'claim', ...mine } satisfies ClaimMessage)

  channel.onmessage = (event) => {
    if (!isClaimMessage(event.data)) return
    latestSeen = Math.max(latestSeen, event.data.at)
    if (isNewer(event.data, mine)) {
      if (active) {
        active = false
        onChange(false)
      }
    } else if (active) {
      // An older screen claiming (it just opened with a slower start, or "Use here" raced): this one
      // keeps it, and says so again so the other one yields.
      announce()
    }
  }
  announce()

  return {
    // "Use here": this window takes the betting screen back from the one that has it.
    takeOver() {
      mine = newClaim(Math.max(now(), mine.at + 1, latestSeen + 1))
      active = true
      onChange(true)
      announce()
    },
    release() {
      channel.onmessage = null
      channel.close()
    },
  }
}

// For the betting screens (see SingleBettingScreen): whether this window holds the betting screen,
// and how to take it back. Without BroadcastChannel it always holds it.
export function useBettingScreenClaim(): { active: boolean; takeOver: () => void } {
  const [active, setActive] = useState(true)
  const claimRef = useRef<ReturnType<typeof createBettingScreenClaim> | null>(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const claim = createBettingScreenClaim(new BroadcastChannel(CHANNEL_NAME), setActive)
    claimRef.current = claim
    return () => {
      claimRef.current = null
      claim.release()
    }
  }, [])

  return { active, takeOver: () => claimRef.current?.takeOver() }
}
