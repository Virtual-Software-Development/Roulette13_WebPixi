import { Filter, GlProgram, GpuProgram, UniformGroup } from 'pixi.js'

// Vertex shader compartido por todos los filtros de Pixi (posiciona el quad del filtro
// y calcula las coordenadas de textura) — copiado del vertex default interno de pixi.js
// porque no se exporta públicamente desde el paquete.
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

const fragmentGl = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uLayout;       // 0 = side-by-side (color|matte), 1 = top-bottom (color/matte)
uniform float uMatteChannel; // 0 = luminancia, 1 = R, 2 = G, 3 = B

vec2 colorUV(vec2 uv)
{
    if (uLayout < 0.5) return vec2(uv.x * 0.5, uv.y);
    return vec2(uv.x, uv.y * 0.5);
}

vec2 matteUV(vec2 uv)
{
    if (uLayout < 0.5) return vec2(uv.x * 0.5 + 0.5, uv.y);
    return vec2(uv.x, uv.y * 0.5 + 0.5);
}

void main(void)
{
    vec4 colorSample = texture(uTexture, colorUV(vTextureCoord));
    vec4 matteSample = texture(uTexture, matteUV(vTextureCoord));

    if (colorSample.a > 0.0) {
        colorSample.rgb /= colorSample.a;
    }

    float alpha;
    if (uMatteChannel < 0.5) alpha = dot(matteSample.rgb, vec3(0.2126, 0.7152, 0.0722));
    else if (uMatteChannel < 1.5) alpha = matteSample.r;
    else if (uMatteChannel < 2.5) alpha = matteSample.g;
    else alpha = matteSample.b;

    finalColor = vec4(colorSample.rgb * alpha, alpha);
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

struct AlphaMatteUniforms {
  uLayout: f32,
  uMatteChannel: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> alphaMatteUniforms: AlphaMatteUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

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

@vertex
fn mainVertex(
  @location(0) aPosition: vec2<f32>,
) -> VSOutput {
  return VSOutput(
    filterVertexPosition(aPosition),
    filterTextureCoord(aPosition),
  );
}

fn colorUV(uv: vec2<f32>) -> vec2<f32>
{
  if (alphaMatteUniforms.uLayout < 0.5) { return vec2<f32>(uv.x * 0.5, uv.y); }
  return vec2<f32>(uv.x, uv.y * 0.5);
}

fn matteUV(uv: vec2<f32>) -> vec2<f32>
{
  if (alphaMatteUniforms.uLayout < 0.5) { return vec2<f32>(uv.x * 0.5 + 0.5, uv.y); }
  return vec2<f32>(uv.x, uv.y * 0.5 + 0.5);
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
  var colorSample = textureSample(uTexture, uSampler, colorUV(uv));
  let matteSample = textureSample(uTexture, uSampler, matteUV(uv));

  if (colorSample.a > 0.0) {
    colorSample.r /= colorSample.a;
    colorSample.g /= colorSample.a;
    colorSample.b /= colorSample.a;
  }

  var alpha: f32;
  if (alphaMatteUniforms.uMatteChannel < 0.5) { alpha = dot(matteSample.rgb, vec3<f32>(0.2126, 0.7152, 0.0722)); }
  else if (alphaMatteUniforms.uMatteChannel < 1.5) { alpha = matteSample.r; }
  else if (alphaMatteUniforms.uMatteChannel < 2.5) { alpha = matteSample.g; }
  else { alpha = matteSample.b; }

  return vec4<f32>(colorSample.rgb * alpha, alpha);
}
`

export type AlphaMatteLayout = 'side-by-side' | 'top-bottom'
export type AlphaMatteChannel = 'luminance' | 'r' | 'g' | 'b'

export interface AlphaMatteFilterOptions {
  /** 'side-by-side' (default): color en la mitad izquierda, máscara en la derecha. 'top-bottom': color arriba, máscara abajo. */
  layout?: AlphaMatteLayout
  /** Qué componente de la mitad de máscara se lee como alpha. Default 'luminance'. */
  matteChannel?: AlphaMatteChannel
}

const LAYOUT_VALUES: Record<AlphaMatteLayout, number> = {
  'side-by-side': 0,
  'top-bottom': 1,
}

const MATTE_CHANNEL_VALUES: Record<AlphaMatteChannel, number> = {
  luminance: 0,
  r: 1,
  g: 2,
  b: 3,
}

/**
 * Combina, en una sola textura de video, un frame que trae el color del sujeto y una máscara
 * de alpha en escala de grises "cocinada" en el editor (una al lado de la otra en el mismo
 * frame), en transparencia real por píxel. A diferencia de un chroma-key en vivo, los bordes
 * salen limpios porque la máscara ya viene con feather/despill aplicados por un keyer
 * profesional, en vez de calcularse en tiempo real a partir de un color ya comprimido/mezclado
 * por el codec cerca de los bordes del sujeto.
 */
export class AlphaMatteFilter extends Filter {
  constructor(options: AlphaMatteFilterOptions = {}) {
    const { layout = 'side-by-side', matteChannel = 'luminance' } = options

    const alphaMatteUniforms = new UniformGroup({
      uLayout: { value: LAYOUT_VALUES[layout], type: 'f32' },
      uMatteChannel: { value: MATTE_CHANNEL_VALUES[matteChannel], type: 'f32' },
    })

    const gpuProgram = GpuProgram.from({
      vertex: { source, entryPoint: 'mainVertex' },
      fragment: { source, entryPoint: 'mainFragment' },
    })

    const glProgram = GlProgram.from({
      vertex: vertexGl,
      fragment: fragmentGl,
      name: 'alpha-matte-filter',
    })

    super({
      gpuProgram,
      glProgram,
      resources: {
        alphaMatteUniforms,
      },
    })
  }

  get layout(): AlphaMatteLayout {
    return this.resources.alphaMatteUniforms.uniforms.uLayout < 0.5 ? 'side-by-side' : 'top-bottom'
  }

  set layout(value: AlphaMatteLayout) {
    this.resources.alphaMatteUniforms.uniforms.uLayout = LAYOUT_VALUES[value]
  }

  get matteChannel(): AlphaMatteChannel {
    const value = this.resources.alphaMatteUniforms.uniforms.uMatteChannel
    return (Object.keys(MATTE_CHANNEL_VALUES) as AlphaMatteChannel[]).find(
      (key) => MATTE_CHANNEL_VALUES[key] === value,
    ) as AlphaMatteChannel
  }

  set matteChannel(value: AlphaMatteChannel) {
    this.resources.alphaMatteUniforms.uniforms.uMatteChannel = MATTE_CHANNEL_VALUES[value]
  }
}
