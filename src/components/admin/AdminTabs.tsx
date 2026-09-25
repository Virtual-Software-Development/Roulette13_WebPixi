import './adminTabs.css'

export interface AdminTabDef<T extends string> {
  id: T
  label: string
  icon?: string
}

interface AdminTabsProps<T extends string> {
  tabs: AdminTabDef<T>[]
  active: T
  onChange: (tab: T) => void
}

// Genérico -- extraído del look de RtpManagementTabs.tsx (mismo tratamiento rojo para el tab
// activo, "el rojo representa SELECCIÓN dentro del Admin"), pero esa versión hardcodea sus propias
// 3 tabs de RTP adentro del componente. Acá la lista de tabs es un prop, para poder reutilizarlo
// en Video Management (Roulette/Quick Money/Upload History) sin duplicar el componente.
export function AdminTabs<T extends string>({ tabs, active, onChange }: AdminTabsProps<T>) {
  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className="admin-tab"
          data-active={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <img src={tab.icon} className="admin-tab-icon" alt="" />}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
