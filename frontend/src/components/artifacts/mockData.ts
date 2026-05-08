import type { FileNode, ArtifactVersion, ReviewFile } from './types'

export const artifactTree: FileNode[] = [
  {
    id: 'root-1',
    name: '2025-01-15_用户注册优化',
    type: 'folder',
    path: '/2025-01-15_用户注册优化',
    expanded: true,
    children: [
      {
        id: 'file-1',
        name: 'README.md',
        type: 'file',
        fileType: 'md',
        agent: 'Claude',
        size: '2.4 KB',
        createdAt: '2025-01-15 09:23',
        modifiedAt: '2025-01-15 14:56',
        path: '/2025-01-15_用户注册优化/README.md',
        language: 'markdown',
        content: `# 用户注册优化

## 概述
本次优化重构了用户注册流程，引入邮箱验证与密码强度检测。

## 变更点
- 新增邮箱验证模块
- 密码强度实时评分
- 验证码防暴力破解

## 依赖
- bcryptjs ^2.4.3
- nodemailer ^6.9.0
- zod ^3.22.0

## 测试覆盖率
| 模块 | 覆盖率 |
|------|--------|
| auth.js | 94% |
| user.ts | 88% |
| validation.py | 91% |`,
        versions: [
          { id: 'v1', version: 'v1.0.0', message: '初始版本', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-15 09:23', changes: { added: 45, removed: 0, modified: 0 } },
          { id: 'v2', version: 'v1.1.0', message: '补充测试覆盖率表格', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-15 14:56', changes: { added: 8, removed: 2, modified: 3 } },
        ],
        comments: [
          { id: 'c1', line: 12, author: 'ReviewBot', avatar: 'RB', content: '建议补充性能基准数据', timestamp: '2025-01-15 10:15' },
        ],
      },
      {
        id: 'folder-1',
        name: 'src',
        type: 'folder',
        path: '/2025-01-15_用户注册优化/src',
        expanded: true,
        children: [
          {
            id: 'file-2',
            name: 'auth.js',
            type: 'file',
            fileType: 'js',
            agent: 'Codex',
            size: '4.1 KB',
            createdAt: '2025-01-15 09:30',
            modifiedAt: '2025-01-15 16:12',
            path: '/2025-01-15_用户注册优化/src/auth.js',
            language: 'javascript',
            content: `import bcrypt from 'bcryptjs'
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(20),
})

export async function registerUser(input) {
  const validated = userSchema.parse(input)
  
  const existing = await db.user.findUnique({
    where: { email: validated.email }
  })
  
  if (existing) {
    throw new Error('User already exists')
  }
  
  const hashed = await bcrypt.hash(validated.password, 12)
  
  const user = await db.user.create({
    data: {
      email: validated.email,
      username: validated.username,
      passwordHash: hashed,
      verified: false,
    }
  })
  
  await sendVerificationEmail(user.email)
  
  return { id: user.id, email: user.email }
}

export async function verifyEmail(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  
  await db.user.update({
    where: { id: payload.userId },
    data: { verified: true }
  })
  
  return { success: true }
}`,
            versions: [
              { id: 'v1', version: 'v1.0.0', message: '初始注册逻辑', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 09:30', changes: { added: 52, removed: 0, modified: 0 } },
              { id: 'v2', version: 'v1.1.0', message: '添加邮箱验证', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 16:12', changes: { added: 18, removed: 3, modified: 8 } },
            ],
            comments: [
              { id: 'c2', line: 8, author: 'SecurityBot', avatar: 'SB', content: '建议增加密码复杂度校验规则', timestamp: '2025-01-15 11:20' },
              { id: 'c3', line: 22, author: 'Claude', avatar: 'CL', content: '这里的错误消息建议前端国际化处理', timestamp: '2025-01-15 13:45' },
            ],
          },
          {
            id: 'file-3',
            name: 'user.ts',
            type: 'file',
            fileType: 'ts',
            agent: 'Codex',
            size: '3.2 KB',
            createdAt: '2025-01-15 09:35',
            modifiedAt: '2025-01-15 15:40',
            path: '/2025-01-15_用户注册优化/src/user.ts',
            language: 'typescript',
            content: `interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

interface CreateUserInput {
  email: string
  username: string
  password: string
}

export class UserService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } })
  }

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    })
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } })
  }
}`,
            versions: [
              { id: 'v1', version: 'v1.0.0', message: '用户服务类', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 09:35', changes: { added: 38, removed: 0, modified: 0 } },
            ],
            comments: [],
          },
          {
            id: 'file-4',
            name: 'validation.py',
            type: 'file',
            fileType: 'py',
            agent: 'Claude',
            size: '1.8 KB',
            createdAt: '2025-01-15 09:40',
            modifiedAt: '2025-01-15 12:20',
            path: '/2025-01-15_用户注册优化/src/validation.py',
            language: 'python',
            content: `import re
import zxcvbn
from typing import Dict, Any

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def check_password_strength(password: str) -> Dict[str, Any]:
    result = zxcvbn(password)
    score = result['score']
    
    levels = ['very weak', 'weak', 'fair', 'strong', 'very strong']
    
    return {
        'score': score,
        'level': levels[score],
        'feedback': result['feedback']['suggestions'],
        'crack_time': result['crack_times_display']['offline_slow_hashing_1e4_per_second']
    }

def sanitize_username(username: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_-]', '', username)[:20]`,
            versions: [
              { id: 'v1', version: 'v1.0.0', message: '验证工具函数', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-15 09:40', changes: { added: 28, removed: 0, modified: 0 } },
              { id: 'v2', version: 'v1.1.0', message: '添加用户名清理', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-15 12:20', changes: { added: 4, removed: 0, modified: 0 } },
            ],
            comments: [],
          },
        ],
      },
      {
        id: 'folder-2',
        name: 'tests',
        type: 'folder',
        path: '/2025-01-15_用户注册优化/tests',
        expanded: false,
        children: [
          {
            id: 'file-5',
            name: 'auth.test.js',
            type: 'file',
            fileType: 'js',
            agent: 'Codex',
            size: '2.9 KB',
            createdAt: '2025-01-15 10:00',
            modifiedAt: '2025-01-15 10:00',
            path: '/2025-01-15_用户注册优化/tests/auth.test.js',
            language: 'javascript',
            content: `import { registerUser, verifyEmail } from '../src/auth'
import { jest } from '@jest/globals'

describe('registerUser', () => {
  it('should create a new user with valid input', async () => {
    const input = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser'
    }
    
    const result = await registerUser(input)
    
    expect(result.id).toBeDefined()
    expect(result.email).toBe(input.email)
  })

  it('should reject duplicate emails', async () => {
    await expect(registerUser({
      email: 'existing@example.com',
      password: 'Pass123!',
      username: 'existing'
    })).rejects.toThrow('User already exists')
  })
})`,
            versions: [
              { id: 'v1', version: 'v1.0.0', message: '注册模块测试', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 10:00', changes: { added: 24, removed: 0, modified: 0 } },
            ],
            comments: [],
          },
          {
            id: 'file-6',
            name: 'e2e.spec.ts',
            type: 'file',
            fileType: 'ts',
            agent: 'Cursor',
            size: '3.5 KB',
            createdAt: '2025-01-15 11:00',
            modifiedAt: '2025-01-15 11:00',
            path: '/2025-01-15_用户注册优化/tests/e2e.spec.ts',
            language: 'typescript',
            content: `import { test, expect } from '@playwright/test'

test.describe('User Registration E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('completes registration flow', async ({ page }) => {
    await page.fill('[name=email]', 'newuser@test.com')
    await page.fill('[name=username]', 'newuser')
    await page.fill('[name=password]', 'StrongPass123!')
    
    await page.click('button[type=submit]')
    
    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('验证邮件已发送')
  })

  test('shows password strength indicator', async ({ page }) => {
    await page.fill('[name=password]', 'weak')
    
    const indicator = page.locator('.strength-indicator')
    await expect(indicator).toHaveClass(/strength-weak/)
  })
})`,
            versions: [
              { id: 'v1', version: 'v1.0.0', message: 'E2E 测试', author: 'Cursor', authorAgent: 'Cursor', timestamp: '2025-01-15 11:00', changes: { added: 30, removed: 0, modified: 0 } },
            ],
            comments: [],
          },
        ],
      },
      {
        id: 'file-7',
        name: 'data.json',
        type: 'file',
        fileType: 'json',
        agent: 'OpenClaw',
        size: '1.2 KB',
        createdAt: '2025-01-15 13:00',
        modifiedAt: '2025-01-15 13:00',
        path: '/2025-01-15_用户注册优化/data.json',
        language: 'json',
        content: `{
  "users": [
    {
      "id": "usr_001",
      "email": "alice@example.com",
      "username": "alice",
      "verified": true,
      "role": "admin"
    },
    {
      "id": "usr_002",
      "email": "bob@example.com",
      "username": "bob",
      "verified": false,
      "role": "user"
    }
  ],
  "settings": {
    "requireVerification": true,
    "passwordMinLength": 8,
    "maxLoginAttempts": 5
  }
}`,
        versions: [
          { id: 'v1', version: 'v1.0.0', message: '种子数据', author: 'OpenClaw', authorAgent: 'OpenClaw', timestamp: '2025-01-15 13:00', changes: { added: 18, removed: 0, modified: 0 } },
        ],
        comments: [],
      },
    ],
  },
  {
    id: 'root-2',
    name: '2025-01-14_数据分析',
    type: 'folder',
    path: '/2025-01-14_数据分析',
    expanded: false,
    children: [
      {
        id: 'file-8',
        name: 'report.md',
        type: 'file',
        fileType: 'md',
        agent: 'Hermes',
        size: '5.6 KB',
        createdAt: '2025-01-14 08:00',
        modifiedAt: '2025-01-14 16:30',
        path: '/2025-01-14_数据分析/report.md',
        language: 'markdown',
        content: `# Q4 数据分析报告

## 执行摘要
第四季度用户增长 34%，营收提升 28%，主要驱动力来自注册流程优化。

## 关键指标
- 新增用户：12,450
- 活跃用户：89,200 (+18%)
- 留存率：62% (+5pp)
- ARPU：$12.5 (+8%)

## 渠道分析
| 渠道 | 新增用户 | 转化率 |
|------|---------|--------|
| 自然搜索 | 4,200 | 4.2% |
| 社交媒体 | 3,800 | 3.8% |
| 付费广告 | 2,900 | 2.1% |
| 邮件营销 | 1,550 | 6.5% |

## 建议
1. 加大邮件营销投入，ROI 最高
2. 优化付费广告落地页
3. 推出推荐奖励计划`,
        versions: [
          { id: 'v1', version: 'v1.0.0', message: '初稿', author: 'Hermes', authorAgent: 'Hermes', timestamp: '2025-01-14 08:00', changes: { added: 35, removed: 0, modified: 0 } },
          { id: 'v2', version: 'v1.1.0', message: '补充渠道分析表格', author: 'Hermes', authorAgent: 'Hermes', timestamp: '2025-01-14 16:30', changes: { added: 8, removed: 1, modified: 2 } },
        ],
        comments: [
          { id: 'c4', line: 18, author: 'Manager', avatar: 'MG', content: 'ARPU 数据需要财务确认', timestamp: '2025-01-14 14:00' },
        ],
      },
      {
        id: 'file-9',
        name: 'chart.png',
        type: 'file',
        fileType: 'png',
        agent: 'OpenClaw',
        size: '128 KB',
        createdAt: '2025-01-14 10:00',
        modifiedAt: '2025-01-14 10:00',
        path: '/2025-01-14_数据分析/chart.png',
        language: 'image',
        content: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        versions: [
          { id: 'v1', version: 'v1.0.0', message: '增长趋势图', author: 'OpenClaw', authorAgent: 'OpenClaw', timestamp: '2025-01-14 10:00', changes: { added: 1, removed: 0, modified: 0 } },
        ],
        comments: [],
      },
      {
        id: 'file-10',
        name: 'dataset.csv',
        type: 'file',
        fileType: 'csv',
        agent: 'Trae',
        size: '45 KB',
        createdAt: '2025-01-14 09:00',
        modifiedAt: '2025-01-14 09:00',
        path: '/2025-01-14_数据分析/dataset.csv',
        language: 'csv',
        content: `date,channel,new_users,conversions,revenue
2024-10-01,organic,145,6,72.5
2024-10-01,paid,89,2,44.5
2024-10-02,organic,132,5,66.0
2024-10-02,social,201,8,100.5
2024-10-03,organic,156,7,78.0
2024-10-03,email,98,12,147.0
2024-10-04,paid,112,3,56.0
2024-10-04,organic,178,9,89.0
2024-10-05,social,234,10,117.0
2024-10-05,email,145,18,217.5`,
        versions: [
          { id: 'v1', version: 'v1.0.0', message: '原始数据集', author: 'Trae', authorAgent: 'Trae', timestamp: '2025-01-14 09:00', changes: { added: 11, removed: 0, modified: 0 } },
        ],
        comments: [],
      },
    ],
  },
  {
    id: 'root-3',
    name: 'config.yaml',
    type: 'file',
    fileType: 'yaml',
    agent: 'Claude',
    size: '0.8 KB',
    createdAt: '2025-01-13 15:00',
    modifiedAt: '2025-01-15 08:30',
    path: '/config.yaml',
    language: 'yaml',
    content: `api:
  version: v2
  port: 8080
  cors:
    enabled: true
    origins:
      - https://app.agentnexus.local
      - https://staging.agentnexus.local

agents:
  claude:
    model: claude-3-5-sonnet
    max_tokens: 4096
    temperature: 0.7
  codex:
    model: gpt-4-codex
    max_tokens: 8192
    temperature: 0.3

logging:
  level: info
  format: json
  output: /var/log/agentnexus.log`,
    versions: [
      { id: 'v1', version: 'v1.0.0', message: '基础配置', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-13 15:00', changes: { added: 22, removed: 0, modified: 0 } },
      { id: 'v2', version: 'v1.1.0', message: '调整 Codex 温度参数', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-15 08:30', changes: { added: 0, removed: 0, modified: 1 } },
    ],
    comments: [
      { id: 'c5', line: 8, author: 'DevOps', avatar: 'DO', content: '生产环境需要限制 origin', timestamp: '2025-01-14 09:00' },
    ],
  },
]

export const reviewFiles: ReviewFile[] = [
  { id: 'r1', name: 'src/auth.js', status: 'needs_change', commentCount: 2, agent: 'Codex' },
  { id: 'r2', name: 'src/user.ts', status: 'approved', commentCount: 0, agent: 'Codex' },
  { id: 'r3', name: 'README.md', status: 'pending', commentCount: 1, agent: 'Claude' },
  { id: 'r4', name: 'config.yaml', status: 'needs_change', commentCount: 1, agent: 'Claude' },
]

export const diffData = [
  { type: 'context' as const, lineNumber: 1, content: 'import bcrypt from \'bcryptjs\'' },
  { type: 'context' as const, lineNumber: 2, content: 'import { z } from \'zod\'' },
  { type: 'add' as const, lineNumber: 3, content: 'import jwt from \'jsonwebtoken\'' },
  { type: 'context' as const, lineNumber: 4, content: '' },
  { type: 'context' as const, lineNumber: 5, content: 'const userSchema = z.object({' },
  { type: 'context' as const, lineNumber: 6, content: '  email: z.string().email(),' },
  { type: 'remove' as const, lineNumber: 7, content: '  password: z.string().min(6),' },
  { type: 'add' as const, lineNumber: 7, content: '  password: z.string().min(8),' },
  { type: 'context' as const, lineNumber: 8, content: '  username: z.string().min(3).max(20),' },
  { type: 'context' as const, lineNumber: 9, content: '})' },
  { type: 'context' as const, lineNumber: 10, content: '' },
  { type: 'add' as const, lineNumber: 11, content: 'export async function verifyEmail(token) {' },
  { type: 'add' as const, lineNumber: 12, content: '  const payload = jwt.verify(token, process.env.JWT_SECRET)' },
  { type: 'add' as const, lineNumber: 13, content: '  await db.user.update({ where: { id: payload.userId }, data: { verified: true } })' },
  { type: 'add' as const, lineNumber: 14, content: '  return { success: true }' },
  { type: 'add' as const, lineNumber: 15, content: '}' },
]

export const allVersions: ArtifactVersion[] = [
  { id: 'ver-1', version: 'v2.1.0', message: '添加邮箱验证流程', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 16:12', changes: { added: 18, removed: 3, modified: 8 } },
  { id: 'ver-2', version: 'v2.0.0', message: '重构注册模块', author: 'Codex', authorAgent: 'Codex', timestamp: '2025-01-15 09:30', changes: { added: 52, removed: 12, modified: 15 } },
  { id: 'ver-3', version: 'v1.3.0', message: '补充 README 测试覆盖率', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-14 14:56', changes: { added: 8, removed: 2, modified: 3 } },
  { id: 'ver-4', version: 'v1.2.0', message: '添加用户名清理函数', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-13 12:20', changes: { added: 4, removed: 0, modified: 0 } },
  { id: 'ver-5', version: 'v1.1.0', message: '更新 Agent 配置参数', author: 'Claude', authorAgent: 'Claude', timestamp: '2025-01-13 08:30', changes: { added: 0, removed: 0, modified: 1 } },
  { id: 'ver-6', version: 'v1.0.0', message: '项目初始化', author: 'OpenClaw', authorAgent: 'OpenClaw', timestamp: '2025-01-12 10:00', changes: { added: 120, removed: 0, modified: 0 } },
]
