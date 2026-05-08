import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Package,
  Settings,
  ChevronRight,
} from 'lucide-react'

function NexusLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidebarLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="url(#sidebarLogoGrad)" strokeWidth="2" fill="none" />
      <circle cx="16" cy="16" r="3" fill="#00D4FF" />
    </svg>
  )
}

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/agents', label: '智能体', icon: Bot },
  { path: '/workflows', label: '工作流', icon: GitBranch },
  { path: '/artifacts', label: '产物', icon: Package },
  { path: '/settings', label: '设置', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isDashboard = location.pathname !== '/'

  if (!isDashboard) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#111827] border-r border-[rgba(148,163,184,0.08)] z-40 flex flex-col hidden lg:flex">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 gap-2.5">
          <NexusLogo size={24} />
          <span className="font-display text-base font-bold text-[#F1F5F9]">AgentNexus</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                    isActive
                      ? 'text-[#00D4FF] bg-[rgba(0,212,255,0.06)]'
                      : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F1F5F9]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00D4FF] rounded-r-full"
                    />
                  )}
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[rgba(148,163,184,0.08)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-[#0A0E17]">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F1F5F9] truncate">Admin</p>
              <p className="text-xs text-[#64748B] truncate">admin@agentnexus.local</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar placeholder */}
      <aside className="fixed left-0 top-0 h-full w-[64px] bg-[#111827] border-r border-[rgba(148,163,184,0.08)] z-40 flex flex-col lg:hidden">
        <div className="h-12 flex items-center justify-center">
          <NexusLogo size={24} />
        </div>
        <nav className="flex-1 pt-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-[#00D4FF] bg-[rgba(0,212,255,0.06)]'
                    : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F1F5F9]'
                }`}
                title={item.label}
              >
                <Icon size={20} />
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-[64px] lg:ml-[240px] min-h-[100dvh]">
        {children}
      </main>
    </div>
  )
}
