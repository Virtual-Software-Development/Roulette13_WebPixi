import { memo, useCallback, useMemo } from 'react'
import { extend } from '@pixi/react'
import { Container, FillGradient, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useTexture } from '../../hooks/useTexture'
import { easeOutCubic, easeInCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { formatCurrency } from '../../utils/currencyFormat'
import { buildMediaUrl } from '../../utils/media'
import type { ResultStatsData } from '../../types/resultStats'

extend({ Container, Graphics, Sprite, Text })

// Set Website_svg_icons (ver local-media/) -- reemplazan a los íconos de usuarios/monedas
// dibujados a mano de ACTIVE BETS / TOTAL POT.
const USERS_ICON_URL = buildMediaUrl('Website_svg_icons/24_users_gray.svg')
const COIN_STACK_ICON_URL = buildMediaUrl('Website_svg_icons/06_gold_chips_stack.svg')
const iconCenterAnchor = { x: 0.5, y: 0.5 }

// -----------------------------------------------------------------------------------------------
// Mini-dashboard de estadísticas (ACTIVE BETS / TOTAL POT) mostrado durante el video de resultado.
// A PROPÓSITO independiente de LiveTableBetsPanel.tsx (archivo, props, estilos, todo) -- ambos
// componentes son distintos y no deben depender uno del otro -- pero comparten la MISMA fuente de
// verdad de visibilidad (useDrawCycleStore.active) para aparecer/desaparecer en el mismo instante.
// No hay un segundo listener/timer propio: si el día de mañana cambia cómo se detecta "video de
// resultado activo", alcanza con seguir leyendo ese mismo campo acá y en LiveTableBetsPanel.
// -----------------------------------------------------------------------------------------------

const PANEL_WIDTH = 860
// Proporción ~1085:217 de la referencia (no las dimensiones literales, solo la relación de aspecto
// -- franja baja y ancha, mucho espacio negativo).
const PANEL_HEIGHT = 172
const CORNER_RADIUS = 4
const PANEL_PADDING_X = 44

// Navy-black extremadamente oscuro -- deliberadamente muy cercano a la paleta de fondo que ya usa
// LiveTableBetsPanel (PANEL_BG_TOP ≈ 0x08111a) para integrarse con el resto de la interfaz, pero
// definido acá como constante propia (no importado) para no crear una dependencia entre los dos
// componentes.
const PANEL_BG_COLOR = 0x0a111c
// Fondo del panel apagado (pedido explícito) -- queda flotando directamente sobre el video, sin
// rectángulo de fondo propio. La caja casi negra de TOTAL POT (BLOCK_BG_*) es un elemento de diseño
// aparte y se mantiene.
const PANEL_BG_ALPHA = 0

// Bloques internos: solo un poco más oscuros que el fondo del panel (contraste mínimo a propósito,
// sección "FONDO DE LOS BLOQUES" del brief) -- la separación la hace el espaciado/tipografía, no
// un borde ni una tarjeta.
const BLOCK_BG_COLOR = 0x040d16
const BLOCK_BG_ALPHA = 0.55
const BLOCK_RADIUS = 3

// Línea superior fina, casi imperceptible, con un acento rojo muy tenue centro/derecha -- ver
// drawTopHairline.
const HAIRLINE_COLOR = 0x24303a
// Más gruesa y un toque más visible (pedido explícito) -- eran 1.8/0.55.
const HAIRLINE_ALPHA = 0.7
const HAIRLINE_WIDTH = 2.6

const TEXT_LABEL_COLOR = 0xc7c2ba
const TEXT_MUTED_COLOR = 0x8f8981
const TEXT_VALUE_COLOR = 0xf3f4f3

const LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 12.5, letterSpacing: 1, fill: TEXT_LABEL_COLOR })
const SUBLABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 10.5, letterSpacing: 1, fill: TEXT_MUTED_COLOR })
const VALUE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 46, fill: TEXT_VALUE_COLOR })
const POT_VALUE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 40, fill: TEXT_VALUE_COLOR })

// Icono "users" -- Website_svg_icons/24_ (ver USERS_ICON_URL).
//
// memo: `size` es un literal fijo en su único call site -- evita re-ejecutar useTexture en cada
// tick de la animación de entrada/salida del panel (useAnimatedProgress más abajo).
const UsersIcon = memo(function UsersIcon({ size = 15 }: { size?: number }) {
  const { texture } = useTexture(USERS_ICON_URL)
  if (!texture) return null
  return <pixiSprite texture={texture} width={size} height={size} anchor={iconCenterAnchor} />
})

// Stack de monedas doradas -- Website_svg_icons/06_ (ver COIN_STACK_ICON_URL).
const COIN_HALO_COLOR = 0xe1922f

// memo: mismo criterio que UsersIcon.
const CoinStackIcon = memo(function CoinStackIcon({ size = 16 }: { size?: number }) {
  const { texture } = useTexture(COIN_STACK_ICON_URL)
  // Halo cálido MUY controlado (sección "ICONO" de TOTAL POT del brief) -- mismo criterio de glow
  // chico y contenido que ya usa LiveIndicator en LiveTableBetsPanel, no un blur pesado.
  const glow = useMemo(() => new GlowFilter({ distance: 5, outerStrength: 1, innerStrength: 0, color: COIN_HALO_COLOR, quality: 0.4, alpha: 0.35 }), [])
  if (!texture) return null
  return <pixiSprite texture={texture} width={size} height={size} anchor={iconCenterAnchor} filters={[glow]} />
})

// Línea superior fina (sección "LÍNEA SUPERIOR" del brief): un hairline oscuro casi imperceptible
// de punta a punta, con un segundo trazo horizontal-gradient transparente->rojo oscuro->transparente
// apenas visible en el tercio centro/derecha -- un detalle premium, no una barra de progreso.
function drawTopHairline(g: PixiGraphics, width: number) {
  g.clear()
  g.setStrokeStyle({ width: HAIRLINE_WIDTH, color: HAIRLINE_COLOR, alpha: HAIRLINE_ALPHA })
  g.moveTo(PANEL_PADDING_X * 0.4, 0)
  g.lineTo(width - PANEL_PADDING_X * 0.4, 0)
  g.stroke()

  const accentGradient = new FillGradient({
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
    colorStops: [
      { offset: 0, color: 'rgba(160, 38, 43, 0)' },
      { offset: 0.5, color: 'rgba(160, 38, 43, 0.20)' },
      { offset: 1, color: 'rgba(160, 38, 43, 0)' },
    ],
  })
  const accentWidth = width * 0.4
  g.rect(width * 0.5, -HAIRLINE_WIDTH / 2, accentWidth, HAIRLINE_WIDTH)
  g.fill(accentGradient)
}

// -----------------------------------------------------------------------------------------------

// Duraciones/easing asimétricos a propósito (sección "ANIMACIÓN DE ENTRADA/SALIDA" del brief):
// entra más lento y desacelerando (easeOutCubic, HUD apareciendo con calma), sale más rápido y
// acelerando (easeInCubic, "aspirado" hacia abajo) -- distinto del fade/slide simétrico de 200ms
// que usa LiveTableBetsPanel, porque este panel tiene su propio lenguaje de movimiento (traslación
// vertical marcada), no porque deba imitarlo.
const ENTER_DURATION_MS = 400
const EXIT_DURATION_MS = 300
const ENTRY_OFFSET_PX = 52

// Margen contra el borde inferior real de pantalla -- bajado para acercar el panel al borde de
// abajo de LiveTableBetsPanel (pedido explícito). No referencia la geometría de ese panel
// (quedarían acoplados, ver comentario de independencia arriba) -- es un ajuste manual, tunear
// este número directamente si hace falta más/menos margen.
const BOTTOM_MARGIN = -20

export function ResultStatsPanel({ data }: { data: ResultStatsData }) {
  const { t } = useTranslation()
  const { visibleLeft, visibleRight, visibleBottom } = useViewport()
  const active = useDrawCycleStore((state) => state.active)
  const videoArrived = useDrawCycleStore((state) => state.videoArrived)
  // Espera a videoArrived para entrar (ver useDrawCycleStore.videoArrived y el mismo criterio en
  // LiveTableBetsPanel) -- la salida sigue atada solo a `active`.
  const entering = active && videoArrived

  const rawProgress = useAnimatedProgress(entering ? 1 : 0, entering ? ENTER_DURATION_MS : EXIT_DURATION_MS, { startAtTarget: true })
  const eased = entering ? easeOutCubic(rawProgress) : easeInCubic(rawProgress)

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        radius: CORNER_RADIUS,
        fill: { color: PANEL_BG_COLOR, alpha: PANEL_BG_ALPHA },
      })
    },
    [],
  )

  const drawHairline = useCallback((g: PixiGraphics) => drawTopHairline(g, PANEL_WIDTH), [])

  // TOTAL POT mantiene el ancho que ya tenía (nunca se pidió tocarlo) -- reemplaza la regla "40-45%
  // / 10-15% / 40-45%" de la sección "RESPONSIVE" del brief, que repartía el espacio 50/50. 334px
  // es el ancho que ya tenía TOTAL POT con esa regla anterior.
  const rightBlockWidth = 334
  // ACTIVE BETS más angosto que TOTAL POT (pedido explícito): una fracción de ESE ancho, no "lo que
  // sobra" del panel -- así TOTAL POT no cambia de tamaño sin que se haya pedido.
  const ACTIVE_BETS_WIDTH_RATIO = 0.6
  const leftBlockWidth = rightBlockWidth * ACTIVE_BETS_WIDTH_RATIO
  // Gap reducido (pedido explícito: acercar ACTIVE BETS a TOTAL POT) -- era 12% del ancho del panel.
  const gapWidth = PANEL_WIDTH * 0.05

  // El conjunto (ACTIVE BETS + gap + TOTAL POT) se centra como UNA unidad dentro del panel -- no
  // cada bloque por separado -- y después se corre a la derecha (pedido explícito). GROUP_SHIFT_X
  // es el desplazamiento extra sobre esa posición ya centrada.
  const groupWidth = leftBlockWidth + gapWidth + rightBlockWidth
  const contentWidth = PANEL_WIDTH - PANEL_PADDING_X * 2
  const GROUP_SHIFT_X = 40
  const groupX = PANEL_PADDING_X + (contentWidth - groupWidth) / 2 + GROUP_SHIFT_X

  const leftBlockX = groupX
  const rightBlockX = leftBlockX + leftBlockWidth + gapWidth

  const headerY = 46
  const valueY = 98
  const sublabelY = 138

  // Margen vertical de la caja "casi negra" dentro del panel -- subirlo la achica (pedido
  // explícito: menos alta), sin tocar PANEL_HEIGHT ni las posiciones de texto (headerY/valueY/
  // sublabelY). Era 18/18 (caja de 136px de alto); con 26/26 queda en 120px.
  const BLOCK_VERTICAL_MARGIN = 26

  // Caja "casi negra" (sección "FONDO DE LOS BLOQUES" del brief) -- compartida por AMBOS bloques
  // (mismo fondo/alto en ACTIVE BETS que en TOTAL POT), pero cada uno con su propio ancho ahora que
  // ya no son iguales -- de ahí las dos instancias en vez de una sola función reutilizada.
  const drawLeftBlockBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        y: BLOCK_VERTICAL_MARGIN,
        width: leftBlockWidth,
        height: PANEL_HEIGHT - BLOCK_VERTICAL_MARGIN * 2,
        radius: BLOCK_RADIUS,
        fill: { color: BLOCK_BG_COLOR, alpha: BLOCK_BG_ALPHA },
      })
    },
    [leftBlockWidth],
  )
  const drawRightBlockBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        y: BLOCK_VERTICAL_MARGIN,
        width: rightBlockWidth,
        height: PANEL_HEIGHT - BLOCK_VERTICAL_MARGIN * 2,
        radius: BLOCK_RADIUS,
        fill: { color: BLOCK_BG_COLOR, alpha: BLOCK_BG_ALPHA },
      })
    },
    [rightBlockWidth],
  )

  const activeBetsLabel = t('resultStats.activeBets')
  const playersInRoundLabel = t('resultStats.playersInRound')
  const totalPotLabel = t('resultStats.totalPot')

  const panelX = (visibleLeft + visibleRight) / 2 - PANEL_WIDTH / 2
  const panelY = visibleBottom - PANEL_HEIGHT - BOTTOM_MARGIN + (1 - eased) * ENTRY_OFFSET_PX

  return (
    <pixiContainer x={panelX} y={panelY} alpha={eased}>
      <pixiGraphics draw={drawBackground} />
      <pixiGraphics draw={drawHairline} x={0} y={14} />

      {/* ACTIVE BETS -- contenido alineado a la izquierda (mismo criterio que TOTAL POT) */}
      <pixiContainer x={leftBlockX}>
        <pixiGraphics draw={drawLeftBlockBox} />
        <pixiContainer x={20} y={headerY}>
          <UsersIcon size={22} />
          <pixiText text={activeBetsLabel} style={LABEL_STYLE} x={18} anchor={{ x: 0, y: 0.5 }} />
        </pixiContainer>
        <pixiText text={String(data.activeBets)} style={VALUE_STYLE} x={20} y={valueY} anchor={{ x: 0, y: 0.5 }} />
        <pixiText text={playersInRoundLabel} style={SUBLABEL_STYLE} x={20} y={sublabelY} anchor={{ x: 0, y: 0.5 }} />
      </pixiContainer>

      {/* TOTAL POT -- contenido alineado a la izquierda de su bloque, sobre una caja casi negra */}
      <pixiContainer x={rightBlockX}>
        <pixiGraphics draw={drawRightBlockBox} />
        <pixiContainer x={20} y={headerY}>
          <CoinStackIcon size={22} />
          <pixiText text={totalPotLabel} style={LABEL_STYLE} x={19} anchor={{ x: 0, y: 0.5 }} />
        </pixiContainer>
        <pixiText text={formatCurrency(data.totalPot)} style={POT_VALUE_STYLE} x={20} y={valueY} anchor={{ x: 0, y: 0.5 }} />
      </pixiContainer>
    </pixiContainer>
  )
}
