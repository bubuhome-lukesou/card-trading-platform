# PRD — PicardChu 卡牌交易平台（產品需求文檔）

版本：v1.1 · 更新日期：2026-11-02 · 網址：https://card.aishoper.co

---

## 1. 產品概述

- **品牌名稱：** PicardChu（2026-09-20 由 Card Quest 更名）
- **產品定位：** 面向港澳地區嘅卡牌收藏品交易平台（收藏家 ⇄ 商家）
- **核心功能：** 拍賣、一口價銷售、預約（訂金訂卡）三種商品模式 + 訂單全流程管理 + 訂單聊天 / 互評
- **目標用戶：** 卡牌收藏家（買家）、卡牌商家（賣家）、平台管理員
- **交易幣種：** MOP（澳門幣）

## 2. 技術棧

| 層 | 技術 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + Vue I18n（中/英） |
| 後端 | NestJS + TypeScript + TypeORM |
| 數據庫 | MySQL（utf8mb4），Redis 緩存 |
| 認證 | JWT + Passport（手機 SMS / Google 登入） |
| 短信 | 騰訊雲 SMS（港澳台線路） |
| 部署 | 阿里雲 47.242.110.155 · PM2 · Nginx · Let's Encrypt SSL |

## 3. 用戶角色與登入

### 3.1 三種角色
| 角色 | 權限 |
|------|------|
| User（買家） | 瀏覽/出價/預約/購買、訂單管理、錢包、收藏、評價 |
| Seller（商家） | 賣家後台：商品/訂單/收益管理、商品介紹頁、營業時間設置 |
| Admin（管理員） | 管理後台：用戶/商家申請審批/頁面/平台設定/聯絡訊息 |

### 3.2 登入方式（2026-10-12 收口）
- **買家登入 `/login`**：① 手機 SMS 驗證碼（未註冊自動建帳號）② Google 帳號登入（email 匹配自動綁定舊帳號）— 電郵+密碼模式已移除
- **商家/管理員**：統一入口 `/admin/login`（帳號+密碼）
- **登入鎖定**：密碼連錯 3 次 → 帳號鎖定；商家鎖定須管理員解鎖，管理員臨時鎖 30 分鐘自動解封
- 路由守衛：未登入禁入後台；admin 登入狀態自動跳自己 Dashboard；seller 可自由瀏覽公開頁

## 4. 商品系統

### 4.1 商品資料
- 雙語標題/描述（中/英）、多圖、規格表（類別/種類/品相 condition/語言/品牌/系列/稀有度）
- 商品編號（productNumber）：`YYMMDD+4位序號`，counters 表單調保護、併發安全、軟刪號碼不重用
- 商品三模式：
  | 模式 | 說明 |
  |------|------|
  | 拍賣（auction） | 賣家另行建立拍賣場（起始價/叫價階梯/結束時間），出價即時 |
  | 預訂（reservation） | 訂金預約制，訂金→商家確認→尾款→到店取貨 |
  | 銷售（sale） | 一口價直接購買 |

### 4.2 商城與首頁
- `/marketplace`：搜尋 + 280px 篩選欄（類別/種類/品相/語言/商家/價格）+ 排序 + 無限滾動
- `/auctions`：拍賣專場（同 MarketplaceView，鎖定 listing=auction）
- 首頁：UGC 可編輯 Hero（浮世繪背景）+ 實時統計條（本日/總瀏覽/用戶數/在售商品/完成訂單）+ 快速分類 + 商品三區（最新上架/熱門拍賣/熱門預訂）
- 商家介紹頁 `/seller/:id`：banner/logo/簡介/營業時間/微信 QR + 商品四 tab + 商品評價
- 全局開關：隱藏已售出/過期預訂/已結束拍賣（導覽列 + 商城雙入口同步）
- 幫助中心 / 聯絡我們 / FAQ（admin 可編輯內容）

## 5. 拍賣系統

| 功能 | 規則 |
|------|------|
| 出價 | 須高於當前價 + 叫價階梯；WebSocket 即時更新 |
| 反搶秒殺 | 最後 5 分鐘有出價 → 自動延長 5 分鐘 |
| 結束結算 | 到期自動結算，通知中標者建立訂單 |
| 出價保護 | 全站出價上限（訂單/出價 5 筆上限機制） |

## 6. 訂單系統（2026-11-02 現狀）

### 6.1 訂單類型（5 種）
`direct_purchase`（直購）· `buy_now`（拍賣直購）· `auction_win`（拍賣得標）· `reservation_deposit`（預約訂金）· `reservation_full`（預約尾款）

### 6.2 狀態機與流程
```
直購/拍賣：pending → pending_paid → paid → shipped → delivered
預約：    pending → pending_paid → confirmed → delivered
```
- pending：等買家上傳轉帳憑證（暫不支持線上支付，人工確認）
- pending_paid：商家核對憑證 → 確認收款（訂金/全款）
- 預約 confirmed：買家與商家喺訂單聊天預約攞貨時間（商家設置營業時間規限供選時）
- 攞貨時間確認後：買家「確認取貨」→ delivered（完成，進入互評期）
- shipped：買家「確認收貨」→ delivered
- 24 小時未付款且未預約攞貨 → 自動取消（每 10 分鐘 cron 掃描）
- **買賣兩端訂單頁欄位統一**：商品｜訂單號｜商家(買家)｜金額｜狀態｜時間｜下一步｜操作；訂單號 ORD- 為獨立欄位
- 訂單詳情：進度時間線（預約單/一般單分支）+ 商品圖片檢視器（多圖）+ 轉帳/尾款憑證

### 6.3 訂單聊天與互評（2026-11-01 上線）
- 買家「💬 預約拿貨/聊天」統一入口開聊天 modal（5 秒輪詢即時化）
- 商家端可提出/確認攞貨時間；「確認取貨/確認收貨」統一按鈕
- delivered 後雙方可互評：5 星 + 文字 + 9 圖；商家頁顯示評分與評價列表

## 7. 後台管理

### 7.1 賣家後台 `/seller`（無公共導覽列，側欄導航）
- Dashboard：統計卡（待處理/總收入/商品數）+ 最新訂單/拍賣
- 商品列表 `/seller/auctions`：拍賣/預訂/銷售三分頁（2026-09-19 商品管理併入）
- 訂單管理 `/seller/orders`、收益管理 `/seller/earnings`、通知中心、設置（含商家介紹頁編輯/營業時間/收款 QR）
- 商家申請：公開 `/seller/apply` 提交 → admin 審批

### 7.2 管理後台 `/admin`
- Dashboard、用戶管理（含商家篩選 tab + 登入鎖定解鎖按鈕）、商家申請審批、聯絡訊息收件箱、平台設定（品牌/Hero/廣告/頁面管理 help-contact-faq）

### 7.3 用家後台 `/user`（11/2 起同款後台 chrome）
- Dashboard、訂單、購物車、收藏、錢包（收入/支出流水）、通知中心、設置

## 8. 安全與風控
- JWT Bearer 認證；角色守衛（BuyerGuard/SellerGuard/AdminGuard）
- seller-applications 等後台端點 admin guard（匿名 401）
- 通知偏好檢查；聯絡我們表單同 IP 限流（60s 間隔 + 每時 5 條）
- 訂單/憑證上傳後端校驗；商品軟刪 + 活躍拍賣/預約/未完成訂單擋刪

## 9. 通知系統
- 站內通知：拍賣即將結束/結算、預約過期、訂單更新、攞貨時間確認、完成互評提示
- 渠道：站內（30 秒輪詢未讀數）+ 電郵/微信 API 預留
- 觸發事件由 auctions/reservations/orders service 統一 notify()

## 10. 部署與維護
- 流程：本地開發 → git push → 伺服器 pull + build → pm2 restart（後端改動時）→ 驗證
- SSL：Let's Encrypt（certbot 自動續期至 2027-01）
- 訂單自動取消 cron 每 10 分鐘；拍賣結束結算 + 通知
- 完整備份：每日 cron（GitHub + MySQL + uploads）

## 11. 頁面路由總表

### 公開頁
`/` 首頁 · `/marketplace` 商城 · `/auctions` 拍賣專場 · `/product/:id` 商品詳情 · `/auction/:id` 拍賣詳情 · `/seller/:id` 商家介紹頁 · `/contact` 聯絡我們 · `/help` `/faq` 幫助頁 · `/login` 買家登入 · `/register` → redirect `/login` · `/seller/apply` 商家申請

### 買家後台（/user 側欄）
`/user` Dashboard · `/user/orders` 訂單 · `/user/cart` 購物車 · `/user/favorites` 收藏 · `/user/wallet` 錢包 · `/user/notifications` 通知 · `/user/settings` 設置

### 商家後台（/seller 側欄）
`/seller` Dashboard · `/seller/auctions` 商品列表 · `/seller/orders` 訂單 · `/seller/earnings` 收益 · `/seller/notifications` 通知 · `/seller/settings` 設置（`/seller/products` → redirect）

### 管理後台（/admin 側欄）
`/admin/login` 後台登入 · `/admin` Dashboard · `/admin/users` 用戶管理（`/admin/sellers` → redirect）· `/admin/seller-applications` 商家申請 · `/admin/contact-messages` 聯絡訊息 · `/admin/settings` 平台設定（`/admin/pages` → redirect）

---

## 12. 版本歷史
| 版本 | 日期 | 描述 |
|------|------|------|
| v1.0 | 2026-04-21 | 項目初始化（Card Quest，拍賣+銷售雙模式） |
| v1.1 | 2026-11-02 | 品牌更名 PicardChu；登入收口（SMS+Google）；預約系統；訂單聊天/互評/攞貨協調；買賣兩端訂單頁統一；商家介紹頁；i18n |