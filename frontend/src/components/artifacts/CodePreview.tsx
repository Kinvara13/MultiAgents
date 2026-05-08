import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'

interface CodePreviewProps {
  content: string
  language: string
  fileName: string
}

const languageMap: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  json: 'json',
  yaml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
  css: 'css',
  html: 'html',
  csv: 'csv',
}

const prismCustomCSS = `
  .prism-custom .token.comment,
  .prism-custom .token.prolog,
  .prism-custom .token.doctype,
  .prism-custom .token.cdata {
    color: #64748B;
  }
  .prism-custom .token.punctuation {
    color: #94A3B8;
  }
  .prism-custom .token.property,
  .prism-custom .token.tag,
  .prism-custom .token.constant,
  .prism-custom .token.symbol,
  .prism-custom .token.deleted {
    color: #EF4444;
  }
  .prism-custom .token.boolean,
  .prism-custom .token.number {
    color: #F59E0B;
  }
  .prism-custom .token.selector,
  .prism-custom .token.attr-name,
  .prism-custom .token.string,
  .prism-custom .token.char,
  .prism-custom .token.builtin,
  .prism-custom .token.inserted {
    color: #10B981;
  }
  .prism-custom .token.operator,
  .prism-custom .token.entity,
  .prism-custom .token.url,
  .prism-custom .language-css .token.string,
  .prism-custom .style .token.string {
    color: #94A3B8;
  }
  .prism-custom .token.atrule,
  .prism-custom .token.attr-value,
  .prism-custom .token.keyword {
    color: #8B5CF6;
  }
  .prism-custom .token.function,
  .prism-custom .token.class-name {
    color: #00D4FF;
  }
  .prism-custom .token.regex,
  .prism-custom .token.important,
  .prism-custom .token.variable {
    color: #F59E0B;
  }
  .prism-custom .token.important,
  .prism-custom .token.bold {
    font-weight: bold;
  }
  .prism-custom .token.italic {
    font-style: italic;
  }
  .prism-custom .token.entity {
    cursor: help;
  }
`

export default function CodePreview({ content, language, fileName }: CodePreviewProps) {
  const highlighted = useMemo(() => {
    const prismLang = languageMap[language] || 'javascript'
    if (Prism.languages[prismLang]) {
      return Prism.highlight(content, Prism.languages[prismLang]!, prismLang)
    }
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }, [content, language])

  const lines = content.split('\n')

  return (
    <div className="flex flex-col h-full">
      <style>{prismCustomCSS}</style>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111827] border-b border-[rgba(148,163,184,0.08)]">
        <span className="text-xs text-[#64748B] font-mono">{fileName}</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#1A2234] rounded text-[#94A3B8]">
          {language}
        </span>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto bg-[#0D1117]">
        <div className="flex min-h-full">
          {/* Line Numbers */}
          <div className="flex-shrink-0 py-4 px-3 text-right select-none bg-[#0D1117] border-r border-[rgba(148,163,184,0.06)]">
            {lines.map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.008, duration: 0.15 }}
                className="text-[12px] text-[#64748B] font-mono leading-[1.6] h-[20.8px]"
              >
                {i + 1}
              </motion.div>
            ))}
          </div>

          {/* Code Content */}
          <div className="flex-1 py-4 px-4 overflow-x-auto">
            <pre className="text-[13px] font-mono leading-[1.6] whitespace-pre">
              <code
                dangerouslySetInnerHTML={{ __html: highlighted }}
                className="prism-custom"
              />
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
