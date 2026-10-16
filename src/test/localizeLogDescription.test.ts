import { afterAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { localizeLogDescription } from '../utils/localizeLogDescription'

// Formatos que escribe el backend (español) -> idioma del panel.
const SAMPLES: [string, string, string][] = [
  ['Lectura del resultado pendiente desde ::1', 'Pending result read from ::1', 'Lectura del resultado pendiente desde ::1'],
  ['Ronda de ruleta creada', 'Roulette round created', 'Ronda de ruleta creada'],
  ['Ronda de ruleta ejecutada: 00', 'Roulette round drawn: 00', 'Ronda de ruleta ejecutada: 00'],
  ['Sorteo de Quick Money creado', 'Quick Money draw created', 'Sorteo de Quick Money creado'],
  [
    'Sorteo de Quick Money ejecutado: Pick 3 472, Pick 4 1905',
    'Quick Money draw drawn: Pick 3 472, Pick 4 1905',
    'Sorteo de Quick Money ejecutado: Pick 3 472, Pick 4 1905',
  ],
  ['Sorteo de lotería creado (Pick 3 y Pick 4)', 'Lottery draw created (Pick 3 and Pick 4)', 'Sorteo de lotería creado (Pick 3 y Pick 4)'],
  [
    'Resultado decidido por el motor exposure (apostado en la ronda: 33.00)',
    'Result decided by the exposure engine (amount bet in the round: 33.00)',
    'Resultado decidido por el motor exposure (apostado en la ronda: 33.00)',
  ],
  [
    'Sustitución manual del resultado: Cambio manual desde Next Results',
    'Manual result change: Manual change from Next Results',
    'Sustitución manual del resultado: Cambio manual desde Next Results',
  ],
  // El motivo escrito por una persona queda tal cual.
  ['Sustitución manual del resultado: prueba e2e', 'Manual result change: prueba e2e', 'Sustitución manual del resultado: prueba e2e'],
  ['RTP de lottery actualizado', 'Quick Money RTP updated', 'RTP de Quick Money actualizado'],
  ['Perfil de RTP "Noche": disabled', 'RTP profile "Noche": disabled', 'Perfil de RTP "Noche": deshabilitado'],
  ['Usuario zz_test_user creado (cashier)', 'User zz_test_user created (Cashier)', 'Usuario zz_test_user creado (Cajero)'],
  [
    'Usuario zz_test_user actualizado: nombre "A" → "B"; rol cashier → admin; contraseña restablecida',
    'User zz_test_user updated: name "A" → "B"; role Cashier → Admin; password reset',
    'Usuario zz_test_user actualizado: nombre "A" → "B"; rol Cajero → Admin; contraseña restablecida',
  ],
  ['Usuario zz_test_user desactivado', 'User zz_test_user deactivated', 'Usuario zz_test_user desactivado'],
  ['Inicio de sesión de devadmin', 'devadmin signed in', 'Inicio de sesión de devadmin'],
  ['Texto que no conoce el panel', 'Texto que no conoce el panel', 'Texto que no conoce el panel'],
  // Formato actual del backend (inglés).
  ['Pending result read from ::1', 'Pending result read from ::1', 'Lectura del resultado pendiente desde ::1'],
  ['Roulette round drawn: 17', 'Roulette round drawn: 17', 'Ronda de ruleta ejecutada: 17'],
  [
    'Quick Money draw drawn: Pick 3 472, Pick 4 1905',
    'Quick Money draw drawn: Pick 3 472, Pick 4 1905',
    'Sorteo de Quick Money ejecutado: Pick 3 472, Pick 4 1905',
  ],
  [
    'Result decided by the exposure engine (amount bet in the round: 33.00)',
    'Result decided by the exposure engine (amount bet in the round: 33.00)',
    'Resultado decidido por el motor exposure (apostado en la ronda: 33.00)',
  ],
  [
    'Manual result change: Manual change from Next Results',
    'Manual result change: Manual change from Next Results',
    'Sustitución manual del resultado: Cambio manual desde Next Results',
  ],
  ['roulette RTP updated', 'Roulette RTP updated', 'RTP de Ruleta actualizado'],
  ['RTP profile "Night": enabled', 'RTP profile "Night": enabled', 'Perfil de RTP "Night": habilitado'],
  ['User zz created (admin)', 'User zz created (Admin)', 'Usuario zz creado (Admin)'],
  [
    'User zz updated: username zz → zz2; role admin → cashier; reactivated',
    'User zz updated: username zz → zz2; role Admin → Cashier; reactivated',
    'Usuario zz actualizado: usuario zz → zz2; rol Admin → Cajero; reactivado',
  ],
  ['User zz deactivated', 'User zz deactivated', 'Usuario zz desactivado'],
  ['User zz created (cashier), inactive', 'User zz created (Cashier), inactive', 'Usuario zz creado (Cajero), inactivo'],
  ['devadmin signed in', 'devadmin signed in', 'Inicio de sesión de devadmin'],
  [
    'Roulette round failed: not drawn within 5 minutes of its scheduled time (3 pending tickets cancelled)',
    'Roulette round failed: not drawn within 5 minutes of its scheduled time (3 pending tickets cancelled)',
    'Ronda de ruleta fallida: no se sorteó dentro de los 5 minutos de su horario (3 tickets pendientes cancelados)',
  ],
  [
    'Quick Money draw failed: not drawn within 5 minutes of its scheduled time (1 pending ticket cancelled)',
    'Quick Money draw failed: not drawn within 5 minutes of its scheduled time (1 pending ticket cancelled)',
    'Sorteo de Quick Money fallido: no se sorteó dentro de los 5 minutos de su horario (1 ticket pendiente cancelado)',
  ],
  ['Maintenance mode turned on', 'Maintenance mode turned on', 'Modo de mantenimiento activado'],
  ['Maintenance mode turned off', 'Maintenance mode turned off', 'Modo de mantenimiento desactivado'],
  [
    'Report downloaded: financialReport (pdf), 2026-10-01 to 2026-10-16, lottery',
    'Report downloaded: Financial Report (PDF), 2026-10-01 to 2026-10-16, Quick Money',
    'Reporte descargado: Reporte Financiero (PDF), del 2026-10-01 al 2026-10-16, Quick Money',
  ],
]

describe('localizeLogDescription', () => {
  afterAll(() => i18n.changeLanguage('en-US'))

  it('shows backend log descriptions in English', async () => {
    await i18n.changeLanguage('en-US')
    for (const [stored, english] of SAMPLES) expect(localizeLogDescription(stored, i18n.t)).toBe(english)
  })

  it('shows them in Spanish when the panel is in Spanish', async () => {
    await i18n.changeLanguage('es')
    for (const [stored, , spanish] of SAMPLES) expect(localizeLogDescription(stored, i18n.t)).toBe(spanish)
  })
})
