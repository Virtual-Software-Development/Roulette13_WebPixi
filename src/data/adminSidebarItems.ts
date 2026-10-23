import { buildMediaUrl } from '../utils/media'
import type { AdminSidebarItem } from '../types/adminDashboard'

// Navegación del Admin Panel (AdminLayout/AdminSidebar).
export const ADMIN_SIDEBAR_ITEMS: AdminSidebarItem[] = [
  {
    id: 'dashboard',
    labelKey: 'admin.nav.dashboard',
    icon: buildMediaUrl('Website_svg_icons/35_house_white.svg'),
    view: 'admin',
  },
  {
    id: 'gameEvents',
    labelKey: 'admin.nav.gameEvents',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    view: 'admin-game-events',
  },
  {
    id: 'nextResults',
    labelKey: 'admin.nav.nextResults',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    children: [
      { id: 'roulette', labelKey: 'admin.nav.roulette', view: 'admin-next-results' },
      { id: 'lottery', labelKey: 'admin.nav.lottery', view: 'admin-next-results-quick-money' },
    ],
  },
  {
    id: 'users',
    labelKey: 'admin.nav.users',
    icon: buildMediaUrl('Website_svg_icons/16_user_white_circle.svg'),
    view: 'admin-users',
  },
  {
    id: 'rtp',
    labelKey: 'admin.nav.rtp',
    icon: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
    children: [
      { id: 'rtpDashboard', labelKey: 'admin.nav.rtpDashboard', view: 'admin-rtp-dashboard' },
      { id: 'rtpManagement', labelKey: 'admin.nav.rtpManagement', view: 'admin-rtp-management' },
    ],
  },
  {
    id: 'systemLogs',
    labelKey: 'admin.nav.systemLogs',
    icon: buildMediaUrl('Website_svg_icons/38_copy_documents_white.svg'),
    view: 'admin-system-logs',
  },
  {
    id: 'reports',
    labelKey: 'admin.nav.reports',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    view: 'admin-reports',
  },
  {
    id: 'settings',
    labelKey: 'admin.nav.settings',
    icon: buildMediaUrl('Website_svg_icons/17_gear_white.svg'),
    view: 'admin-settings',
  },
  {
    id: 'programming',
    labelKey: 'admin.nav.programming',
    icon: buildMediaUrl('Website_svg_icons/30_clock_white.svg'),
    view: 'admin-programming',
  },
]
