import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorView } from './ErrorView'
import { useMqttStore } from '../store/useMqttStore'
import { useInternetStore } from '../store/useInternetStore'

// Capa de "detección" para el caso sin conexión (mismo criterio que NotFoundView.tsx: ErrorView
// solo presenta). La conexión MQTT y el estado de internet son de la máquina y viven en cualquier
// pantalla (ver mqtt/mqttConnection.ts y network/internetMonitor.ts); este gate solo decide QUÉ
// pantallas redirigen al error cuando se caen -- hoy solo los lobbies (main.tsx). El resto puede
// leer los stores y reaccionar a su manera.
//
// Sin internet tiene prioridad: MQTT también cae en ese caso, pero la causa a informar es internet.
//
// Mientras no hay conexión se DESMONTA la pantalla (no se tapa con un overlay), para que no siga
// corriendo video/audio/polling detrás. Al reconectar se vuelve a montar desde cero y se
// resincroniza con el backend como en un arranque normal.
export function MqttGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const mqttOffline = useMqttStore((state) => state.offline)
  const internetOffline = useInternetStore((state) => state.offline)

  if (!mqttOffline && !internetOffline) return children

  const reason = internetOffline ? 'noInternet' : 'mqttOffline'
  return (
    <ErrorView
      code={503}
      title={t(`errorView.${reason}.title`)}
      description={t(`errorView.${reason}.description`)}
      actionLabel={t('errorView.retry')}
      onAction={() => window.location.reload()}
    />
  )
}
