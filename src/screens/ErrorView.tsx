import { buildMediaUrl } from '../utils/media'
import './errorView.css'

const HOME_ICON_URL = buildMediaUrl('Website_svg_icons/35_house_white.svg')

// Vista GENÉRICA de error (pedido explícito: nunca "404Page"/"403Page" por separado) -- pantalla
// top-level DOM pura, mismo criterio que LoginPage.tsx/RouletteBettingView.tsx (ocupa todo el
// viewport, sin Header/sidebar). Pixi (App.tsx) no interviene acá: está encapsulado solo en la
// ruleta, y esta vista puede necesitarse ANTES de saber si Pixi llegó a inicializarse (ej. un
// ?preview= inválido en main.tsx), así que depender de Pixi para mostrarla sería frágil.
//
// Esta vista no conoce la causa del error (403/404/500/...) -- ese significado (código/título/
// descripción/acción) lo arma quien detecta el problema (ver NotFoundView.tsx para el caso de
// ruta inválida) y se lo pasa por props. Acá solo se presenta.
export interface ErrorViewProps {
  code: string | number
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export function ErrorView({ code, title, description, actionLabel, onAction }: ErrorViewProps) {
  return (
    <div className="error-view">
      <div className="error-view-content">
        <p className="error-view-code">{code}</p>
        <h1 className="error-view-title">{title}</h1>
        <p className="error-view-description">{description}</p>
        <button type="button" className="error-view-action" onClick={onAction}>
          <img src={HOME_ICON_URL} className="error-view-action-icon" alt="" />
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  )
}
