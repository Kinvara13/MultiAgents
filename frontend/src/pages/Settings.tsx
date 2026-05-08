import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Link,
  Shield,
  BarChart3,
  ScrollText,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import GeneralTab from '@/components/settings/GeneralTab'
import ConnectionsTab from '@/components/settings/ConnectionsTab'
import SecurityTab from '@/components/settings/SecurityTab'
import MonitoringTab from '@/components/settings/MonitoringTab'
import LogsTab from '@/components/settings/LogsTab'
import { useSettings } from '@/hooks/useApi'

const tabs = [
  { id: 'general', label: '通用', icon: Settings, description: '基本信息、界面偏好、语言' },
  { id: 'connections', label: '连接', icon: Link, description: 'Agent 连接、API 配置' },
  { id: 'security', label: '安全', icon: Shield, description: '密钥管理、访问控制' },
  { id: 'monitoring', label: '监控', icon: BarChart3, description: '性能指标、告警规则' },
  { id: 'logs', label: '日志', icon: ScrollText, description: '系统日志、审计追踪' },
]

const contentVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const { data: settings, loading, error } = useSettings()

  const activeTabData = tabs.find(t => t.id === activeTab)!

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0E17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-[#00D4FF] animate-spin" />
          <span className="text-sm text-[#94A3B8]">加载设置...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0E17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-md text-center px-6">
          <div className="w-12 h-12 rounded-full bg-[#EF4444]/15 flex items-center justify-center">
            <AlertTriangle size={24} className="text-[#EF4444]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F1F5F9]">加载失败</h3>
          <p className="text-sm text-[#94A3B8]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A0E17]">
      {/* Top Breadcrumb Bar */}
      <div className="sticky top-0 z-30 h-14 flex items-center px-6 bg-[#0A0E17]/80 backdrop-blur-[12px] border-b border-[rgba(148,163,184,0.08)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#64748B]">设置</span>
          <ChevronRight size={14} className="text-[#64748B]" />
          <span className="text-[#F1F5F9] font-medium">{activeTabData.label}</span>
        </div>
        <span className="ml-3 text-xs text-[#64748B]">{activeTabData.description}</span>
        {settings && (
          <span className="ml-auto text-xs text-[#64748B] font-mono">
            {settings.app_name} v{settings.app_version}
          </span>
        )}
      </div>

      <div className="flex">
        {/* Left Inner Navigation */}
        <nav className="w-[200px] flex-shrink-0 py-6 px-4 hidden md:block">
          <div className="space-y-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative text-left ${
                    isActive
                      ? 'text-[#F1F5F9] bg-[rgba(0,212,255,0.06)]'
                      : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F1F5F9]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#00D4FF] rounded-r-full"
                    />
                  )}
                  <Icon size={18} className={isActive ? 'text-[#00D4FF]' : ''} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Mobile Tab Selector */}
        <div className="md:hidden w-full px-4 pt-4">
          <div className="flex gap-1 bg-[#111827] rounded-lg p-1 border border-[rgba(148,163,184,0.08)]">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex-1 justify-center ${
                    isActive
                      ? 'bg-[rgba(0,212,255,0.1)] text-[#00D4FF]'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 min-w-0">
          <div className="max-w-[960px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'connections' && <ConnectionsTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'monitoring' && <MonitoringTab />}
                {activeTab === 'logs' && <LogsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
