# Sincronización del video de resultado de Ruleta: pedidos al backend

**Para:** quien trabaja en `quick-money-backend`
**De:** frontend (`Roulette13_WebPixi`, rama `BUG/178-RouletteVideo`)
**Fecha:** 2026-10-19

## Contexto

En los lobbies se vieron dos problemas con el video del resultado de Ruleta:

1. **Las máquinas no estaban sincronizadas durante el video.** Una empezaba antes que otra, terminaban en momentos distintos y el panel del número ganador aparecía con varios segundos de diferencia. El regreso al lobby sí coincidía.
2. **Un video que se oía pero no se veía,** sin que apareciera el panel de "video no disponible".

## Lo que ya se resolvió en el frontend (no requiere backend)

| Causa | Arreglo |
|---|---|
| Cada máquina elegía **un clip al azar** (`Math.random()`), y los clips duran entre 15.2 y 20.7 s | Ahora todas usan el campo `video` de `/drawResult` (la variante 1–5 que ya calcula `events.VideoVariant`) sobre los clips del número ordenados por nombre. Si `video` no viene o está fuera de rango, se usa un hash del sorteo. |
| El video arrancaba **cuando terminaba de cargar**, desde el segundo 0 | Arranca a la hora absoluta del servidor (T0 + 0.9 s). Si la máquina llega tarde, salta al punto donde van las demás, y durante la reproducción corrige cualquier desfase de más de 0.35 s. |
| Se daba por "listo" solo con los metadatos | El clip se descarga entero a memoria (blob) antes de reproducirse. |
| En desarrollo, `StrictMode` descartaba la precarga | Corregido. |
| No se vigilaba nada **durante** la reproducción | Se detecta: sin cuadros pintados (audio sin imagen), error de decodificación, video trabado y llegada demasiado tarde. En esos casos el video se silencia y se pasa al panel de "video no disponible", que sigue la misma línea de tiempo. |

Prueba con un sorteo real y 4 lobbies: uno normal, uno con el reloj 90 s adelantado y la CPU 4 veces más lenta, uno con el video llegando 3.5 s tarde y uno sin imagen. El número ganador apareció en las tres primeras con **menos de 40 ms** de diferencia. La cuarta pasó al panel, en silencio, y todas volvieron al lobby en el mismo instante.

---

## Pedidos al backend

### 1. Mantener estable el contrato de `video` en `/drawResult` (prioridad: alta, sin código nuevo)

El frontend ahora **depende** de este campo para que todas las máquinas muestren el mismo clip. Hoy funciona así y hay que mantenerlo:

- `GET /api/v1/drawResult?drawNo=…` devuelve `video` como **entero entre 1 y N**. Hoy N = 5, `videoVariants` en `internal/events/repository.go`.
- Es **determinístico por evento**: el mismo valor para todos los que lo pidan. Hoy es `fnv32a(eventID) % 5 + 1`.
- El frontend lo interpreta como: **posición (1-based) dentro de los clips del número, ordenados por nombre de archivo** (`local-media/Videos/{n}/`, 37 = "00").

**Pedido:**
- No cambiar la fórmula ni el rango sin avisar.
- Si cambia la cantidad de clips por número, `videoVariants` tiene que cambiar a la vez que la librería.
- Corregir los comentarios de `internal/events/repository.go` (`VideoVariant`) y `internal/video/model.go`, que todavía dicen que la terminal elige su clip "at random" y que el campo es "legacy". Ahora es el que decide el clip.

### 2. Manifiesto de la librería de videos (prioridad: media)

Que todas las máquinas muestren el mismo clip supone que **todas tienen exactamente los mismos archivos**. Si una tiene un archivo de más, de menos o con otro nombre, la variante 3 apunta a otro clip y esa máquina se desincroniza sin ningún error. Ya existe `GET /api/v1/video/missing`, que solo cuenta los faltantes.

**Pedido:** un endpoint con la lista oficial, por ejemplo `GET /api/v1/video/manifest`:

```json
{
  "version": "2026-10-19",
  "roulette": {
    "0":  [{ "file": "roulette_0_varA.mp4", "bytes": 15234567, "sha256": "…", "durationMs": 18733 }, …],
    "37": [ … ]
  }
}
```

Con esto el frontend puede comparar su librería al arrancar, avisar por el log si no coincide, y usar `durationMs` sin tener que cargar el archivo.

### 3. Recibir el resultado antes (prioridad: media, requiere decisión)

Hoy el sorteo se ejecuta `resultRevealLead = 2s` antes de la hora programada (`internal/worker/event_clock.go`). El frontend pide `/drawResult` **1.8 s antes** y en ese tiempo tiene que obtener el resultado, listar los clips y descargar el clip entero (unos 10–20 MB a 1080p60).

En la prueba, la máquina lenta y la del video lento terminaron la descarga **0.8 y 2.2 s después** de la hora del sorteo. El frontend lo compensa saltando ese tramo del video, así que se pierde parte del giro de la ruleta. Con más de ~13 s de retraso se rinde y muestra el panel de "video no disponible".

**Pedido:** evaluar subir el adelanto **solo para Ruleta** a unos 5–6 s, con una constante propia; `resultRevealLead` hoy lo comparte con `lottery_clock.go`. Hay que valorarlo frente a la seguridad: el resultado llega a las terminales unos segundos antes. El comentario del código dice que el límite de seguridad real es `hora_congelacion`, que ocurre mucho antes, pero eso lo tiene que confirmar backend o negocio.

Si se aprueba, el frontend solo tiene que cambiar `RESULT_LEAD_MS` en `src/App.tsx`.

### 4. Telemetría de reproducción desde las terminales (prioridad: media)

El caso de **audio sin imagen** no se pudo reproducir en desarrollo. Las causas probables son la decodificación de 1080p60 en hardware lento o un fallo de la GPU al componer el video, pero no hay forma de confirmarlo en los kioscos porque hoy solo queda en la consola del navegador. El frontend ya calcula un resumen por ronda (`[drawVideo] reproducción {…}` en la consola).

**Pedido:** un endpoint para que la terminal lo envíe y quede en los logs del sistema, por ejemplo `POST /api/v1/terminal/telemetry/draw-video`, autenticado con `X-Terminal-Token` como el resto de la API de terminal:

```json
{
  "drawNo": "0092",
  "game": "roulette",
  "clip": "Videos/12/roulette_12_varE.mp4",
  "startLagMs": 1401,
  "seekedToS": 1.4,
  "driftCorrections": 1,
  "presentedFrames": 428,
  "totalFrames": 838,
  "droppedFrames": 0,
  "failure": null
}
```

`failure` puede valer `null`, `"tooLate"`, `"playRejected"`, `"error"`, `"noPicture"` o `"stalled"`. Basta con guardarlo en `log` (o en una tabla propia) con `id_machine` y la hora. Lo útil es poder consultar qué máquinas fallan y con qué causa. Si se acepta, el frontend agrega el envío; es fire-and-forget y no bloquea nada.

---

## Nota de proceso: migraciones en la base compartida

Hoy las migraciones **24, 25 y 28** se aplicaron a la base compartida `10.5.1.143` antes de estar en GitHub. Mientras tanto, el backend de los demás no arrancaba: `migrate` falla con `no migration found for version N` y la API no levanta.

**Pedido:** no aplicar migraciones a `10.5.1.143` hasta que estén subidas, por lo menos en una rama remota. Para probar migraciones nuevas, usar una base local o de pruebas.

## Preguntas abiertas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Se puede adelantar el resultado de Ruleta a ~5–6 s (pedido 3)? ¿Cuál es el límite de seguridad real? | |
| 2 | ¿La librería de videos es exactamente igual en todas las terminales de producción? ¿Quién la distribuye y cómo se actualiza? | |
| 3 | ¿Va a cambiar la cantidad de variantes por número (hoy 5)? | |
