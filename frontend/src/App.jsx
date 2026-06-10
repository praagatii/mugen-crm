import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/layout/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ScrapePage from './pages/ScrapePage.jsx'
import LeadsPage from './pages/LeadsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  const location = useLocation();
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };
  const transition = { duration: 0.3 };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={transition}><DashboardPage /></motion.div>} />
          <Route path="/upload" element={<motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={transition}><UploadPage /></motion.div>} />
          <Route path="/scrape" element={<motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={transition}><ScrapePage /></motion.div>} />
          <Route path="/leads" element={<motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={transition}><LeadsPage /></motion.div>} />
          <Route path="/settings" element={<motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={transition}><SettingsPage /></motion.div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
