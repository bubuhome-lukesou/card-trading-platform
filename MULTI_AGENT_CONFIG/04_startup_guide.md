# 🚀 多 Agent 系统启动指南

> **快速开始**: 5 分钟完成配置并启动

---

## 📋 启动清单

- [ ] 1. 确认配置文件就绪
- [ ] 2. 启动各 Agent
- [ ] 3. 验证连接
- [ ] 4. 测试任务
- [ ] 5. 开始工作

---

## 步骤 1: 确认配置文件

所有配置文件已准备就绪：

```
MULTI_AGENT_CONFIG/
├── 00_README.md                 ✓
├── 01_agent_configs.yaml        ✓
├── 02_workflow_rules.yaml       ✓
├── 03_coordination_protocol.md  ✓
├── 04_startup_guide.md          ✓
└── prompts/
    ├── 00_manager_12bo.md       ✓
    ├── 01_code_agent.md         ✓
    ├── 02_data_agent.md         ✓
    ├── 03_sec_agent.md          ✓
    └── 04_media_agent.md        ✓
```

**位置**: `/home/bubu/.openclaw/workspace/MULTI_AGENT_CONFIG/`

---

## 步骤 2: 启动 Agent

### 方案 A: 使用 OpenClaw CLI (推荐)

```bash
# 1. 启动总管 (12bo)
openclaw agent spawn \
  --label manager \
  --task "prompts/00_manager_12bo.md" \
  --model ollama/qwen3.5 \
  --thread

# 2. 启动 Code Agent
openclaw agent spawn \
  --label code \
  --task "prompts/01_code_agent.md" \
  --model ollama/qwen3.5-coder \
  --thread

# 3. 启动 Data Agent
openclaw agent spawn \
  --label data \
  --task "prompts/02_data_agent.md" \
  --model openai/gpt-4 \
  --thread

# 4. 启动 Sec Agent
openclaw agent spawn \
  --label sec \
  --task "prompts/03_sec_agent.md" \
  --model anthropic/claude-3.5-sonnet \
  --thread

# 5. 启动 Media Agent
openclaw agent spawn \
  --label media \
  --task "prompts/04_media_agent.md" \
  --model google/gemini-2.0 \
  --thread
```

### 方案 B: 手动配置 (备选)

如果 CLI 不可用，创建启动脚本：

```bash
#!/bin/bash
# start_agents.sh

# 设置工作目录
cd /home/bubu/.openclaw/workspace

# 启动总管
echo "启动总管 (12bo)..."
openclaw sessions_spawn \
  --runtime subagent \
  --label manager \
  --mode session \
  --thread true \
  --task "$(cat MULTI_AGENT_CONFIG/prompts/00_manager_12bo.md)"

# 启动 Code Agent
echo "启动 Code Agent..."
openclaw sessions_spawn \
  --runtime subagent \
  --label code \
  --mode session \
  --thread true \
  --task "$(cat MULTI_AGENT_CONFIG/prompts/01_code_agent.md)"

# ... 其他 Agent 类似
```

---

## 步骤 3: 验证连接

### 检查 Agent 状态

```bash
# 查看所有运行中的 Agent
openclaw agent list

# 或查看会话列表
openclaw sessions list --kinds subagent
```

**预期输出**:
```
┌─────────┬─────────────┬──────────┬─────────┐
│ Label   │ Status      │ Model    │ Since   │
├─────────┼─────────────┼──────────┼─────────┤
│ manager │ running     │ qwen3.5  │ 2 min   │
│ code    │ running     │ qwen3.5-c│ 2 min   │
│ data    │ running     │ gpt-4    │ 2 min   │
│ sec     │ running     │ claude   │ 2 min   │
│ media   │ running     │ gemini   │ 2 min   │
└─────────┴─────────────┴──────────┴─────────┘
```

### 测试连接

```bash
# 测试总管
openclaw agent send --label manager --message "你好，测试连接"

# 测试 Code Agent
openclaw agent send --label code --message "你好，准备就绪吗？"

# ... 测试其他 Agent
```

**预期响应**:
```
【manager】你好！我是 12bo，多 Agent 系统总管。
         已准备就绪，随时为你服务！

【code】你好！Code Agent 已就绪。
       随时可以开始开发工作！
```

---

## 步骤 4: 测试任务

### 测试 1: 简单任务分配

```bash
# 通过总管分配任务
openclaw agent send --label manager --message "
帮我分析一下腾讯控股的最新财报

要求:
1. 分析最新季度数据
2. 对比去年同期
3. 给出投资建议
"
```

**预期流程**:
```
总管 → Data Agent: 分配分析任务
Data Agent → 总管：提交分析报告
总管 → 用户：交付完整报告
```

### 测试 2: 多 Agent 协作

```bash
openclaw agent send --label manager --message "
开发一个股票价格追踪网页

需求:
1. 显示实时股价
2. 有价格图表
3. 界面美观
"
```

**预期流程**:
```
总管分析:
- 需要开发页面 → Code Agent
- 需要数据 → Data Agent
- 需要 UI 设计 → Media Agent

协调执行:
1. Media Agent 设计 UI
2. Data Agent 准备数据 API
3. Code Agent 开发页面
4. 总管整合测试
5. 交付完整产品
```

---

## 步骤 5: 开始工作

### 日常工作流程

```
每天开始:
1. Sec Agent 发送今日日程
2. 总管确认当天任务
3. 分配任务给各 Agent
4. 定期跟踪进度
5. 整合交付成果

每天结束:
1. 各 Agent 汇报当日完成
2. 总管整理日报
3. Sec Agent 设置明日提醒
4. 归档当日工作
```

### 任务示例

#### 场景 1: 投资分析
```
你："分析腾讯和阿里巴巴的财报，做个对比"

总管 → Data Agent: 分析两家公司财报
Data Agent → 总管：提交对比报告
总管 → 你：交付完整分析报告
```

#### 场景 2: 开发功能
```
你："网站需要添加用户个人资料页面"

总管 → Code Agent: 开发页面和 API
总管 → Media Agent: 设计 UI
Code + Media → 总管：完成功能
总管 → 你：交付功能 + 使用说明
```

#### 场景 3: 内容创作
```
你："做个视频介绍我们的平台"

总管 → Media Agent: 制作视频
Media Agent → 总管：提交视频
总管 → 你：交付视频 + 发布建议
```

---

## 🛠️ 故障排查

### 问题 1: Agent 无法启动

**症状**: 启动命令报错

**解决**:
```bash
# 1. 检查 OpenClaw 状态
openclaw status

# 2. 检查 Gateway
openclaw gateway status

# 3. 重启 Gateway
openclaw gateway restart

# 4. 重试启动
openclaw agent spawn ...
```

### 问题 2: Agent 无响应

**症状**: 发送消息后无回复

**解决**:
```bash
# 1. 检查 Agent 状态
openclaw agent list

# 2. 查看 Agent 日志
openclaw agent logs --label code

# 3. 重启 Agent
openclaw agent kill --label code
openclaw agent spawn --label code ...

# 4. 重新发送任务
```

### 问题 3: 任务分配错误

**症状**: 任务分配给了错误的 Agent

**解决**:
```bash
# 1. 检查工作流规则
cat MULTI_AGENT_CONFIG/02_workflow_rules.yaml

# 2. 调整关键词匹配
# 编辑 workflow_rules.yaml 的 task_routing 部分

# 3. 手动重新分配
openclaw agent send --label code --message "
【重新分配】任务：xxx
原分配错误，请处理此任务
"
```

---

## 📊 性能优化

### 1. 模型选择优化

| Agent | 推荐模型 | 成本/月 | 性能 |
|-------|---------|--------|------|
| Code | Qwen3.5-Coder | $10 | ⭐⭐⭐⭐⭐ |
| Data | GPT-4 | $50 | ⭐⭐⭐⭐⭐ |
| Sec | Claude-3.5-Sonnet | $30 | ⭐⭐⭐⭐ |
| Media | Gemini-2.0 | $20 | ⭐⭐⭐⭐ |

### 2. 并发控制

```yaml
# 在 agent_configs.yaml 中设置
max_concurrent_tasks:
  code: 3
  data: 2
  sec: 5
  media: 2
```

### 3. 缓存策略

```yaml
# 启用结果缓存
cache:
  enabled: true
  ttl_hours: 24
  max_size_mb: 1024
```

---

## 🎯 最佳实践

### 1. 任务描述清晰
```
❌ 差："做个网站"
✅ 好："开发一个电商网站，包含商品列表、购物车、支付功能，使用 Vue 3 + Node.js，下周完成"
```

### 2. 优先级明确
```
【优先级】高 - 今天必须完成
【优先级】中 - 本周完成
【优先级】低 - 有空再做
```

### 3. 及时反馈
```
任务完成后立即反馈:
- 满意：确认 + 感谢
- 不满意：说明问题 + 要求修改
- 部分满意：肯定优点 + 指出改进点
```

### 4. 定期回顾
```
每周:
- 检查任务完成情况
- 评估 Agent 表现
- 优化工作流程

每月:
- 总结整体效果
- 调整资源配置
- 更新系统配置
```

---

## 📈 进阶使用

### 1. 自定义工作流

编辑 `02_workflow_rules.yaml` 添加自定义任务路由:

```yaml
task_routing:
  my_custom_task:
    keywords:
      - "我的特殊任务"
    assign_to: "code"
    collaboration:
      - "data"
      - "media"
```

### 2. 添加新 Agent

```bash
# 1. 创建提示词
cat > prompts/05_new_agent.md << 'EOF'
# New Agent - 角色名称

## 职责
...
EOF

# 2. 添加到配置
# 编辑 01_agent_configs.yaml

# 3. 启动 Agent
openclaw agent spawn --label new --task prompts/05_new_agent.md
```

### 3. 自动化工作流

```yaml
# 创建自动化规则
automation:
  - trigger: "每天 9:00"
    action: "sec 发送晨报"
  
  - trigger: "每天 18:00"
    action: "各 Agent 提交日报"
  
  - trigger: "每周一 9:00"
    action: "总管提交周报"
```

---

## 🎓 培训资料

### 新用户入门
1. 阅读 `00_README.md` - 了解系统架构
2. 阅读本指南 - 学习启动和使用
3. 阅读 `03_coordination_protocol.md` - 了解通信协议
4. 开始实际使用 - 从简单任务开始

### Agent 调优
1. 收集使用反馈
2. 分析任务日志
3. 优化系统提示词
4. 调整工作流规则
5. 更新模型配置

---

## 📞 支持

### 文档
- 系统架构：`00_README.md`
- 配置文件：`01_agent_configs.yaml`
- 工作流：`02_workflow_rules.yaml`
- 通信协议：`03_coordination_protocol.md`
- 系统提示词：`prompts/` 目录

### 问题反馈
遇到问题时：
1. 检查故障排查章节
2. 查看日志文件
3. 联系系统维护者
4. 提交 Issue

---

> **准备就绪！** 现在可以开始使用多 Agent 系统了！🚀
> 
> **第一个任务**: 试试让总管帮你做件事吧！
> 
> ```bash
> openclaw agent send --label manager --message "你好，开始工作！"
> ```
