import type { SimulationType } from '../types/rtpManagement'

// Lo único de RTP Management que no viene del backend: los tipos de simulación que ofrece el
// Simulator (que corre en el backend, ver api/rtpSimulator.ts). Settings y Scheduling leen/escriben
// quick-money-backend (api/rtpManagement.ts).
export const SIMULATION_TYPE_OPTIONS: SimulationType[] = ['projectedResults']
