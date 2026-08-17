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
uniform float uThreshold;
uniform float uSoftness;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float keyAlpha = smoothstep(uThreshold, uThreshold + uSoftness, luma);

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

struct LumaKeyUniforms {
  uThreshold: f32,
  uSoftness: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> lumaKeyUniforms: LumaKeyUniforms;

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

  let luma = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
  let keyAlpha = smoothstep(lumaKeyUniforms.uThreshold, lumaKeyUniforms.uThreshold + lumaKeyUniforms.uSoftness, luma);

  let alpha = color.a * keyAlpha;
  return vec4<f32>(color.rgb * alpha, alpha);
}
`

export interface LumaKeyFilterOptions {
  /** Luminancia por debajo de la cual un píxel se vuelve completamente transparente (0-1). */
  threshold?: number
  /** Ancho del degradado entre "transparente" y "opaco" arriba del threshold, para suavizar el borde. */
  softness?: number
}

/**
 * Vuelve transparentes los píxeles oscuros de un sprite (luma-key), dejando ver lo que
 * esté renderizado detrás en el mismo canvas de Pixi. Se usa para "quitar" el fondo negro
 * quemado en los videos de local-media y que se vea el Background de la app detrás.
 */
export class LumaKeyFilter extends Filter {
  constructor(options: LumaKeyFilterOptions = {}) {
    const { threshold = 0.12, softness = 0.06 } = options

    const lumaKeyUniforms = new UniformGroup({
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
      name: 'luma-key-filter',
    })

    super({
      gpuProgram,
      glProgram,
      resources: {
        lumaKeyUniforms,
      },
    })
  }

  get threshold(): number {
    return this.resources.lumaKeyUniforms.uniforms.uThreshold
  }

  set threshold(value: number) {
    this.resources.lumaKeyUniforms.uniforms.uThreshold = value
  }

  get softness(): number {
    return this.resources.lumaKeyUniforms.uniforms.uSoftness
  }

  set softness(value: number) {
    this.resources.lumaKeyUniforms.uniforms.uSoftness = value
  }
}
