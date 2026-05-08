import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, KeyRound, FileText, Trash2, Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)]">
      <h3 className="text-h4 text-[#F1F5F9]">{title}</h3>
    </div>
  )
}

export default function SecurityTab() {
  const [mainApiKey, setMainApiKey] = useState('sk-nexus-main-xxxxxxxxxxxxxxxxxxxxxxxx')
  const [wsToken, setWsToken] = useState('wst-nexus-xxxxxxxxxxxxxxxxxxxxxxxx')
  const [showMainKey, setShowMainKey] = useState(false)
  const [showWsToken, setShowWsToken] = useState(false)
  const [allowIps, setAllowIps] = useState('127.0.0.1\n192.168.1.0/24')
  const [corsDomains, setCorsDomains] = useState('https://agentnexus.local\nhttps://dashboard.agentnexus.local')
  const [authMethod, setAuthMethod] = useState('jwt')
  const [auditEnabled, setAuditEnabled] = useState(true)
  const [auditRetention, setAuditRetention] = useState('90')
  const [dataRetention, setDataRetention] = useState('180')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const regenerateKey = (setter: React.Dispatch<React.SetStateAction<string>>, prefix: string) => {
    const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    setter(`${prefix}-${random}`)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* API Keys */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="API 密钥" />
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-[#94A3B8]">主 API 密钥</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showMainKey ? 'text' : 'password'}
                  value={mainApiKey}
                  onChange={(e) => setMainApiKey(e.target.value)}
                  className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 pr-20"
                />
                <button
                  onClick={() => setShowMainKey(!showMainKey)}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                >
                  {showMainKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => regenerateKey(setMainApiKey, 'sk-nexus-main')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F59E0B] transition-colors"
                  title="重新生成"
                >
                  <KeyRound size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-[#94A3B8]">WebSocket Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showWsToken ? 'text' : 'password'}
                  value={wsToken}
                  onChange={(e) => setWsToken(e.target.value)}
                  className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 pr-20"
                />
                <button
                  onClick={() => setShowWsToken(!showWsToken)}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                >
                  {showWsToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => regenerateKey(setWsToken, 'wst-nexus')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F59E0B] transition-colors"
                  title="重新生成"
                >
                  <KeyRound size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* Access Control */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="访问控制" />
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-[#94A3B8]">允许 IP 地址</Label>
            <p className="text-xs text-[#64748B]">每行一个 CIDR 或 IP 地址，留空表示允许所有</p>
            <textarea
              value={allowIps}
              onChange={(e) => setAllowIps(e.target.value)}
              rows={3}
              className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00D4FF]/50 focus:outline-none resize-none font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-[#94A3B8]">CORS 域名</Label>
            <p className="text-xs text-[#64748B]">允许跨域请求的域名，每行一个</p>
            <textarea
              value={corsDomains}
              onChange={(e) => setCorsDomains(e.target.value)}
              rows={2}
              className="w-full bg-[#151D2C] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:border-[#00D4FF]/50 focus:outline-none resize-none font-mono"
            />
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm text-[#94A3B8]">认证方式</Label>
              <p className="text-xs text-[#64748B] mt-0.5">API 请求的认证机制</p>
            </div>
            <div className="w-[200px]">
              <Select value={authMethod} onValueChange={setAuthMethod}>
                <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
                  <SelectItem value="jwt">JWT</SelectItem>
                  <SelectItem value="oauth">OAuth 2.0</SelectItem>
                  <SelectItem value="none">无</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* Audit & Retention */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="审计与数据保留" />
        <div className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#00D4FF]" />
                <Label className="text-sm text-[#94A3B8]">启用审计日志</Label>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">记录所有管理操作和用户行为</p>
            </div>
            <Switch
              checked={auditEnabled}
              onCheckedChange={setAuditEnabled}
              className="data-[state=checked]:bg-[#00D4FF]"
            />
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm text-[#94A3B8]">审计日志保留天数</Label>
              <p className="text-xs text-[#64748B] mt-0.5">超过期限的日志将自动清理</p>
            </div>
            <Input
              type="number"
              value={auditRetention}
              onChange={(e) => setAuditRetention(e.target.value)}
              className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
            />
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Trash2 size={14} className="text-[#EF4444]" />
                <Label className="text-sm text-[#94A3B8]">数据保留策略</Label>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">产物和任务数据的保留天数</p>
            </div>
            <Input
              type="number"
              value={dataRetention}
              onChange={(e) => setDataRetention(e.target.value)}
              className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50 w-24"
            />
          </div>
        </div>
      </motion.div>

      {/* Save button */}
      <motion.div variants={itemVariants} className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            saved
              ? 'bg-[#10B981] text-[#0A0E17]'
              : 'bg-[#00D4FF] text-[#0A0E17] hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)]'
          }`}
        >
          <Save size={16} />
          {saved ? '已保存' : '保存设置'}
        </button>
      </motion.div>
    </motion.div>
  )
}
