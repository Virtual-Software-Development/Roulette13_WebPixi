import { Filter, GlProgram, GpuProgram, UniformGroup } from 'pixi.js'

// Fracción del perímetro "encendida" en un momento dado -- fuente única de verdad compartida con
// LiveTableBetsPanel.tsx (progressRef inicial en modo prefers-reduced-motion), para que el shader
// de abajo y el JS que anima `progress` nunca puedan desincronizarse por un literal duplicado.
export const EDGE_GLOW_TAIL_FRACTION = 0.12

// Padding del filtro (px) -- el halo/bloom se pinta un poco más allá del rect 0..width/0..height
// del objeto base, así que el render target del filtro necesita ese margen extra para no recortarlo.
// Mismo valor usado como constante en el shader (ver PADDING más abajo) -- si uno cambia, cambiar el
// otro.
const EDGE_GLOW_FILTER_PADDING = 6

// Vertex shader compartido por todos los filtros de Pixi (posiciona el quad del filtro
// y calcula las coordenadas de textura) — copiado del vertex default interno de pixi.js
// porque no se exporta públicamente desde el paquete. Mismo boilerplate que ChromaKeyFilter.ts.
const vertexGl = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`

// Dibuja el "cometa" (cola de luz que recorre el perímetro de un rect width×height) enteramente en
// GPU: reemplaza a drawEdgeGlowTrail + perimeterPoint + edgeGlowColorAt (antes CPU, redibujadas cada
// tick) por matemática de shader evaluada una vez por pixel -- ver EdgeGlowFilter más abajo para el
// único trabajo por frame que queda del lado de React (escribir uProgress).
const fragmentGl = `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform vec4 uInputSize;

uniform float uWidth;
uniform float uHeight;
uniform float uProgress;

const float PADDING = ${EDGE_GLOW_FILTER_PADDING}.0;
const float TAIL_FRACTION = ${EDGE_GLOW_TAIL_FRACTION};
const float SHARP_WIDTH = 1.6;
const float BLOOM_WIDTH = 3.5;
const float BLOOM_ALPHA = 0.4;
const float BLUR_SOFTEN = 3.0;

// Stops de EDGE_GLOW_STOPS (LiveTableBetsPanel.tsx, antes de este cambio) convertidos a 0..1:
// 0x9e1715, 0xe8321d, 0xff4b1f, 0xff7426, 0xffb24a, 0xffd07a.
vec3 edgeGlowColorAt(float t)
{
    vec3 c0 = vec3(0.6196, 0.0902, 0.0824);
    vec3 c1 = vec3(0.9098, 0.1961, 0.1137);
    vec3 c2 = vec3(1.0, 0.2941, 0.1216);
    vec3 c3 = vec3(1.0, 0.4549, 0.1490);
    vec3 c4 = vec3(1.0, 0.6980, 0.2902);
    vec3 c5 = vec3(1.0, 0.8157, 0.4784);

    if (t <= 0.35) return mix(c0, c1, t / 0.35);
    if (t <= 0.6) return mix(c1, c2, (t - 0.35) / 0.25);
    if (t <= 0.82) return mix(c2, c3, (t - 0.6) / 0.22);
    if (t <= 0.95) return mix(c3, c4, (t - 0.82) / 0.13);
    return mix(c4, c5, (t - 0.95) / 0.05);
}

void main(void)
{
    // Coordenadas locales del pixel dentro del rect width×height del objeto base (recuperadas de la
    // textura de entrada, ya con el padding restado) -- equivalente al (x, y) que recibía
    // drawEdgeGlowTrail antes de este cambio.
    vec2 localPos = vTextureCoord * uInputSize.xy - vec2(PADDING, PADDING);

    // Mismo criterio que perimeterPoint (antes en LiveTableBetsPanel.tsx) pero invertido: dado un
    // punto, encontrar a qué lado pertenece (el más cercano) y su distancia acumulada de perímetro
    // (0..perimeter), sentido horario arrancando en la esquina superior izquierda. Distancia
    // euclídea al SEGMENTO (clampeado a su tramo real), no a la línea infinita de cada lado -- con
    // la línea infinita, un pixel diagonal a una esquina quedaba "pineado" con la misma frac (misma
    // cabeza del cometa) por DOS lados a la vez sin límite en el eje perpendicular, formando un
    // parche cuadrado/en L en cada esquina en vez de una punta redondeada.
    float perimeter = 2.0 * (uWidth + uHeight);
    float dTop = distance(localPos, vec2(clamp(localPos.x, 0.0, uWidth), 0.0));
    float dRight = distance(localPos, vec2(uWidth, clamp(localPos.y, 0.0, uHeight)));
    float dBottom = distance(localPos, vec2(clamp(localPos.x, 0.0, uWidth), uHeight));
    float dLeft = distance(localPos, vec2(0.0, clamp(localPos.y, 0.0, uHeight)));

    float fTop = clamp(localPos.x, 0.0, uWidth) / perimeter;
    float fRight = (uWidth + clamp(localPos.y, 0.0, uHeight)) / perimeter;
    float fBottom = (uWidth + uHeight + clamp(uWidth - localPos.x, 0.0, uWidth)) / perimeter;
    float fLeft = (2.0 * uWidth + uHeight + clamp(uHeight - localPos.y, 0.0, uHeight)) / perimeter;

    float dist = dTop;
    float frac = fTop;
    if (dRight < dist) { dist = dRight; frac = fRight; }
    if (dBottom < dist) { dist = dBottom; frac = fBottom; }
    if (dLeft < dist) { dist = dLeft; frac = fLeft; }

    // Ventana de la cola: mod() de GLSL ya devuelve el resultado "floored" en [0, 1), así que no
    // hace falta normalizar dos veces como en el perimeterPoint original (ese normalizaba la
    // fracción ANTES de restar, acá restamos primero y normalizamos el resultado, es equivalente).
    float d = mod(uProgress - frac, 1.0);
    float inside = step(d, TAIL_FRACTION);
    float t = clamp(1.0 - d / TAIL_FRACTION, 0.0, 1.0);
    float alphaEase = pow(t, 1.4) * inside;

    // Dos bandas en un solo pase -- sharp (borde duro) + bloom (falloff analítico, sustituto del
    // BlurFilter real que existía antes por instancia). No es idéntico a un blur Gaussiano real,
    // pero evita el pase de blur GPU por celda.
    float sharpMask = 1.0 - smoothstep(SHARP_WIDTH * 0.4, SHARP_WIDTH * 0.5, dist);
    float bloomMask = 1.0 - smoothstep(0.0, BLOOM_WIDTH * 0.5 + BLUR_SOFTEN, dist);

    vec3 color = edgeGlowColorAt(t);
    float sharpA = sharpMask * alphaEase;
    float bloomA = bloomMask * alphaEase * BLOOM_ALPHA;
    float outA = clamp(sharpA + bloomA * (1.0 - sharpA), 0.0, 1.0);

    finalColor = vec4(color * outA, outA);
}
`

const source = `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct EdgeGlowUniforms {
  uWidth: f32,
  uHeight: f32,
  uProgress: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> edgeGlowUniforms: EdgeGlowUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

const PADDING: f32 = ${EDGE_GLOW_FILTER_PADDING}.0;
const TAIL_FRACTION: f32 = ${EDGE_GLOW_TAIL_FRACTION};
const SHARP_WIDTH: f32 = 1.6;
const BLOOM_WIDTH: f32 = 3.5;
const BLOOM_ALPHA: f32 = 0.4;
const BLUR_SOFTEN: f32 = 3.0;

fn filterVertexPosition(aPosition: vec2<f32>) -> vec4<f32>
{
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

  return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition: vec2<f32>) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn edgeGlowColorAt(t: f32) -> vec3<f32>
{
  let c0 = vec3<f32>(0.6196, 0.0902, 0.0824);
  let c1 = vec3<f32>(0.9098, 0.1961, 0.1137);
  let c2 = vec3<f32>(1.0, 0.2941, 0.1216);
  let c3 = vec3<f32>(1.0, 0.4549, 0.1490);
  let c4 = vec3<f32>(1.0, 0.6980, 0.2902);
  let c5 = vec3<f32>(1.0, 0.8157, 0.4784);

  if (t <= 0.35) { return mix(c0, c1, t / 0.35); }
  if (t <= 0.6) { return mix(c1, c2, (t - 0.35) / 0.25); }
  if (t <= 0.82) { return mix(c2, c3, (t - 0.6) / 0.22); }
  if (t <= 0.95) { return mix(c3, c4, (t - 0.82) / 0.13); }
  return mix(c4, c5, (t - 0.95) / 0.05);
}

@vertex
fn mainVertex(
  @location(0) aPosition: vec2<f32>,
) -> VSOutput {
  return VSOutput(
    filterVertexPosition(aPosition),
    filterTextureCoord(aPosition),
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
  let width = edgeGlowUniforms.uWidth;
  let height = edgeGlowUniforms.uHeight;
  let progress = edgeGlowUniforms.uProgress;

  let localPos = uv * gfu.uInputSize.xy - vec2<f32>(PADDING, PADDING);

  // Distancia euclídea al segmento real (clampeado), no a la línea infinita -- ver comentario
  // equivalente en el lado GLSL (fragmentGl) sobre el parche en L que causaba en las esquinas.
  let perimeter = 2.0 * (width + height);
  let dTop = distance(localPos, vec2<f32>(clamp(localPos.x, 0.0, width), 0.0));
  let dRight = distance(localPos, vec2<f32>(width, clamp(localPos.y, 0.0, height)));
  let dBottom = distance(localPos, vec2<f32>(clamp(localPos.x, 0.0, width), height));
  let dLeft = distance(localPos, vec2<f32>(0.0, clamp(localPos.y, 0.0, height)));

  let fTop = clamp(localPos.x, 0.0, width) / perimeter;
  let fRight = (width + clamp(localPos.y, 0.0, height)) / perimeter;
  let fBottom = (width + height + clamp(width - localPos.x, 0.0, width)) / perimeter;
  let fLeft = (2.0 * width + height + clamp(height - localPos.y, 0.0, height)) / perimeter;

  var dist = dTop;
  var frac = fTop;
  if (dRight < dist) { dist = dRight; frac = fRight; }
  if (dBottom < dist) { dist = dBottom; frac = fBottom; }
  if (dLeft < dist) { dist = dLeft; frac = fLeft; }

  // WGSL '%' es resto con signo (como fmod en C), a diferencia del mod() "floored" de GLSL -- se
  // normaliza a mano para quedar siempre en [0, 1) igual que el lado GLSL.
  let raw = (progress - frac) % 1.0;
  let d = (raw + 1.0) % 1.0;
  let inside = step(d, TAIL_FRACTION);
  let t = clamp(1.0 - d / TAIL_FRACTION, 0.0, 1.0);
  let alphaEase = pow(t, 1.4) * inside;

  let sharpMask = 1.0 - smoothstep(SHARP_WIDTH * 0.4, SHARP_WIDTH * 0.5, dist);
  let bloomMask = 1.0 - smoothstep(0.0, BLOOM_WIDTH * 0.5 + BLUR_SOFTEN, dist);

  let color = edgeGlowColorAt(t);
  let sharpA = sharpMask * alphaEase;
  let bloomA = bloomMask * alphaEase * BLOOM_ALPHA;
  let outA = clamp(sharpA + bloomA * (1.0 - sharpA), 0.0, 1.0);

  return vec4<f32>(color * outA, outA);
}
`

export interface EdgeGlowFilterOptions {
  /** Ancho de la celda destacada, en px locales (mismo espacio que antes usaba drawEdgeGlowTrail). */
  width: number
  /** Alto de la celda destacada, en px locales. */
  height: number
  /** Posición inicial de la cabeza del cometa (0..1, fracción de vuelta), default 0. */
  progress?: number
}

const glProgram = GlProgram.from({
  vertex: vertexGl,
  fragment: fragmentGl,
  name: 'edge-glow-filter',
})

const gpuProgram = GpuProgram.from({
  vertex: { source, entryPoint: 'mainVertex' },
  fragment: { source, entryPoint: 'mainFragment' },
})

/**
 * Cometa de luz que recorre el perímetro de un rect width×height, calculado enteramente en shader
 * (GPU) a partir de un único uniform (`progress`) que se reescribe cada frame -- reemplaza el
 * enfoque anterior de reconstruir 35 segmentos de Graphics + un BlurFilter separado por celda en
 * cada tick (ver AnimatedEdgeGlow en LiveTableBetsPanel.tsx). `glProgram`/`gpuProgram` se compilan
 * una sola vez a nivel de módulo y se comparten entre todas las instancias (una por celda
 * destacada, hasta 10 a la vez) -- solo el uniform buffer difiere por instancia.
 */
export class EdgeGlowFilter extends Filter {
  constructor({ width, height, progress = 0 }: EdgeGlowFilterOptions) {
    const edgeGlowUniforms = new UniformGroup({
      uWidth: { value: width, type: 'f32' },
      uHeight: { value: height, type: 'f32' },
      uProgress: { value: progress, type: 'f32' },
    })

    super({
      glProgram,
      gpuProgram,
      resources: {
        edgeGlowUniforms,
      },
      padding: EDGE_GLOW_FILTER_PADDING,
    })
  }

  get progress(): number {
    return this.resources.edgeGlowUniforms.uniforms.uProgress
  }

  set progress(value: number) {
    this.resources.edgeGlowUniforms.uniforms.uProgress = value
  }

  get width(): number {
    return this.resources.edgeGlowUniforms.uniforms.uWidth
  }

  set width(value: number) {
    this.resources.edgeGlowUniforms.uniforms.uWidth = value
  }

  get height(): number {
    return this.resources.edgeGlowUniforms.uniforms.uHeight
  }

  set height(value: number) {
    this.resources.edgeGlowUniforms.uniforms.uHeight = value
  }
}
