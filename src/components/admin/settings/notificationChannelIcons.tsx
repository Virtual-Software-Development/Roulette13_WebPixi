import type { ReactNode } from 'react'
import { DiscordIcon, EnvelopeIcon, LinkIcon, SlackIcon } from './icons'
import type { NotificationChannelId } from '../../../types/adminSettings'

// Fuente única del glyph de cada canal -- usada por NotificationChannelsCard (la fila del canal)
// y RecentNotificationsCard (la columna Channel), pedido explícito de la referencia ("usa los
// mismos iconos"). En su propio archivo (no dentro de icons.tsx, que solo exporta componentes) para
// no romper Fast Refresh con un export que no es un componente.
export const CHANNEL_ICONS: Record<NotificationChannelId, ReactNode> = {
  email: <EnvelopeIcon />,
  discord: <DiscordIcon />,
  slack: <SlackIcon />,
  webhook: <LinkIcon />,
}
