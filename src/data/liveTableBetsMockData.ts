import type { LiveTableBetsData } from '../types/liveTableBets'

// Mock TEMPORAL para comparar LiveTableBetsPanel contra la referencia visual mientras no exista
// una fuente real de datos de apuestas. Highlights apagados a propósito (ningún pocket lleva
// `highlighted: true` por ahora) hasta tener los valores reales a marcar -- 0/7/14/27 sí llevan
// showChipStack para conservar el acento visual de la referencia. El panel no sabe que estos
// números existen, cualquier pocket puede llegar con highlighted/showChipStack en true o false
// (ver LiveTableBetsPanel.tsx: nunca compara pockets ni montos entre sí). Cambiar este archivo por
// completo (otros números, otros montos, cualquiera highlighted) no requiere tocar el componente.
export const LIVE_TABLE_BETS_MOCK_DATA: LiveTableBetsData = {
  numbers: [
    { pocket: '00', total: 0 },
    { pocket: 0, total: 0},
    { pocket: 1, total: 540 },
    { pocket: 2, total: 330 },
    { pocket: 3, total: 760 },
    { pocket: 4, total: 350 },
    { pocket: 5, total: 780 },
    { pocket: 6, total: 420 },
    { pocket: 7, total: 1310 },
    { pocket: 8, total: 410 },
    { pocket: 9, total: 640 },
    { pocket: 10, total: 480 },
    { pocket: 11, total: 290 },
    { pocket: 12, total: 1120 },
    { pocket: 13, total: 280 },
    { pocket: 14, total: 1540},
    { pocket: 15, total: 380 },
    { pocket: 16, total: 620 },
    { pocket: 17, total: 530 },
    { pocket: 18, total: 820 },
    { pocket: 19, total: 710 },
    { pocket: 20, total: 310 },
    { pocket: 21, total: 950 },
    { pocket: 22, total: 260 },
    { pocket: 23, total: 890 },
    { pocket: 24, total: 310 },
    { pocket: 25, total: 830 },
    { pocket: 26, total: 470 },
    { pocket: 27, total: 1980},
    { pocket: 28, total: 430 },
    { pocket: 29, total: 390 },
    { pocket: 30, total: 700 },
    { pocket: 31, total: 320 },
    { pocket: 32, total: 670 },
    { pocket: 33, total: 460 },
    { pocket: 34, total: 550 },
    { pocket: 35, total: 380 },
    { pocket: 36, total: 690 },
  ],
  dozens: {
    firstDozen: 5240,
    secondDozen: 4980,
    thirdDozen: 4710,
  },
  columns: {
    firstColumn: 3120,
    secondColumn: 2980,
    thirdColumn: 3350,
  },
  outside: {
    low: 6150,
    even: 4380,
    red: 500,
    black: 370,
    odd: 4210,
    high: 6040,
  },
}
