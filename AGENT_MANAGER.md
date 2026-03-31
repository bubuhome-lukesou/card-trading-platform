# 🤖 Sub-Agent 管理系统

> **架构设计**: 总管 (Manager) + 专业 Sub-Agent 协作模式

---

## 📋 系统架构

```
┌─────────────────────────────────────────┐
│           用户 (你)                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│     总管 Agent (12bo - 当前 Agent)       │
│  - 理解需求                              │
│  - 任务分配                              │
│  - 质量把控                              │
│  - 整合输出                              │
│  - 回答一般性问题                        │
└─────┬──────────────┬────────────────────┘
      │              │
      ▼              ▼
┌──────────┐  ┌──────────┐
│ code     │  │ (未来其他)│
│ Sub-Agent│  │ Sub-Agent│
│ - 开发   │  │ - ...    │
└──────────┘  └──────────┘
```

---

## 🎯 角色定义

### 1. 总管 Agent (12bo)
**职责：**
- ✅ 理解用户需求
- ✅ 逻辑思考和任务分解
- ✅ 分配任务给合适的 Sub-Agent
- ✅ 审核 Sub-Agent 的工作成果
- ✅ 整合多个 Sub-Agent 的输出
- ✅ 回答一般性问题
- ✅ 保持项目连贯性和一致性

**特质：**
- 全局视角
- 理解用户偏好和工作风格
- 决策能力强
- 沟通协调能力

### 2. Code Sub-Agent (开发者)
**职责：**
- ✅ 前端开发 (Vue/React/HTML/CSS)
- ✅ 后端开发 (NestJS/Node.js/Python)
- ✅ 数据库设计与优化
- ✅ API 开发
- ✅ Bug 修复
- ✅ 代码审查
- ✅ 性能优化
- ✅ 部署和 DevOps

**工作原则：**
1. 接到任务后先理解需求
2. 编写代码前说明技术方案
3. 代码要有注释
4. 完成后提供测试方法
5. 遇到无法解决的问题上报总管

### 3. 其他未来 Sub-Agent (可扩展)
- **test** - 测试专家
- **docs** - 文档专家
- **devops** - 运维专家
- **security** - 安全专家

---

## 🔄 工作流程

### 标准流程
```
1. 用户提出需求
   ↓
2. 总管理解需求并分析
   ↓
3. 总管分解任务
   ↓
4. 总管分配给 Sub-Agent(s)
   ↓
5. Sub-Agent 执行任务
   ↓
6. Sub-Agent 汇报结果
   ↓
7. 总管审核结果
   ↓
8. 总管整合并交付给用户
```

### 示例：开发新功能
```
用户：添加用户个人资料页面

总管分析:
- 需要前端页面 (→ code agent)
- 需要后端 API (→ code agent)
- 需要数据库字段 (→ code agent)

总管分配:
@code 创建用户资料功能：
1. 前端：/profile 页面
2. 后端：GET/PUT /api/profile
3. 数据库：users 表添加字段

Code Agent 执行:
- 创建组件
- 编写 API
- 更新数据库

总管审核:
- 检查代码质量
- 验证功能完整性
- 确保符合项目规范

总管交付:
✅ 用户资料功能完成
- 前端：/profile
- 后端：/api/profile
- 测试方法：...
```

---

## 🛠️ 实现方法

### 1. 创建 Sub-Agent

```bash
# 通过 OpenClaw sessions_spawn 创建
sessions_spawn(
  task="你是专业的全栈开发 Agent...",
  label="code",
  runtime="subagent",
  mode="session",
  thread=true,
  cleanup="keep"
)
```

### 2. 任务分配

```typescript
// 总管使用 sessions_send 分配任务
sessions_send(
  sessionKey: "code-agent-key",
  message: `
任务：创建用户登录功能

需求:
- 用户名/密码登录
- JWT Token 认证
- 记住登录状态

技术栈:
- 前端：Vue 3 + TypeScript
- 后端：NestJS
- 数据库：MySQL

请提供:
1. 技术方案
2. 代码实现
3. 测试方法
`
)
```

### 3. 结果接收

```typescript
// Sub-Agent 完成后自动通知
// 总管通过 sessions_history 查看结果
sessions_history(
  sessionKey: "code-agent-key",
  limit: 50
)
```

### 4. 状态管理

```typescript
// 查看 Sub-Agent 状态
subagents(action="list")

// 管理 Sub-Agent
subagents(action="steer", target="code", message="...")
subagents(action="kill", target="code")
```

---

## 📝 配置文件

### 创建 Sub-Agent 配置

```yaml
# ~/.openclaw/subagents.yaml
subagents:
  code:
    label: "code"
    role: "全栈开发工程师"
    runtime: "subagent"
    mode: "session"
    thread: true
    cleanup: "keep"
    task: |
      你是一个专业的全栈开发 Agent...
    
  test:
    label: "test"
    role: "测试专家"
    runtime: "subagent"
    # ...
```

### 总管工作流配置

```yaml
# ~/.openclaw/manager.yaml
manager:
  name: "12bo"
  role: "总管"
  responsibilities:
    - "需求分析"
    - "任务分配"
    - "质量审核"
    - "成果整合"
  
  subagents:
    - "code"
    - "test"
    - "docs"
  
  workflow:
    - "接收需求"
    - "分析分解"
    - "分配任务"
    - "审核结果"
    - "整合交付"
```

---

## 💬 沟通协议

### 总管 → Sub-Agent

```
任务分配格式:

【任务】简要描述
【优先级】高/中/低
【截止时间】可选
【需求详情】
- 功能点 1
- 功能点 2
【技术要求】
- 技术栈
- 规范
【交付物】
- 代码
- 文档
- 测试
```

### Sub-Agent → 总管

```
汇报格式:

【状态】进行中/已完成/受阻
【进度】XX%
【已完成】
- 项目 1
- 项目 2
【遇到问题】
- 问题描述
- 已尝试方案
【需要支持】
- 具体需求
【下一步计划】
- ...
```

---

## 🎯 当前项目交接计划

### Phase 2 已完成工作
- ✅ 用户认证系统
- ✅ 卖家后台
- ✅ 管理员后台
- ✅ 实时竞价 WebSocket
- ✅ 新界面设计

### 交接给 Code Agent 的上下文

```markdown
# 项目上下文

## 项目信息
- 名称：卡牌拍卖平台
- 技术栈：Vue 3 + NestJS + MySQL
- 部署：阿里云 (47.242.110.155)
- 域名：card.aishoper.co

## 当前状态
- 版本：v2.0.0 (Phase 2 Complete)
- 分支：develop
- 最新提交：f4d8a48

## 已完成功能
1. 用户认证 (JWT)
2. 拍卖 CRUD
3. 卖家后台
4. 管理员后台
5. WebSocket 实时竞价
6. 响应式界面

## 待开发功能 (Phase 3)
1. 支付集成
2. 邮件通知
3. 移动端优化
4. 性能优化

## 代码结构
backend/
  - src/modules/auth/
  - src/modules/auction/
  - src/modules/seller/
  - src/modules/admin/
  
frontend/
  - src/pages/
  - src/components/
  - src/services/

## 开发规范
- TypeScript 严格模式
- ESLint + Prettier
- Git 提交规范
- API 文档要求
```

---

## 🚀 实施步骤

### 步骤 1: 创建 Code Sub-Agent
```
1. 准备 Sub-Agent 的系统提示词
2. 调用 sessions_spawn 创建
3. 验证 Sub-Agent 正常运行
4. 保存 Sub-Agent 的 session key
```

### 步骤 2: 交接上下文
```
1. 整理项目文档
2. 说明当前进度
3. 交代待办事项
4. 说明开发规范
```

### 步骤 3: 建立工作流程
```
1. 定义任务分配格式
2. 建立汇报机制
3. 设置质量检查点
4. 确定沟通频率
```

### 步骤 4: 开始协作
```
1. 总管接收用户需求
2. 总管分析并分配任务
3. Code Agent 执行开发
4. 总管审核并交付
```

---

## 📊 优势

### 对用户
- ✅ 更专业的开发质量
- ✅ 更快的响应速度
- ✅ 并行处理多个任务
- ✅ 总管理解用户偏好

### 对系统
- ✅ 职责分离
- ✅ 专业分工
- ✅ 易于扩展
- ✅ 降低单点故障

### 对开发
- ✅ Code Agent 专注开发
- ✅ 总管专注协调
- ✅ 各自发挥优势
- ✅ 提高整体效率

---

## ⚠️ 注意事项

1. **上下文同步**: 确保 Sub-Agent 了解项目背景
2. **质量控制**: 总管需要审核所有输出
3. **沟通效率**: 避免过多的中间传递
4. **错误处理**: Sub-Agent 遇到问题及时上报
5. **版本管理**: 保持代码版本一致性

---

> **下一步**: 创建 Code Sub-Agent 并开始交接工作
