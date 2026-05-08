import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Workflows from './pages/Workflows'
import Artifacts from './pages/Artifacts'
import Settings from './pages/Settings'

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <Layout>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/artifacts" element={<Artifacts />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {isHome && <Footer />}
    </Layout>
  )
}
