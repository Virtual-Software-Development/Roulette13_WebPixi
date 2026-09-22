import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminShell } from './layout/AdminShell'
import { LoginPage } from './routes/LoginPage'
import { DashboardPage } from './routes/DashboardPage'
import { RtpDashboardPage } from './routes/RtpDashboardPage'
import { RtpManagementPage } from './routes/RtpManagementPage'
import { GameConfigPage } from './routes/GameConfigPage'
import { MediaLibraryPage } from './routes/MediaLibraryPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="rtp-dashboard" element={<RtpDashboardPage />} />
              <Route path="rtp-management" element={<RtpManagementPage />} />
              <Route path="game-config" element={<GameConfigPage />} />
              <Route path="media" element={<MediaLibraryPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
