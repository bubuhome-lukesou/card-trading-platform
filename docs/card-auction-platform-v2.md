# 卡牌拍賣平台 v2.0 開發文檔

## 📋 當前問題清單

### 緊急修復 (P0)
1. ❌ **微信登錄失敗** - 需要配置微信 OAuth 或改進 Mock 模式
2. ❌ **倒計時缺失** - 拍賣頁面沒有實時倒計時顯示
3. ❌ **商品展示單一** - 只顯示 1 個拍賣品，需要更多測試數據
4. ❌ **賣家入口缺失** - 沒有發布拍賣品的界面

### 功能優化 (P1)
5. ⚠️ **出價歷史** - 需要顯示出價記錄
6. ⚠️ **WebSocket 實時更新** - 競價需要實時推送
7. ⚠️ **通知系統** - 出價成功/被超越時通知用戶

---

## 🎯 v2.0 功能規劃

### 一、前台用戶功能

#### 1. 用戶模塊
```
├── 微信登錄
│   ├── Mock 模式（開發環境）
│   └── 真實微信 OAuth（生產環境）
├── 個人中心
│   ├── 基本信息
│   ├── 我的出價
│   ├── 我的訂單
│   └── 收藏夾
└── 消息通知
    ├── 出價成功
    ├── 被超越通知
    └── 拍賣結束通知
```

#### 2. 拍賣瀏覽
```
├── 拍賣列表
│   ├── 進行中
│   ├── 即將開始
│   └── 已結束
├── 拍賣詳情
│   ├── 商品圖片輪播
│   ├── 當前價格
│   ├── 倒計時（實時）
│   ├── 出價歷史
│   └── 出價輸入
└── 搜索篩選
    ├── 關鍵字搜索
    ├── 稀有度篩選
    └── 價格區間
```

#### 3. 賣家功能
```
├── 發布拍賣
│   ├── 上傳圖片
│   ├── 填寫信息
│   ├── 設置起拍價
│   ├── 設置加價幅度
│   └── 設置拍賣時長
├── 我的拍賣
│   ├── 進行中
│   ├── 已成交
│   └── 流拍
└── 實名認證
    ├── 上傳證件
    └── 微信綁定
```

### 二、後台管理功能

#### 1. 審核管理
```
├── 商品審核
│   ├── 待審核列表
│   ├── 通過/拒絕
│   └── 審核記錄
└── 賣家審核
    ├── 認證申請
    └── 資質審批
```

#### 2. 拍賣監控
```
├── 實時監控
│   ├── 活躍拍賣
│   ├── 出價頻次
│   └── 異常預警
├── 手動干預
│   ├── 結束拍賣
│   ├── 暫停拍賣
│   └── 取消拍賣
└── 數據統計
    ├── 成交率
    ├── 平均出價
    └── 熱門商品
```

#### 3. 用戶管理
```
├── 用戶列表
├── 封禁/解封
└── 權限管理
```

### 4. 系統設置
```
├── 拍賣規則
│   ├── 默認加價幅度
│   ├── 自動延時時長
│   └── 手續費設置
├── 微信配置
│   ├── AppID
│   ├── AppSecret
│   └── 模板消息
└── 頁面配置
    ├── Banner 管理
    └── 公告管理
```

---

## 🔧 技術实施方案

### 問題 1：微信登錄修復

#### 方案 A：改進 Mock 模式（立即可用）
```typescript
// backend/src/modules/auth/auth.service.ts
async wechatLogin(code: string): Promise<{ user: User; token: string }> {
  // 開發環境：自動創建測試用戶
  const mockOpenId = 'mock_' + (code || Date.now());
  let user = await this.userRepository.findOne({ where: { wechatOpenId: mockOpenId } });
  
  if (!user) {
    user = this.userRepository.create({
      wechatOpenId: mockOpenId,
      nickname: '微信用戶' + Math.floor(Math.random() * 10000),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + mockOpenId,
      role: UserRole.BUYER,
    });
    user = await this.userRepository.save(user);
  }
  
  const token = this.generateToken(user.id);
  return { user, token };
}
```

#### 方案 B：配置真實微信（生產環境）
```bash
# .env
WECHAT_APP_ID=wx_xxxxxxxxxxxx
WECHAT_APP_SECRET=xxxxxxxxxxxxxxxx
WECHAT_REDIRECT_URI=https://card.aishoper.co/api/auth/wechat/login
```

---

### 問題 2：倒計時功能

#### 前端實現（Vue3）
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const endTime = ref(new Date())
const timeLeft = ref('')

function updateCountdown() {
  const now = new Date().getTime()
  const end = new Date(endTime.value).getTime()
  const diff = end - now
  
  if (diff <= 0) {
    timeLeft.value = '已結束'
    return
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  timeLeft.value = `${days}天 ${hours}時 ${minutes}分 ${seconds}秒`
}

onMounted(() => {
  updateCountdown()
  const timer = setInterval(updateCountdown, 1000)
  onUnmounted(() => clearInterval(timer))
})
</script>

<template>
  <div class="countdown" :class="{ 'ending-soon': diff < 120000 }">
    ⏰ {{ timeLeft }}
  </div>
</template>

<style scoped>
.countdown {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1a1a2e;
}
.ending-soon {
  color: #dc3545;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
```

---

### 問題 3：添加測試數據

```sql
-- 批量插入測試數據
USE card_auction;

-- 插入 10 個測試用戶
INSERT INTO users (id, wechatOpenId, nickname, avatar, role, status, balance, createdAt, updatedAt) VALUES
('user-002', 'wx_002', '收藏家 A', 'https://api.dicebear.com/7.x/avataaars/svg?seed=002', 'seller', 'active', 50000, NOW(), NOW()),
('user-003', 'wx_003', '卡牌王 B', 'https://api.dicebear.com/7.x/avataaars/svg?seed=003', 'seller', 'active', 30000, NOW(), NOW());

-- 插入 20 張測試卡牌
INSERT INTO cards (id, name, description, images, rarity, price, stock, status, sellerId, createdAt, updatedAt) VALUES
('card-002', '黑蓮花', '魔法風雲會最稀有卡牌', '["https://via.placeholder.com/300"]', 'ultra_rare', 50000.00, 1, 'approved', 'user-002', NOW(), NOW()),
('card-003', '皮卡丘 25 週年', '寶可夢限定版', '["https://via.placeholder.com/300"]', 'super_rare', 8000.00, 1, 'approved', 'user-002', NOW(), NOW());

-- 插入 10 個測試拍賣
INSERT INTO auctions (id, cardId, startingPrice, minIncrementPercent, startTime, endTime, currentPrice, status, autoExtendSeconds, createdAt, updatedAt) VALUES
('auction-002', 'card-002', 10000.00, 5.00, NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 10000.00, 'active', 120, NOW(), NOW()),
('auction-003', 'card-003', 2000.00, 5.00, NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 2000.00, 'active', 120, NOW(), NOW());
```

---

### 問題 4：賣家發布入口

#### 前端頁面（新增 /seller 路由）
```vue
<!-- frontend/src/views/SellerDashboard.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  name: '',
  description: '',
  rarity: 'common',
  startingPrice: 0,
  minIncrementPercent: 5,
  duration: 7, // days
})

async function createAuction() {
  const res = await fetch('/api/seller/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  })
  const data = await res.json()
  if (data.auction) {
    alert('拍賣創建成功！')
  }
}
</script>

<template>
  <div class="seller-dashboard">
    <h1>發布拍賣</h1>
    <form @submit.prevent="createAuction">
      <div class="form-group">
        <label>卡牌名稱</label>
        <input v-model="form.name" required />
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="form.description" required></textarea>
      </div>
      <div class="form-group">
        <label>稀有度</label>
        <select v-model="form.rarity">
          <option value="common">普通</option>
          <option value="rare">稀有</option>
          <option value="super_rare">超稀有</option>
          <option value="ultra_rare">極稀有</option>
        </select>
      </div>
      <div class="form-group">
        <label>起拍價 (¥)</label>
        <input type="number" v-model="form.startingPrice" min="0" step="0.01" required />
      </div>
      <div class="form-group">
        <label>加價幅度 (%)</label>
        <input type="number" v-model="form.minIncrementPercent" min="1" max="100" required />
      </div>
      <div class="form-group">
        <label>拍賣時長 (天)</label>
        <input type="number" v-model="form.duration" min="1" max="30" required />
      </div>
      <button type="submit" class="submit-btn">發布拍賣</button>
    </form>
  </div>
</template>
```

#### 後端 API
```typescript
// backend/src/modules/seller/seller.controller.ts
@Controller('api/seller')
export class SellerController {
  constructor(
    private cardService: CardService,
    private auctionService: AuctionService,
  ) {}

  @Post('auctions')
  async createAuction(@Body() body: any, @Query('userId') userId: string) {
    // 1. 創建卡牌
    const card = await this.cardService.create({
      name: body.name,
      description: body.description,
      rarity: body.rarity,
      price: body.startingPrice,
      sellerId: userId,
      status: CardStatus.PENDING, // 需要審核
    });

    // 2. 創建拍賣
    const auction = await this.auctionService.create({
      cardId: card.id,
      startingPrice: body.startingPrice,
      minIncrementPercent: body.minIncrementPercent,
      startTime: new Date(),
      endTime: new Date(Date.now() + body.duration * 24 * 60 * 60 * 1000),
      status: AuctionStatus.PENDING,
    });

    return { card, auction };
  }
}
```

---

## 📅 開發優先級

### Phase 1：緊急修復（1-2 天）
- [ ] 微信登錄 Mock 模式改進
- [ ] 倒計時功能實現
- [ ] 批量測試數據生成
- [ ] 前端列表分頁

### Phase 2：賣家功能（3-5 天）
- [ ] 賣家發布頁面
- [ ] 圖片上傳功能
- [ ] 審核流程對接
- [ ] 賣家中心

### Phase 3：實時功能（5-7 天）
- [ ] WebSocket 服務
- [ ] 實時出價推送
- [ ] 通知系統
- [ ] 出價歷史展示

### Phase 4：優化完善（7-10 天）
- [ ] 搜索篩選
- [ ] 個人中心
- [ ] 訂單管理
- [ ] 支付對接

---

## 🔐 安全注意事項

1. **微信 OAuth**
   - 不要在前端暴露 AppSecret
   - 使用 HTTPS
   - 驗證 redirect_uri

2. **出價安全**
   - 後端驗證出價金額
   - 防止超額出價
   - 限流防止刷價

3. **文件上傳**
   - 限制文件類型
   - 限制文件大小
   - 圖片壓縮處理

---

## 📊 數據庫優化建議

```sql
-- 添加索引
CREATE INDEX idx_auction_status ON auctions(status, endTime);
CREATE INDEX idx_card_seller ON cards(sellerId, status);
CREATE INDEX idx_bid_auction ON bids(auctionId, createdAt);

-- 添加出價記錄分表（按月）
CREATE TABLE bids_2026_03 LIKE bids;
```

---

**文檔版本：v2.0**  
**創建時間：2026-03-30**  
**下次更新：根據開發進度**
