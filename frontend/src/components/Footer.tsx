import { Github, MessageCircle, BookOpen, Mail } from 'lucide-react'

function NexusLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="url(#footerLogoGrad)" strokeWidth="2" fill="none" />
      <circle cx="16" cy="16" r="3" fill="#00D4FF" />
    </svg>
  )
}

const footerLinks = {
  产品: ['功能', '路线图', '更新日志', '定价'],
  文档: ['快速开始', 'API 文档', '部署指南', '常见问题'],
  社区: ['GitHub', 'Discord', '讨论区', '贡献指南'],
  公司: ['关于', '博客', '招聘', '联系我们'],
}

export default function Footer() {
  return (
    <footer className="bg-[#111827] border-t border-[rgba(148,163,184,0.08)]">
      <div className="max-w-[1440px] mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[13px] font-semibold text-[#F1F5F9] uppercase tracking-[0.05em] mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13px] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[rgba(148,163,184,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <NexusLogo size={20} />
            <span className="text-[13px] text-[#64748B]">
              © 2025 AgentNexus. Open source under Apache 2.0.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-[#64748B] hover:text-[#F1F5F9] transition-colors duration-200">
              <Github size={18} />
            </a>
            <a href="#" className="text-[#64748B] hover:text-[#F1F5F9] transition-colors duration-200">
              <MessageCircle size={18} />
            </a>
            <a href="#" className="text-[#64748B] hover:text-[#F1F5F9] transition-colors duration-200">
              <BookOpen size={18} />
            </a>
            <a href="#" className="text-[#64748B] hover:text-[#F1F5F9] transition-colors duration-200">
              <Mail size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
