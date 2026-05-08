import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  Package,
  ExternalLink,
  Quote,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react'

/* ─── SVG Agent Icons ─── */
function OpenClawIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 8C16 8 12 16 12 24C12 32 16 40 24 40" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 8C32 8 36 16 36 24C36 32 32 40 24 40" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 16L24 12L28 16" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 32L24 36L28 32" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="4" fill="#8B5CF6" />
    </svg>
  )
}

function HermesIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 6V42" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 12C16 12 20 16 24 16C28 16 32 12 32 12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 36C16 36 20 32 24 32C28 32 32 36 32 36" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="10" r="2" fill="#F59E0B" />
      <circle cx="24" cy="38" r="2" fill="#F59E0B" />
      <path d="M12 24H16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 24H36" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ClaudeIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 4L40 12V36L24 44L8 36V12L24 4Z" stroke="#8B5CF6" strokeWidth="2" fill="none" />
      <path d="M24 14L32 18V30L24 34L16 30V18L24 14Z" fill="#8B5CF6" opacity="0.2" />
      <path d="M24 16L30 19.5V26.5L24 30L18 26.5V19.5L24 16Z" stroke="#8B5CF6" strokeWidth="1.5" />
    </svg>
  )
}

function CodexIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M14 14L8 24L14 34" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 14L40 24L34 34" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 38L28 10" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function TraeIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M14 12H34" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 12V36" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 36H30" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 28L38 36L30 44" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function CursorIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M12 8L20 40L26 26L40 20L12 8Z" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M26 26L36 36" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Animation Variants ─── */
const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const staggerContainerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

const agents = [
  { name: 'OpenClaw', type: '远程', icon: OpenClawIcon, summary: '自主 Agent 框架，支持 Cron 调度与工具调用', status: 'online' },
  { name: 'Hermes', type: '远程', icon: HermesIcon, summary: '自进化记忆系统，跨会话技能蒸馏', status: 'online' },
  { name: 'Claude', type: '本地', icon: ClaudeIcon, summary: '深度代码分析与复杂推理任务', status: 'online' },
  { name: 'Codex', type: '本地', icon: CodexIcon, summary: '代码生成、重构、多语言支持', status: 'online' },
  { name: 'Trae', type: '本地', icon: TraeIcon, summary: '高效终端操作与系统级集成', status: 'offline' },
  { name: 'Cursor', type: '本地', icon: CursorIcon, summary: '智能代码编辑与实时代补', status: 'online' },
]

const features = [
  { icon: LayoutDashboard, title: '统一指挥中心', desc: '实时监控所有 Agent 状态、任务队列与系统健康。一个面板，全局视角。' },
  { icon: GitBranch, title: '可视化工作流编排', desc: '拖拽连接 Agent 节点，设计条件分支与循环。让多 Agent 协作像搭积木一样简单。' },
  { icon: MessageSquare, title: '智能会话路由', desc: '多 Agent 协作会话，自动消息路由与上下文共享。Agent 之间也能"开会"。' },
  { icon: Package, title: '产物自动收集', desc: '代码、文档、数据产物自动归集，版本控制与一键导出。交付从未如此顺畅。' },
]

const testimonials = [
  { name: '张明', role: '全栈工程师 @ 字节', quote: '以前用 OpenClaw 和 Claude 要开三个终端窗口。现在一个面板管所有 Agent，任务分配像填 Jira 一样简单。' },
  { name: '李雪', role: '技术负责人 @ 初创公司', quote: '自部署这点太重要了。我们的代码不能出内网。AgentNexus 的本地 daemon 设计很巧妙，Agent 就在我们机器上跑。' },
  { name: '王浩', role: '独立开发者', quote: '可视化编排省了太多事。以前写 yaml 配置文件头都大了，现在拖拽就能让 Codex 和 Trae 协同写一个功能。' },
]

/* ─── Hero Section ─── */
function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover animate-scale-pulse"
        style={{ animationDuration: '20s' }}
      >
        <source src="/hero-orb.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0A0E17]/60" />

      {/* Content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } },
          }}
        >
          <motion.p
            variants={fadeSlideUp}
            className="text-caption uppercase tracking-[0.1em] text-[#00D4FF] mb-6"
          >
            开源 · 本地部署 · 多 Agent 协同
          </motion.p>

          <motion.h1
            variants={fadeSlideUp}
            className="text-display text-[#F1F5F9] mb-6 max-w-[720px] mx-auto"
          >
            让 AI Agent 真正成为你的队友
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="text-body text-[#94A3B8] max-w-[600px] mx-auto mb-8 leading-[1.7]"
          >
            本地部署的 AgentNexus 帮你统一管理 OpenClaw、Hermes、Claude、Codex、Trae 等工具。分配任务、追踪进度、收集产物 — 就像管理团队一样管理 AI。
          </motion.p>

          <motion.div
            variants={fadeSlideUp}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium rounded-lg bg-[#00D4FF] text-[#0A0E17] hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)] transition-all duration-200"
            >
              开始部署
              <ArrowRight size={20} />
            </Link>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-4 text-lg rounded-lg border border-[rgba(148,163,184,0.15)] text-[#F1F5F9] hover:border-[rgba(0,212,255,0.3)] transition-all duration-200"
            >
              观看演示
              <ExternalLink size={18} />
            </a>
          </motion.div>

          <motion.p variants={fadeSlideUp} className="text-caption text-[#64748B]">
            v2.0 · 支持 6+ Agent 后端
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Agent Matrix ─── */
function AgentMatrix() {
  return (
    <section className="bg-[#111827] border-t border-[rgba(148,163,184,0.08)] py-24">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeSlideUp}
          className="text-center max-w-[600px] mx-auto mb-12"
        >
          <h2 className="text-h2 text-[#F1F5F9] mb-3">连接你所有的 Agent 与工具</h2>
          <p className="text-body-sm text-[#94A3B8]">无论远程还是本地，统一接入、统一编排、统一监控</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {agents.map((agent) => {
            const Icon = agent.icon
            return (
              <motion.div
                key={agent.name}
                variants={scaleIn}
                whileHover={{ y: -4, borderColor: 'rgba(0, 212, 255, 0.3)' }}
                className="bg-[#1A2234] rounded-xl border border-[rgba(148,163,184,0.08)] p-4 flex flex-col transition-colors duration-250"
              >
                <div className="flex items-center justify-between mb-3">
                  <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
                    <Icon size={40} />
                  </motion.div>
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    agent.status === 'online' ? 'bg-[#10B981] animate-pulse-green' :
                    'bg-[#64748B]'
                  }`} />
                </div>
                <h3 className="text-base font-semibold text-[#F1F5F9] mb-1">{agent.name}</h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full w-fit mb-2 ${
                  agent.type === '本地' ? 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]' :
                  'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'
                }`}>
                  {agent.type}
                </span>
                <p className="text-[13px] text-[#94A3B8] leading-[1.5] line-clamp-2 flex-1">{agent.summary}</p>
                <p className="text-[11px] text-[#64748B] mt-3">
                  {agent.status === 'online' ? '已连接 · 活跃' : '离线'}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Features ─── */
function Features() {
  return (
    <section id="features" className="bg-[#0A0E17] py-24">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeSlideUp}
          className="text-center mb-12"
        >
          <h2 className="text-h2 text-[#F1F5F9]">从任务分配到产物交付，全流程掌控</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainerSlow}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={fadeSlideUp}
                whileHover={{ y: -2 }}
                className="bg-[#111827] rounded-2xl border border-[rgba(148,163,184,0.08)] p-6 min-h-[280px] flex flex-col group hover:border-[rgba(0,212,255,0.15)] transition-colors duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="w-12 h-12 rounded-xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center mb-4"
                >
                  <Icon size={24} className="text-[#00D4FF]" />
                </motion.div>
                <h3 className="text-h4 text-[#F1F5F9] mb-2">{feature.title}</h3>
                <p className="text-body-sm text-[#94A3B8] flex-1">{feature.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Workflow Demo ─── */
function WorkflowDemo() {
  return (
    <section className="bg-[#111827] py-24">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeSlideUp}
            className="lg:w-[45%]"
          >
            <p className="text-caption uppercase tracking-[0.1em] text-[#00D4FF] mb-3">
              WORKFLOW ORCHESTRATION
            </p>
            <h2 className="text-h2 text-[#F1F5F9] mb-4">拖拽之间，编排复杂协作</h2>
            <p className="text-body text-[#94A3B8] mb-6 leading-[1.7]">
              不需要写配置文件。在可视化画布上拖拽 Agent 节点、设置触发条件、定义数据流向。保存即部署。
            </p>
            <div className="flex flex-wrap gap-3">
              {['1. 添加节点', '2. 连接逻辑', '3. 设置触发', '4. 运行监控'].map((step, i) => (
                <span key={step} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                  {i > 0 && <ArrowRight size={14} className="text-[#64748B]" />}
                  {step}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={scaleIn}
            className="lg:w-[55%]"
          >
            <div className="rounded-xl overflow-hidden border border-[rgba(148,163,184,0.08)] shadow-card">
              <img
                src="/workflow-canvas.png"
                alt="Workflow Canvas"
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Artifacts ─── */
function ArtifactsSection() {
  const codeLines = [
    { text: 'import { useState } from "react";', color: '#F59E0B' },
    { text: 'import { AgentNexus } from "@agentnexus/sdk";', color: '#F59E0B' },
    { text: '', color: '' },
    { text: 'async function deployWorkflow() {', color: '#00D4FF' },
    { text: '  const nexus = new AgentNexus({', color: '#F1F5F9' },
    { text: '    agents: ["claude", "codex", "openclaw"],', color: '#8B5CF6' },
    { text: '    mode: "parallel"', color: '#8B5CF6' },
    { text: '  });', color: '#F1F5F9' },
    { text: '', color: '' },
    { text: '  const result = await nexus.execute({', color: '#F1F5F9' },
    { text: '    task: "Generate API documentation",', color: '#10B981' },
    { text: '    output: "./docs/api.md"', color: '#10B981' },
    { text: '  });', color: '#F1F5F9' },
    { text: '', color: '' },
    { text: '  return result.artifacts;', color: '#00D4FF' },
    { text: '}', color: '#00D4FF' },
  ]

  return (
    <section className="bg-[#0A0E17] py-24">
      <div className="max-w-[1000px] mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeSlideUp}
          className="text-center mb-12"
        >
          <h2 className="text-h2 text-[#F1F5F9] mb-3">产物自动汇聚，代码即刻审查</h2>
          <p className="text-body text-[#94A3B8] max-w-[560px] mx-auto">
            Agent 完成的工作不会散落各处。代码、文档、数据自动归集到一个中心，支持 diff 查看与版本回溯。
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeSlideUp}
          className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] overflow-hidden"
        >
          <div className="flex flex-col md:flex-row">
            {/* File Tree */}
            <div className="w-full md:w-[200px] bg-[#0D1117] p-4 border-r border-[rgba(148,163,184,0.08)]">
              <p className="text-caption text-[#64748B] mb-3 uppercase tracking-wider">Explorer</p>
              <div className="space-y-1.5">
                {[
                  { name: 'src', indent: 0, icon: '📁' },
                  { name: 'components', indent: 1, icon: '📁' },
                  { name: 'AgentCard.tsx', indent: 2, icon: '⚛️' },
                  { name: 'WorkflowNode.tsx', indent: 2, icon: '⚛️' },
                  { name: 'hooks', indent: 1, icon: '📁' },
                  { name: 'useAgent.ts', indent: 2, icon: '🔧' },
                  { name: 'lib', indent: 1, icon: '📁' },
                  { name: 'utils.ts', indent: 2, icon: '🔧' },
                  { name: 'docs', indent: 0, icon: '📁' },
                  { name: 'api.md', indent: 1, icon: '📝' },
                ].map((file, i) => (
                  <motion.div
                    key={file.name}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex items-center gap-2 text-[13px] text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
                    style={{ paddingLeft: `${file.indent * 12}px` }}
                  >
                    <span>{file.icon}</span>
                    <span>{file.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Code Preview */}
            <div className="flex-1 bg-[#0D1117] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-[#F1F5F9]">deploy.ts</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B]">v2.1.0</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-[#00D4FF]">已审查</span>
                </div>
              </div>
              <div className="font-mono text-[13px] leading-[1.6]">
                {codeLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.04, duration: 0.2 }}
                    className="flex"
                  >
                    <span className="w-6 text-right text-[#64748B] mr-4 select-none">{i + 1}</span>
                    <span style={{ color: line.color || '#64748B' }}>{line.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Tech Architecture ─── */
function TechArchitecture() {
  return (
    <section className="bg-[#111827] py-24">
      <div className="max-w-[1000px] mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeSlideUp}
          className="text-center mb-12"
        >
          <p className="text-caption uppercase tracking-[0.1em] text-[#00D4FF] mb-3">
            SELF-HOSTED ARCHITECTURE
          </p>
          <h2 className="text-h2 text-[#F1F5F9] mb-4">数据不出境，完全掌控</h2>
          <p className="text-body text-[#94A3B8] max-w-[560px] mx-auto">
            AgentNexus 完全本地部署。你的代码、对话、产物全部留在本地机器。支持 Docker 一键启动，5 分钟跑起来。
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainerSlow}
          className="space-y-6"
        >
          {/* Top Layer: UI */}
          <motion.div variants={fadeSlideUp} className="relative">
            <div className="bg-[#0A0E17] rounded-xl border border-[#00D4FF]/30 p-5">
              <p className="text-caption text-[#00D4FF] uppercase tracking-wider mb-2">用户界面层</p>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.08)] text-sm text-[#00D4FF]">Web UI (React)</div>
                <div className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.08)] text-sm text-[#00D4FF]">CLI Tool</div>
                <div className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.08)] text-sm text-[#00D4FF]">API Server</div>
              </div>
            </div>
            {/* Arrow down */}
            <div className="flex justify-center my-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4V16M12 16L6 10M12 16L18 10" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
            </div>
          </motion.div>

          {/* Middle Layer: Core */}
          <motion.div variants={fadeSlideUp} className="relative">
            <div className="bg-[#0A0E17] rounded-xl border border-[#8B5CF6]/30 p-5">
              <p className="text-caption text-[#8B5CF6] uppercase tracking-wider mb-2">AgentNexus Core</p>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.08)] text-sm text-[#8B5CF6]">任务调度器</div>
                <div className="px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.08)] text-sm text-[#8B5CF6]">消息路由器</div>
                <div className="px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.08)] text-sm text-[#8B5CF6]">产物收集器</div>
              </div>
            </div>
            {/* Arrow down */}
            <div className="flex justify-center my-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4V16M12 16L6 10M12 16L18 10" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
            </div>
          </motion.div>

          {/* Bottom Layer: Agents */}
          <motion.div variants={fadeSlideUp}>
            <div className="bg-[#0A0E17] rounded-xl border border-[rgba(148,163,184,0.08)] p-5">
              <p className="text-caption text-[#94A3B8] uppercase tracking-wider mb-2">Agent 运行时</p>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { name: 'Claude', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
                  { name: 'Codex', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)' },
                  { name: 'OpenClaw', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
                  { name: 'Trae', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                  { name: 'Hermes', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                  { name: 'Cursor', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
                ].map((agent) => (
                  <div
                    key={agent.name}
                    className="px-3 py-1.5 rounded-full text-sm animate-pulse-green"
                    style={{ backgroundColor: agent.bg, color: agent.color }}
                  >
                    {agent.name}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Testimonials ─── */
function Testimonials() {
  return (
    <section className="bg-[#0A0E17] py-24">
      <div className="max-w-[1440px] mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeSlideUp}
          className="text-center mb-12"
        >
          <h2 className="text-h2 text-[#F1F5F9]">开发者怎么说</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainerSlow}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeSlideUp}
              whileHover={{ y: -3 }}
              className="bg-[#111827] rounded-xl border border-[rgba(148,163,184,0.08)] p-6 group hover:border-[rgba(0,212,255,0.15)] transition-colors duration-250"
            >
              <Quote size={28} className="text-[#00D4FF] opacity-30 group-hover:opacity-60 transition-opacity duration-250 mb-4" />
              <p className="text-body text-[#F1F5F9] italic leading-[1.7] mb-4">"{t.quote}"</p>
              <div className="border-t border-[rgba(148,163,184,0.08)] pt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-sm font-bold text-[#0A0E17]">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F1F5F9]">{t.name}</p>
                  <p className="text-xs text-[#64748B]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── CTA Section ─── */
function CTASection() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText('docker run agentnexus/nexus')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative bg-[#0A0E17] py-24 overflow-hidden">
      {/* Subtle gradient glow at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[rgba(0,212,255,0.03)] to-transparent pointer-events-none" />

      <div className="max-w-[600px] mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeSlideUp}
          className="text-center"
        >
          <h2 className="text-h1 text-[#F1F5F9] mb-4">准备好让你的 Agent teamwork 了吗？</h2>
          <p className="text-body text-[#94A3B8] mb-8">开源免费。Docker 一键部署。5 分钟上手。</p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="inline-flex items-center gap-3 px-8 py-4 text-lg font-mono rounded-lg bg-[#00D4FF] text-[#0A0E17] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)] animate-pulse-glow transition-all duration-200 mb-4"
          >
            docker run agentnexus/nexus
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </motion.button>

          <div className="flex items-center justify-center gap-3 mb-6">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm rounded-lg border border-[rgba(148,163,184,0.15)] text-[#F1F5F9] hover:border-[rgba(0,212,255,0.3)] transition-all duration-200"
            >
              查看 GitHub
              <ExternalLink size={14} />
            </a>
          </div>

          <p className="text-caption text-[#64748B]">
            Apache 2.0 协议 · 社区驱动 · 持续更新
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Main Home Page ─── */
export default function Home() {
  return (
    <div>
      <HeroSection />
      <AgentMatrix />
      <Features />
      <WorkflowDemo />
      <ArtifactsSection />
      <TechArchitecture />
      <Testimonials />
      <CTASection />
    </div>
  )
}
