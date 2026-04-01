# 🤖 多 Agent 系统配置文件

> **版本**: 1.0.0  
> **创建日期**: 2026-04-01  
> **总管**: 12bo

---

## 📋 目录结构

```
MULTI_AGENT_CONFIG/
├── 00_README.md                 # 本文件
├── 01_agent_configs.yaml        # Agent 配置文件
├── 02_workflow_rules.yaml       # 工作流规则
├── 03_coordination_protocol.md  # 协调协议
├── prompts/
│   ├── 00_manager_12bo.md       # 总管提示词
│   ├── 01_code_agent.md         # 软件工程师
│   ├── 02_data_agent.md         # 数据分析师
│   ├── 03_sec_agent.md          # 秘书
│   └── 04_media_agent.md        # 内容创作
└── examples/
    └── usage_examples.md        # 使用示例
```

---

## 🎯 Agent 团队

| 角色 | 名称 | 模型 | 职责 |
|------|------|------|------|
| **总管** | 12bo | Qwen3.5 | 协调、策略、审核 |
| **软件工程师** | Code Agent | Qwen3.5-Coder | Web/App 开发 |
| **数据分析师** | Data Agent | GPT-4 | 财报、股票、卡牌分析 |
| **秘书** | Sec Agent | Claude-3.5-Sonnet | 日程、会议、提醒 |
| **内容创作** | Media Agent | Gemini-2.0 | 视频、文章、设计 |

---

## 🚀 快速开始

### 1. 启动 Agent
```bash
# 启动总管
openclaw agent spawn --label manager --config prompts/00_manager_12bo.md

# 启动各专业 Agent
openclaw agent spawn --label code --config prompts/01_code_agent.md --model ollama/qwen3.5-coder
openclaw agent spawn --label data --config prompts/02_data_agent.md --model openai/gpt-4
openclaw agent spawn --label sec --config prompts/03_sec_agent.md --model anthropic/claude-3.5-sonnet
openclaw agent spawn --label media --config prompts/04_media_agent.md --model google/gemini-2.0
```

### 2. 验证运行
```bash
# 查看所有 Agent 状态
openclaw agent list

# 测试单个 Agent
openclaw agent send --label code --message "你好，测试连接"
```

### 3. 开始工作
```bash
# 通过总管分配任务
openclaw agent send --label manager --message "开发一个电商网站"
```

---

## 📖 详细文档

- **[Agent 配置](01_agent_configs.yaml)** - 每个 Agent 的详细配置
- **[工作流规则](02_workflow_rules.yaml)** - 任务分配和协调规则
- **[协调协议](03_coordination_protocol.md)** - Agent 间通信协议
- **[系统提示词](prompts/)** - 每个角色的详细提示词
- **[使用示例](examples/usage_examples.md)** - 实际使用案例

---

## 💡 使用建议

1. **始终通过总管分配任务** - 保持工作流清晰
2. **明确任务优先级** - 高/中/低
3. **提供足够上下文** - 帮助 Agent 理解需求
4. **定期检查进度** - 使用状态查询命令
5. **及时反馈结果** - 帮助 Agent 改进

---

## 🔧 维护

- 每周检查 Agent 运行状态
- 每月审查工作流效率
- 根据实际需求调整配置
- 更新系统提示词优化表现

---

> **下一步**: 查看 [Agent 配置文件](01_agent_configs.yaml) 开始部署
