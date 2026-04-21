# Card Quest - 卡牌交易平台规格说明书

## 1. 项目概述

**项目名称:** Card Quest  
**类型:** 现代化卡牌交易平台 (B2C)  
**核心功能:** 拍卖 + 销售双模式卡牌交易  
**目标用户:** 卡牌收藏爱好者、交易商

---

## 2. 技术栈

### 前端
- **框架:** Vue 3 + Composition API
- **构建工具:** Vite
- **状态管理:** Pinia
- **国际化:** Vue I18n
- **路由:** Vue Router 4
- **HTTP客户端:** Axios
- **UI组件:** 自定义组件 (现代动漫风格)

### 后端
- **框架:** NestJS (Node.js)
- **语言:** TypeScript
- **ORM:** TypeORM
- **数据库:** MySQL
- **缓存:** Redis
- **认证:** JWT + Passport
- **验证:** class-validator

### 部署
- **服务器:** 阿里云 47.242.110.155
- **路径:** /var/www/card-trading-platform
- **域名:** card.aishoper.co

---

## 3. 功能需求

### 3.1 用户系统

| 功能 | 描述 |
|------|------|
| 注册/登录 | 邮箱 + 密码 |
| 多角色 | User / Seller / Admin |
| 商家申请 | 用户申请成为商家 |
| 个人设置 | 头像、密码、通知设置 |

### 3.2 商品系统

| 功能 | 描述 |
|------|------|
| 商品列表 | 筛选、搜索、分页 |
| 商品详情 | 多图片、描述(双语)、规格 |
| 商品发布 | 商家发布商品 |
| 商品管理 | 编辑、下架、删除 |

### 3.3 拍卖系统

| 功能 | 描述 |
|------|------|
| 拍卖列表 | 进行中、即将开始、已结束 |
| 实时出价 | WebSocket 实时更新 |
| 延时机制 | 最后5分钟出价+5分钟 |
| 拍卖结束 | 自动成交、通知 |

### 3.4 销售系统

| 功能 | 描述 |
|------|------|
| 一口价 | 直接购买 |
| 购物车 | 加入购物车 |
| 订单管理 | 订单状态追踪 |
| 评价系统 | 交易后互评 |

### 3.5 通知系统

| 渠道 | 状态 |
|------|------|
| 邮件 | API预留 |
| 微信 | API预留 |

---

## 4. 数据库设计

### 用户表 (users)
```sql
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE
- password_hash: VARCHAR(255)
- role: ENUM('user', 'seller', 'admin')
- nickname: VARCHAR(100)
- avatar: VARCHAR(500)
- wechat_openid: VARCHAR(100)
- email_verified: BOOLEAN
- wechat_notifications: BOOLEAN DEFAULT true
- email_notifications: BOOLEAN DEFAULT true
- status: ENUM('active', 'suspended') DEFAULT 'active'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 商品表 (products)
```sql
- id: UUID (PK)
- seller_id: UUID (FK → users)
- title_en: VARCHAR(255)
- title_zh: VARCHAR(255)
- description_en: TEXT
- description_zh: TEXT
- category: VARCHAR(50)
- brand: VARCHAR(100)
- series: VARCHAR(100)
- rarity: VARCHAR(20)
- `condition`: VARCHAR(20)
- price: DECIMAL(10,2)
- currency: VARCHAR(3) DEFAULT 'HKD'
- images: JSON
- status: ENUM('draft', 'active', 'sold', 'removed')
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 拍卖表 (auctions)
```sql
- id: UUID (PK)
- product_id: UUID (FK → products)
- seller_id: UUID (FK → users)
- starting_price: DECIMAL(10,2)
- current_price: DECIMAL(10,2)
- reserve_price: DECIMAL(10,2)
- bid_increment: DECIMAL(10,2) DEFAULT 10
- start_time: TIMESTAMP
- end_time: TIMESTAMP
- status: ENUM('pending', 'active', 'ended', 'cancelled')
- winner_id: UUID (FK → users)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 订单表 (orders)
```sql
- id: UUID (PK)
- order_number: VARCHAR(50) UNIQUE
- buyer_id: UUID (FK → users)
- seller_id: UUID (FK → users)
- type: ENUM('purchase', 'auction')
- product_id: UUID (FK → products)
- auction_id: UUID (FK → auctions)
- amount: DECIMAL(10,2)
- status: ENUM('pending_paid', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')
- shipping_address: JSON
- paid_at: TIMESTAMP
- shipped_at: TIMESTAMP
- delivered_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## 5. 页面结构

### 公开页面
- 首页 /
- 商品列表 /marketplace
- 商品详情 /product/:id
- 拍卖列表 /auctions
- 拍卖详情 /auction/:id
- 登录 /login
- 注册 /register

### 用户页面
- 用户中心 /user
- 我的订单 /user/orders
- 我的收藏 /user/favorites
- 钱包 /user/wallet
- 设置 /user/settings

### 商家页面
- 商家后台 /seller
- 商品管理 /seller/products
- 拍卖管理 /seller/auctions
- 订单管理 /seller/orders
- 收益管理 /seller/earnings

### 管理员页面
- 管理后台 /admin
- 用户管理 /admin/users
- 商家管理 /admin/sellers
- 商品审核 /admin/products
- 拍卖监控 /admin/auctions
- 平台设置 /admin/settings

---

## 6. 设计规范

### 色彩系统
- 主色: #667eea → #764ba2 (渐变紫)
- 强调色: #ff6b9d (霓虹粉)
- 背景: #0f0f1a (暗色)
- 文字: #ffffff / #a0aec0

### 字体
- 中文: Noto Sans SC
- 英文: Inter
- 数字: Orbitron

---

## 7. 开发流程

1. 本地开发 (frontend + backend)
2. 提交到 GitHub
3. 推送到阿里云部署
4. 完整测试
5. 根据测试结果优化
6. 记录所有更新

---

## 8. 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| v1.0.0 | 2026-04-21 | 初始化项目，重新设计平台 |
