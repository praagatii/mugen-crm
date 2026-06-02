import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ScrapePage from './pages/ScrapePage.jsx'
import LeadsPage from './pages/LeadsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/scrape" element={<ScrapePage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
