import '@testing-library/jest-dom/vitest'
import '../i18n'

// jsdom doesn't implement canvas rendering contexts, so pixi.js's canvas-renderer
// fallback (used since jsdom has no WebGL/WebGPU) throws on init. Stub getContext
// with a permissive proxy so property/method access no-ops instead of throwing.
HTMLCanvasElement.prototype.getContext = (() => {
  const noop = () => {}
  return new Proxy(
    {},
    {
      get: (target, prop) => (prop in target ? Reflect.get(target, prop) : noop),
      set: (target, prop, value) => Reflect.set(target, prop, value),
    },
  )
}) as typeof HTMLCanvasElement.prototype.getContext
