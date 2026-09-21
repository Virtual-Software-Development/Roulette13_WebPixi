import { useState } from 'react'
import { DatabaseCard } from './DatabaseCard'
import { StorageCard } from './StorageCard'
import { SystemOperationsCard } from './SystemOperationsCard'
import { SystemInformationCard } from './SystemInformationCard'
import { DangerZoneCard } from './DangerZoneCard'
import { DEFAULT_SYSTEM_DATABASE_SETTINGS, DEFAULT_SYSTEM_STORAGE_SETTINGS, SYSTEM_INFORMATION } from '../../../data/adminSettingsMockData'
import type { DatabaseType, SystemDatabaseSettings, SystemStorageSettings } from '../../../types/adminSettings'
import './adminSettings.css'

// A diferencia del tab General (que separa draft/guardado con Save Changes explícito, ver
// GeneralSettingsTab.tsx), la referencia de este tab no muestra un botón Save para Database/
// Storage -- los cambios viven directo en este estado, y la única forma de revertirlos es Factory
// Reset (Danger Zone), que los restaura a sus defaults (alcance confirmado con el usuario: solo
// Database/Storage, nada más en System es un estado real que resetear).
export function SystemTab() {
  const [database, setDatabase] = useState<SystemDatabaseSettings>(DEFAULT_SYSTEM_DATABASE_SETTINGS)
  const [storage, setStorage] = useState<SystemStorageSettings>(DEFAULT_SYSTEM_STORAGE_SETTINGS)

  const handleFactoryReset = () => {
    setDatabase(DEFAULT_SYSTEM_DATABASE_SETTINGS)
    setStorage(DEFAULT_SYSTEM_STORAGE_SETTINGS)
  }

  return (
    <div className="admin-settings-tab-content">
      <div className="admin-settings-row">
        <DatabaseCard
          data={database}
          onChangeDatabaseType={(value: DatabaseType) => setDatabase((prev) => ({ ...prev, databaseType: value }))}
          onChangeHost={(value) => setDatabase((prev) => ({ ...prev, host: value }))}
          onChangePort={(value) => setDatabase((prev) => ({ ...prev, port: value }))}
          onChangeDatabaseName={(value) => setDatabase((prev) => ({ ...prev, databaseName: value }))}
          onChangeUsername={(value) => setDatabase((prev) => ({ ...prev, username: value }))}
          onChangePassword={(value) => setDatabase((prev) => ({ ...prev, password: value }))}
        />
        <StorageCard
          data={storage}
          onChangeBaseDataPath={(value) => setStorage((prev) => ({ ...prev, baseDataPath: value }))}
          onChangeVideosPath={(value) => setStorage((prev) => ({ ...prev, videosPath: value }))}
          onChangeLogsPath={(value) => setStorage((prev) => ({ ...prev, logsPath: value }))}
          onChangeMaxLogFileSize={(value) => setStorage((prev) => ({ ...prev, maxLogFileSizeMb: Number(value) }))}
          onChangeKeepLogsFor={(value) => setStorage((prev) => ({ ...prev, keepLogsForDays: Number(value) }))}
        />
      </div>

      <div className="admin-settings-row">
        <SystemOperationsCard />
        <SystemInformationCard data={SYSTEM_INFORMATION} />
      </div>

      <DangerZoneCard onFactoryReset={handleFactoryReset} />
    </div>
  )
}
