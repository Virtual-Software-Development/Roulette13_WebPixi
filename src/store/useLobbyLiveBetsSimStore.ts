import { create } from 'zustand'
import type { LobbyBetCell, LobbyGroupBets, LobbyGroupKey, LobbyNumberBets } from '../types/lobbyLiveBets'

export const LOBBY_NUMBER_KEYS: string[] = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]

export const LOBBY_GROUP_KEYS: LobbyGroupKey[] = [
  'firstDozen',
  'secondDozen',
  'thirdDozen',
  'firstColumn',
  'secondColumn',
  'thirdColumn',
  'low',
  'high',
  'even',
  'odd',
  'red',
  'black',
]

function emptyCell(): LobbyBetCell {
  return { total: 0 }
}

function initNumbers(): LobbyNumberBets {
  const map: LobbyNumberBets = {}
  for (const key of LOBBY_NUMBER_KEYS) map[key] = emptyCell()
  return map
}

function initGroups(): LobbyGroupBets {
  const map = {} as LobbyGroupBets
  for (const key of LOBBY_GROUP_KEYS) map[key] = emptyCell()
  return map
}

interface LobbyLiveBetsSimState {
  numbers: LobbyNumberBets
  groups: LobbyGroupBets
  registerNumberBet: (pocketKey: string, amount: number) => void
  registerGroupBet: (key: LobbyGroupKey, amount: number) => void
  // Vuelve todos los totales a 0 -- se llama al ocultarse el panel (ver useLobbyBetsSimulation),
  // para que la próxima vez que aparezca en el lobby arranque limpio en vez de retomar los montos
  // de la ronda anterior.
  reset: () => void
}

// El feedback visual de "acá entró una apuesta" ya no es un highlight sostenido -- es un pulso de
// escala en el panel, disparado por el propio cambio de `total` (ver usePulseScale). Este store solo
// necesita acumular montos, sin bandera ni timeout de highlight.
//
// IMPORTANTE -- registerNumberBet/registerGroupBet actualizan `numbers`/`groups` de a UNA clave por
// vez (spread + reemplazo solo del pocket/grupo afectado), preservando la referencia de todas las
// demás celdas. Las celdas de LobbyLiveBetsPanel.tsx (NumberCell/GroupCell/ZeroColumn) están
// envueltas en React.memo confiando en esto: como cada una recibe su `total` ya resuelto a
// primitivo, ese valor no cambia para ninguna celda salvo la que recibió la apuesta, así que memo
// frena el re-render del resto del panel en cada evento. El día que esto se reemplace por un feed
// real de MQTT, hay que seguir llamando a estas mismas funciones por evento -- si en cambio el
// handler de MQTT reemplaza `numbers`/`groups` completos con un snapshot en cada mensaje, esa
// garantía se pierde y el memo deja de frenar nada (sin error visible, vuelve el re-render en
// cascada de todo el panel).
export const useLobbyLiveBetsSimStore = create<LobbyLiveBetsSimState>((set) => ({
  numbers: initNumbers(),
  groups: initGroups(),
  registerNumberBet: (pocketKey, amount) => {
    set((state) => ({
      numbers: { ...state.numbers, [pocketKey]: { total: state.numbers[pocketKey].total + amount } },
    }))
  },
  registerGroupBet: (key, amount) => {
    set((state) => ({
      groups: { ...state.groups, [key]: { total: state.groups[key].total + amount } },
    }))
  },
  reset: () => set({ numbers: initNumbers(), groups: initGroups() }),
}))
