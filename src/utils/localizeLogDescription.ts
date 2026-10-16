import type { TFunction } from 'i18next'

// El backend guarda la descripción de cada log como texto en inglés (internal/events, users,
// gameconfig, rtpprofiles...); las filas anteriores quedaron en español. Acá se reconocen esos
// formatos fijos, en los dos idiomas, y se muestran en el idioma del panel
// (admin.systemLogs.descriptions.*). Lo que escribió una persona -- el motivo de un cambio de
// resultado, un error del motor -- queda tal cual; un texto que no coincide con ningún formato
// conocido se muestra sin cambios.

const D = 'admin.systemLogs.descriptions'

// Motivo que mandan los paneles de Next Results (ver RouletteNextResultPanel/QuickMoneyNextResultPanel);
// el segundo es el de las filas anteriores.
const NEXT_RESULTS_REASONS = ['Manual change from Next Results', 'Cambio manual desde Next Results']

const GAME_LABEL_KEY: Record<string, string> = {
  roulette: 'admin.systemLogs.module.roulette',
  lottery: 'admin.systemLogs.module.quickMoney',
  quick_money: 'admin.systemLogs.module.quickMoney',
}

type Rule = [RegExp, (m: RegExpMatchArray, t: TFunction) => string]

const REPORT_GAME_LABEL_KEY: Record<string, string> = {
  all: 'admin.reports.filters.gameOptions.all',
  roulette: 'admin.reports.filters.gameOptions.roulette',
  lottery: 'admin.reports.filters.gameOptions.quickMoney',
}

// "Report downloaded: <tipo> (<formato>), <desde> to <hasta>, <juego>" (reports/download.go).
function reportDownloaded(m: RegExpMatchArray, t: TFunction): string {
  const [, type, format, from, to, game] = m
  return t(`${D}.reportDownloaded`, {
    report: t(`admin.reports.types.${type}`, { defaultValue: type }),
    format: t(`admin.reports.exportFormats.${format}`, { defaultValue: format }),
    from,
    to,
    game: REPORT_GAME_LABEL_KEY[game] ? t(REPORT_GAME_LABEL_KEY[game]) : game,
  })
}

function reason(text: string, t: TFunction): string {
  return NEXT_RESULTS_REASONS.includes(text) ? t(`${D}.reasons.nextResults`) : text
}

function role(value: string, t: TFunction): string {
  return value === 'admin' || value === 'cashier' ? t(`admin.users.role.${value}`) : value
}

// Cambios de "User X updated: a; b; c" (users.describeChanges), y los de las filas en español.
const CHANGE_RULES: Rule[] = [
  [/^username (\S+) → (\S+)$/, (m, t) => t(`${D}.changes.username`, { from: m[1], to: m[2] })],
  [/^name "(.*)" → "(.*)"$/, (m, t) => t(`${D}.changes.fullName`, { from: m[1], to: m[2] })],
  [/^role (\S+) → (\S+)$/, (m, t) => t(`${D}.changes.role`, { from: role(m[1], t), to: role(m[2], t) })],
  [/^reactivated$/, (_m, t) => t(`${D}.changes.reactivated`)],
  [/^password reset$/, (_m, t) => t(`${D}.changes.passwordReset`)],
  [/^usuario (\S+) → (\S+)$/, (m, t) => t(`${D}.changes.username`, { from: m[1], to: m[2] })],
  [/^nombre "(.*)" → "(.*)"$/, (m, t) => t(`${D}.changes.fullName`, { from: m[1], to: m[2] })],
  [/^email (\S+) → (\S+)$/, (m, t) => t(`${D}.changes.email`, { from: m[1], to: m[2] })],
  [/^rol (\S+) → (\S+)$/, (m, t) => t(`${D}.changes.role`, { from: role(m[1], t), to: role(m[2], t) })],
  [/^reactivado$/, (_m, t) => t(`${D}.changes.reactivated`)],
  [/^contraseña restablecida$/, (_m, t) => t(`${D}.changes.passwordReset`)],
]

function applyRules(rules: Rule[], text: string, t: TFunction): string | null {
  for (const [pattern, render] of rules) {
    const match = text.match(pattern)
    if (match) return render(match, t)
  }
  return null
}

// "User X created (role)", con ", inactive" si se creó desactivado.
function userCreated(m: RegExpMatchArray, t: TFunction): string {
  return t(m[3] ? `${D}.userCreatedInactive` : `${D}.userCreated`, { username: m[1], role: role(m[2], t) })
}

function userChanges(list: string, t: TFunction): string {
  return list
    .split('; ')
    .map((change) => applyRules(CHANGE_RULES, change, t) ?? change)
    .join('; ')
}

const RULES: Rule[] = [
  // Formato actual del backend (inglés).
  [/^Pending result read from (.+)$/, (m, t) => t(`${D}.pendingReadFrom`, { ip: m[1] })],
  [/^Pending result read$/, (_m, t) => t(`${D}.pendingRead`)],
  [/^Roulette round created$/, (_m, t) => t(`${D}.rouletteRoundCreated`)],
  [/^Roulette round drawn: (\S+)$/, (m, t) => t(`${D}.rouletteRoundDrawn`, { result: m[1] })],
  [/^Quick Money draw created$/, (_m, t) => t(`${D}.quickMoneyDrawCreated`)],
  [
    /^Quick Money draw drawn: Pick 3 (\d+), Pick 4 (\d+)$/,
    (m, t) => t(`${D}.quickMoneyDrawDrawn`, { pick3: m[1], pick4: m[2] }),
  ],
  [
    /^Result decided by the (\S+) engine \(amount bet in the round: ([\d.]+)\)$/,
    (m, t) => t(`${D}.engineDecided`, { engine: m[1], amount: m[2] }),
  ],
  [
    /^The (\S+) engine could not decide the result; the provisional one stays: (.*)$/s,
    (m, t) => t(`${D}.engineFailed`, { engine: m[1], error: m[2] }),
  ],
  [/^Manual result change: (.*)$/s, (m, t) => t(`${D}.manualResult`, { reason: reason(m[1], t) })],
  [/^(\S+) RTP updated$/, (m, t) => t(`${D}.rtpUpdated`, { game: GAME_LABEL_KEY[m[1]] ? t(GAME_LABEL_KEY[m[1]]) : m[1] })],
  [
    /^RTP profile "(.*)": (created|disabled|enabled)$/,
    (m, t) => t(`${D}.rtpProfile`, { name: m[1], event: t(`${D}.rtpProfileEvents.${m[2]}`) }),
  ],
  [/^User (\S+) created \((\w+)\)(, inactive)?$/, (m, t) => userCreated(m, t)],
  [/^User (\S+) updated: (.*)$/s, (m, t) => t(`${D}.userUpdated`, { username: m[1], changes: userChanges(m[2], t) })],
  [/^User (\S+) deactivated$/, (m, t) => t(`${D}.userDeactivated`, { username: m[1] })],
  [/^(\S+) signed in$/, (m, t) => t(`${D}.login`, { username: m[1] })],
  [
    /^(Roulette round|Quick Money draw) failed: not drawn within (\d+) minutes of its scheduled time \((\d+) pending tickets? cancelled\)$/,
    (m, t) =>
      t(m[1] === 'Roulette round' ? `${D}.rouletteRoundFailed` : `${D}.quickMoneyDrawFailed`, {
        minutes: m[2],
        count: Number(m[3]),
      }),
  ],
  [/^Maintenance mode turned on$/, (_m, t) => t(`${D}.maintenanceOn`)],
  [/^Maintenance mode turned off$/, (_m, t) => t(`${D}.maintenanceOff`)],
  [/^Report downloaded: (\w+) \((\w+)\), (\S+) to (\S+), (\w+)$/, reportDownloaded],

  // Filas anteriores, guardadas en español.
  [/^Lectura del resultado pendiente desde (.+)$/, (m, t) => t(`${D}.pendingReadFrom`, { ip: m[1] })],
  [/^Lectura del resultado pendiente$/, (_m, t) => t(`${D}.pendingRead`)],
  [/^Ronda de ruleta creada$/, (_m, t) => t(`${D}.rouletteRoundCreated`)],
  [/^Ronda de ruleta ejecutada: (\S+)$/, (m, t) => t(`${D}.rouletteRoundDrawn`, { result: m[1] })],
  [/^Sorteo de Quick Money creado$/, (_m, t) => t(`${D}.quickMoneyDrawCreated`)],
  [
    /^Sorteo de Quick Money ejecutado: Pick 3 (\d+), Pick 4 (\d+)$/,
    (m, t) => t(`${D}.quickMoneyDrawDrawn`, { pick3: m[1], pick4: m[2] }),
  ],
  // Sorteos de antes de Quick Money como juego único (PICK_3 + PICK_4).
  [/^Sorteo de lotería creado \(Pick 3 y Pick 4\)$/, (_m, t) => t(`${D}.lotteryDrawCreated`)],
  [
    /^Sorteo de lotería ejecutado: Pick 3 (\d+), Pick 4 (\d+)$/,
    (m, t) => t(`${D}.lotteryDrawDrawn`, { pick3: m[1], pick4: m[2] }),
  ],
  [
    /^Resultado decidido por el motor (\S+) \(apostado en la ronda: ([\d.]+)\)$/,
    (m, t) => t(`${D}.engineDecided`, { engine: m[1], amount: m[2] }),
  ],
  [
    /^Motor (\S+): no se pudo decidir el resultado, se mantiene el provisional: (.*)$/s,
    (m, t) => t(`${D}.engineFailed`, { engine: m[1], error: m[2] }),
  ],
  [/^Sustitución manual del resultado: (.*)$/s, (m, t) => t(`${D}.manualResult`, { reason: reason(m[1], t) })],
  [
    /^RTP de (\S+) actualizado$/,
    (m, t) => t(`${D}.rtpUpdated`, { game: GAME_LABEL_KEY[m[1]] ? t(GAME_LABEL_KEY[m[1]]) : m[1] }),
  ],
  [
    /^Perfil de RTP "(.*)": (created|disabled|enabled)$/,
    (m, t) => t(`${D}.rtpProfile`, { name: m[1], event: t(`${D}.rtpProfileEvents.${m[2]}`) }),
  ],
  [/^Usuario (\S+) creado \((\w+)\)(, inactivo)?$/, (m, t) => userCreated(m, t)],
  [/^Usuario (\S+) actualizado: (.*)$/s, (m, t) => t(`${D}.userUpdated`, { username: m[1], changes: userChanges(m[2], t) })],
  [/^Usuario (\S+) desactivado$/, (m, t) => t(`${D}.userDeactivated`, { username: m[1] })],
  [/^Inicio de sesión de (\S+)$/, (m, t) => t(`${D}.login`, { username: m[1] })],
]

export function localizeLogDescription(description: string, t: TFunction): string {
  return applyRules(RULES, description, t) ?? description
}
