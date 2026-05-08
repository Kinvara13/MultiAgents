-- =============================================================================
-- AgentNexus Database Initialization Script
-- =============================================================================
-- This script initializes the database with default agents and configurations.
-- Run this after the database schema has been created by SQLAlchemy migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Default Agents
-- -----------------------------------------------------------------------------
-- Insert the six core agents that ship with AgentNexus.
-- Each agent has a unique slug, type (local/remote), status, endpoint,
-- capabilities array, and UI configuration (icon, color).
-- -----------------------------------------------------------------------------

INSERT INTO agents (
    id,
    name,
    slug,
    type,
    status,
    endpoint,
    capabilities,
    description,
    icon,
    color,
    total_tasks,
    success_rate
) VALUES
(
    gen_random_uuid(),
    'Claude',
    'claude',
    'local',
    'online',
    'http://localhost:8080',
    '{"code_generation","code_review","writing","reasoning"}',
    'Anthropic Claude - 通用AI助手',
    'MessageSquare',
    '#3B82F6',
    156,
    94.5
),
(
    gen_random_uuid(),
    'Codex',
    'codex',
    'local',
    'online',
    'http://localhost:8081',
    '{"code_completion","code_refactoring","code_review","test_generation"}',
    'OpenAI Codex - 代码专家',
    'Code',
    '#00D4FF',
    203,
    91.2
),
(
    gen_random_uuid(),
    'Trae',
    'trae',
    'local',
    'offline',
    'http://localhost:8082',
    '{"terminal_operation","file_editing","debugging","git_operations"}',
    'Trae - AI编程助手',
    'Terminal',
    '#10B981',
    89,
    88.7
),
(
    gen_random_uuid(),
    'OpenClaw',
    'openclaw',
    'remote',
    'online',
    'http://localhost:3001',
    '{"web_scraping","data_analysis","automation"}',
    'OpenClaw - 远程自动化Agent',
    'Zap',
    '#8B5CF6',
    134,
    96.1
),
(
    gen_random_uuid(),
    'Hermes',
    'hermes',
    'remote',
    'online',
    'http://localhost:3002',
    '{"message_routing","notifications","integration"}',
    'Hermes - 消息路由Agent',
    'Mail',
    '#F59E0B',
    78,
    93.3
),
(
    gen_random_uuid(),
    'Cursor',
    'cursor',
    'local',
    'online',
    'http://localhost:8083',
    '{"ai_programming","code_generation","smart_suggestions"}',
    'Cursor - AI编程IDE',
    'MousePointer',
    '#8B5CF6',
    167,
    92.8
);

-- -----------------------------------------------------------------------------
-- Verify Insertions
-- -----------------------------------------------------------------------------
SELECT 'Agents inserted: ' || COUNT(*) AS init_result FROM agents;
