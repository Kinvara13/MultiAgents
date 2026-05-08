#!/bin/bash
# AgentNexus 一键推送脚本
# 用法: GITHUB_TOKEN=ghp_xxx bash push.sh

set -e

REPO="https://github.com/Kinvara13/MultiAgents.git"
TOKEN="${GITHUB_TOKEN:-}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 请提供 GitHub Token${NC}"
    echo ""
    echo "获取方式:"
    echo "  1. 打开 https://github.com/settings/tokens/new"
    echo "  2. Token name 填: AgentNexus"
    echo "  3. 勾选 'repo' 权限 (完整仓库访问)"
    echo "  4. 点击 Generate token"
    echo "  5. 复制生成的 Token"
    echo ""
    echo "然后运行:"
    echo -e "  ${GREEN}GITHUB_TOKEN=ghp_xxxxxxxx bash push.sh${NC}"
    echo ""
    read -sp "或者现在粘贴 Token (不会显示): " TOKEN
    echo ""
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Token 不能为空${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📦 AgentNexus 推送开始...${NC}"

# 进入项目目录
cd "$(dirname "$0")"

# 检查 git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 请先安装 Git${NC}"
    exit 1
fi

# 初始化 git (如果不存在)
if [ ! -d .git ]; then
    git init
    git config user.email "agentnexus@dev.local"
    git config user.name "AgentNexus"
fi

# 安全目录设置
git config --global --add safe.directory "$(pwd)" 2>/dev/null || true

echo -e "${BLUE}📝 添加文件...${NC}"
git add -A

echo -e "${BLUE}💾 提交代码...${NC}"
git commit -m "AgentNexus v1.0 - Multi-Agent Orchestration Platform

Frontend:
- React 19 + TypeScript + Tailwind CSS + shadcn/ui
- 6 pages: Home, Dashboard, Agents, Workflows, Artifacts, Settings
- Visual workflow builder with React Flow
- Real-time API integration via custom hooks
- Framer Motion animations

Backend:
- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL + Redis + MinIO
- 6 Agent adapters: Claude, Codex, Trae, OpenClaw, Hermes, Cursor
- Workflow engine with DAG execution + state machine
- A2A messaging + MCP protocol support
- WebSocket real-time updates

Documentation:
- Architecture design (workflow control, agent communication, state management)
- Implementation plan (3-week roadmap)
- Operation guide" 2>/dev/null || echo "Nothing to commit"

echo -e "${BLUE}🔗 关联远程仓库...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "https://${TOKEN}@github.com/Kinvara13/MultiAgents.git"

echo -e "${BLUE}🚀 推送到 GitHub...${NC}"
git branch -M main
if git push -u origin main --force; then
    echo -e "${GREEN}✅ 推送成功！${NC}"
    echo ""
    echo -e "${GREEN}📎 仓库地址: https://github.com/Kinvara13/MultiAgents${NC}"
    echo ""
    echo -e "${BLUE}🛡️ 安全提醒: 推送完成后，建议删除 Token${NC}"
    echo "   https://github.com/settings/tokens"
else
    echo -e "${RED}❌ 推送失败，可能原因:${NC}"
    echo "   1. Token 已过期或权限不足 (需要 repo 权限)"
    echo "   2. 网络连接问题"
    echo "   3. 仓库不存在或没有写入权限"
    echo ""
    echo -e "${BLUE}请检查后重试${NC}"
    exit 1
fi
