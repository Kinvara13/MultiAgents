import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Save } from 'lucide-react'

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

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="flex-1 min-w-0">
        <Label className="text-sm text-[#94A3B8]">{label}</Label>
        {description && <p className="text-xs text-[#64748B] mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0 w-[240px]">{children}</div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="pb-2 mb-4 border-b border-[rgba(148,163,184,0.08)]">
      <h3 className="text-h4 text-[#F1F5F9]">{title}</h3>
    </div>
  )
}

export default function GeneralTab() {
  const [platformName, setPlatformName] = useState('AgentNexus')
  const [timezone, setTimezone] = useState('Asia/Shanghai')
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')
  const [theme, setTheme] = useState('dark')
  const [fontSize, setFontSize] = useState('medium')
  const [codeFont, setCodeFont] = useState('jetbrains')
  const [compactMode, setCompactMode] = useState(false)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [language, setLanguage] = useState('zh')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Basic Info */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="基本信息" />
        <SettingRow label="平台名称" description="显示在界面顶部和通知中的名称">
          <Input
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm focus:border-[#00D4FF]/50"
          />
        </SettingRow>
        <SettingRow label="工作区标识" description="全局唯一标识，只读">
          <Input
            value="nexus-prod-a1b2"
            readOnly
            className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#64748B] text-sm"
          />
        </SettingRow>
        <SettingRow label="时区" description="所有时间戳的默认时区">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="日期格式" description="日期显示格式">
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              <SelectItem value="YYYY年MM月DD日">YYYY年MM月DD日</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* UI Preferences */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="界面偏好" />
        <SettingRow label="主题" description="界面配色方案">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="dark">深色模式</SelectItem>
              <SelectItem value="high-contrast">高对比度</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="字体大小" description="界面文字缩放级别">
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="small">小</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="large">大</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="代码字体" description="编辑器与日志中的等宽字体">
          <Select value={codeFont} onValueChange={setCodeFont}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
              <SelectItem value="fira">Fira Code</SelectItem>
              <SelectItem value="system">系统默认</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="紧凑模式" description="减少间距以显示更多信息">
          <Switch
            checked={compactMode}
            onCheckedChange={setCompactMode}
            className="data-[state=checked]:bg-[#00D4FF]"
          />
        </SettingRow>
        <SettingRow label="动画效果" description="关闭以提升低性能设备的流畅度">
          <Switch
            checked={animationEnabled}
            onCheckedChange={setAnimationEnabled}
            className="data-[state=checked]:bg-[#00D4FF]"
          />
        </SettingRow>
      </motion.div>

      <Separator className="bg-[rgba(148,163,184,0.08)] mb-8" />

      {/* Language */}
      <motion.div variants={itemVariants} className="mb-8">
        <SectionTitle title="语言" />
        <SettingRow label="界面语言" description="平台显示语言">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="bg-[#151D2C] border-[rgba(148,163,184,0.15)] text-[#F1F5F9] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2234] border-[rgba(148,163,184,0.15)]">
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
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
