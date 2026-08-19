import { Color, Filter, GlProgram, GpuProgram, UniformGroup } from 'pixi.js'

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
uniform vec3 uKeyColor;
uniform float uThreshold;
uniform float uSoftness;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    float dist = distance(color.rgb, uKeyColor);
    float keyAlpha = smoothstep(uThreshold, uThreshold + uSoftness, dist);

    float alpha = color.a * keyAlpha;
    finalColor = vec4(color.rgb * alpha, alpha);
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

struct ChromaKeyUniforms {
  uKeyColor: vec3<f32>,
  uThreshold: f32,
  uSoftness: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> chromaKeyUniforms: ChromaKeyUniforms;

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

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);

  if (color.a > 0.0) {
    color.r /= color.a;
    color.g /= color.a;
    color.b /= color.a;
  }

  let dist = distance(color.rgb, chromaKeyUniforms.uKeyColor);
  let keyAlpha = smoothstep(chromaKeyUniforms.uThreshold, chromaKeyUniforms.uThreshold + chromaKeyUniforms.uSoftness, dist);

  let alpha = color.a * keyAlpha;
  return vec4<f32>(color.rgb * alpha, alpha);
}
`

export interface ChromaKeyFilterOptions {
  /** Color de fondo a quitar, en hex (0xRRGGBB). */
  color?: number
  /** Distancia de color por debajo de la cual un píxel se vuelve completamente transparente (0-1 aprox). */
  threshold?: number
  /** Ancho del degradado entre "transparente" y "opaco" arriba del threshold, para suavizar el borde. */
  softness?: number
}

/**
 * Vuelve transparentes los píxeles cercanos al color de fondo azul sólido (#0000CF,
 * chroma-key), dejando ver lo que esté renderizado detrás en el mismo canvas de Pixi.
 * Se usa para "quitar" el fondo azul quemado en los videos de local-media y que se vea
 * el Background de la app detrás.
 */
export class ChromaKeyFilter extends Filter {
  constructor(options: ChromaKeyFilterOptions = {}) {
    const { color = 0x0000cf, threshold = 0.35, softness = 0.15 } = options

    const chromaKeyUniforms = new UniformGroup({
      uKeyColor: { value: new Color(color), type: 'vec3<f32>' },
      uThreshold: { value: threshold, type: 'f32' },
      uSoftness: { value: softness, type: 'f32' },
    })

    const gpuProgram = GpuProgram.from({
      vertex: { source, entryPoint: 'mainVertex' },
      fragment: { source, entryPoint: 'mainFragment' },
    })

    const glProgram = GlProgram.from({
      vertex: vertexGl,
      fragment: fragmentGl,
      name: 'chroma-key-filter',
    })

    super({
      gpuProgram,
      glProgram,
      resources: {
        chromaKeyUniforms,
      },
    })
  }

  get color(): number {
    return (this.resources.chromaKeyUniforms.uniforms.uKeyColor as Color).toNumber()
  }

  set color(value: number) {
    this.resources.chromaKeyUniforms.uniforms.uKeyColor = new Color(value)
  }

  get threshold(): number {
    return this.resources.chromaKeyUniforms.uniforms.uThreshold
  }

  set threshold(value: number) {
    this.resources.chromaKeyUniforms.uniforms.uThreshold = value
  }

  get softness(): number {
    return this.resources.chromaKeyUniforms.uniforms.uSoftness
  }

  set softness(value: number) {
    this.resources.chromaKeyUniforms.uniforms.uSoftness = value
  }
}
