# Resumen del sorteo en el lobby: pedidos al backend

**Para:** quien trabaja en `quick-money-backend`
**De:** frontend (`Roulette13_WebPixi`)
**Fecha:** 2026-10-20

## Contexto

Tarea: *mostrar el resumen completo después del resultado*. Después de liquidar el evento, el lobby muestra una pantalla con el resultado, los atributos del número (color, docena, columna, par/impar, falta/pasa), las métricas agregadas (total apostado, total pagado, tickets participantes y tickets ganadores) y la lista de tickets ganadores. Aparece **después del sorteo de Ruleta y después del de Quick Money**, a la misma hora del servidor en todas las máquinas.

El frontend ya está hecho. Los atributos del número se calculan en el frontend. Las métricas y la lista **dependen del backend**, y hoy solo se cubren en parte con lo que ya es público:

| Dato | Ruleta | Quick Money |
|---|---|---|
| Número / resultado | ✅ (`/drawResult`, historial) | ✅ (sorteo del lobby) |
| Color, docena, columna, par/impar, falta/pasa | ✅ calculado en el frontend | No aplica |
| Total apostado | ✅ `/bets?drawNo=` → `totalBetAmount` | ❌ "Pendiente" |
| Tickets participantes | ✅ `/bets?drawNo=` → `playersCount` | ❌ "Pendiente" |
| Total pagado | ❌ "Pendiente" | ❌ "Pendiente" |
| Tickets ganadores | ❌ "Pendiente" | ❌ "Pendiente" |
| Lista de ganadores | ❌ "Lista pendiente" | ❌ "Lista pendiente" |

El backend **ya calcula todo esto** en `roundstats.RoundDetail` (`stats` y `winners`), pero solo lo expone en `GET /api/v1/rounds/{id}`, que pide sesión de admin. El lobby es público y no puede llamarlo.

---

## Pedido 1: endpoint público con el resumen de un sorteo liquidado (prioridad: alta)

Propuesta: `GET /api/v1/draw-summary?game={roulette|lottery}&drawNo={NNNN}`, público como `/bets` y `/drawResult`.

```json
{
  "game": "roulette",
  "drawNo": "0092",
  "status": "COMPLETED",
  "result": { "roulette": 17 },
  "stats": {
    "tickets": 48,
    "winningTickets": 6,
    "wagered": 1240.00,
    "paid": 980.00
  },
  "winners": [
    { "ticket": "•••• 4821", "machine": "PC desarrollo", "game": "roulette", "paid": 360.00 }
  ]
}
```

- `result`: en Ruleta, `{ "roulette": 0-37 }` (37 = "00", como en todo el proyecto); en Quick Money, `{ "pick3": "482", "pick4": "9031" }`.
- `stats`: los mismos valores que `roundstats.RoundStats`: `tickets`, `winningTickets`, `wagered` y `paid` (paid = apuesta + premio, el mismo criterio que hoy).
- `winners`: los mismos que `roundstats.WinningTicket`, **con el código ya enmascarado** desde el backend, porque el código completo sirve para cobrar y esta es una pantalla pública. Ordenados de mayor a menor `paid`. En Quick Money conviene indicar `game` (`pick3`/`pick4`) por ticket.
- Antes de la liquidación: **409** (como `/drawResult` antes de ejecutar). El frontend reintenta.
- Es lectura de agregados ya calculados: debería ser tan liviano como `/bets`.

Cuando exista, en el frontend solo cambia `src/api/drawSummary.ts`; la pantalla ya muestra todo esto.

**Opcional:** si la respuesta pudiera indicar qué ganadores son **de la terminal que pregunta** (por `X-Terminal-Token`), la pantalla ya tiene una tabla aparte para "tus tickets ganadores".

---

## Pedido 2: ajustar los tiempos del round (prioridad: media, requiere decisión)

Hoy el round dura 300 s y el lobby lo reparte así:

```
0:00  sorteo de Ruleta (video + panel del ganador)        ~26 s
0:26  RESUMEN RULETA + ganadores                          ~42 s   <- nuevo
1:10  bloque Quick Money: cuenta atrás 30 s, video 73 s
2:53  RESUMEN QUICK MONEY + ganadores                     ~19 s   <- nuevo
3:15  Ruleta a pantalla completa (hot/cold, spin stats)   105 s
5:00  siguiente sorteo de Ruleta
```

El resumen de Ruleta entra bien, con unos 42 s. El de **Quick Money solo tiene unos 19 s**, porque entre el final de su video y la vuelta a Ruleta no hay más tiempo. Si se quiere que dure lo mismo que el de Ruleta (~40 s) sin recortar los otros tramos, hay que cambiar estos valores **a la vez en backend y frontend**:

| Valor | Dónde | Hoy | Propuesto |
|---|---|---|---|
| `interval_seconds` de **ROULETTE** | tabla `game_schedule_config` | 300 | **320** |
| `interval_seconds` de **QUICK_MONEY** | tabla `game_schedule_config` | 300 | **320** (tiene que ser igual al de Ruleta: un sorteo de Quick Money por round) |
| `LobbyQuickMoneyLead` | `internal/events/lottery_lobby.go` | 200 s | **220 s** |
| `QUICK_MONEY_DRAW_AT_REMAINING_MS` | frontend, `src/config/quickMoneyLobbyCycle.ts` | 200 000 | **220 000** (lo cambia el frontend en el mismo despliegue) |
| `FALLBACK_ROULETTE_ROUND_MS` | frontend, ídem | 300 000 | 320 000 (solo se usa si no llegó `/gameInfo`) |

Resultado con 320 s: resumen de Ruleta ~42 s, resumen de Quick Money ~39 s, y Ruleta a pantalla completa sigue con 105 s.

Para tener en cuenta:
- `LobbyQuickMoneyLead` y `QUICK_MONEY_DRAW_AT_REMAINING_MS` tienen que ser **iguales**. Si se despliega uno sin el otro, el lobby muestra el sorteo de Quick Money en el momento equivocado.
- Con un round más largo hay menos sorteos por hora (12 → 11.25).
- `betting_close_seconds` de QUICK_MONEY (160 s) se cuenta desde su propio sorteo, así que no cambia.
- Las filas PICK_3 / PICK_4 de `game_schedule_config` también tienen 300 s. Habría que confirmar si todavía se usan después de unificar Quick Money (#164).

Si no se cambian los tiempos, todo funciona igual; el resumen de Quick Money simplemente dura ~19 s.

---

## Preguntas abiertas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Se acepta el endpoint público del pedido 1? ¿Con qué ruta y nombres de campos? | |
| 2 | ¿El código enmascarado (últimos 4 dígitos) es suficiente para una pantalla pública? | |
| 3 | ¿Se suben los rounds a 320 s (pedido 2), o el resumen de Quick Money se queda en ~19 s? | |
| 4 | ¿Las filas PICK_3 / PICK_4 de `game_schedule_config` se siguen usando? | |
