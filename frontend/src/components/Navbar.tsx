import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function NexusLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="url(#logoGrad)" strokeWidth="2" fill="none" />
      <circle cx="16" cy="16" r="3" fill="#00D4FF" />
      <circle cx="16" cy="8" r="1.5" fill="#8B5CF6" opacity="0.6" />
      <circle cx="23" cy="20" r="1.5" fill="#8B5CF6" opacity="0.6" />
      <circle cx="9" cy="20" r="1.5" fill="#8B5CF6" opacity="0.6" />
    </svg>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Only show on home page
  if (location.pathname !== '/') return null

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
        scrolled ? 'bg-[#0A0E17]/80 backdrop-blur-[16px]' : 'bg-transparent'
      }`}
    >
      <div className="w-full max-w-[1440px] mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <NexusLogo size={28} />
          <span className="font-display text-lg font-bold text-[#F1F5F9]">AgentNexus</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: '功能', href: '#features' },
            { label: '文档', href: '#docs' },
            { label: 'GitHub', href: '#github' },
            { label: '社区', href: '#community' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/#docs"
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm rounded-lg border border-[rgba(148,163,184,0.15)] text-[#94A3B8] hover:border-[rgba(0,212,255,0.3)] hover:text-[#F1F5F9] transition-all duration-200"
          >
            查看文档
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-[#00D4FF] text-[#0A0E17] hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200"
          >
            立即部署
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
