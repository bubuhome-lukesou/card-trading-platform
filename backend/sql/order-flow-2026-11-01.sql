-- 訂單流程大改 2026-11-01：order_messages + reviews 新表 + orders/seller_profiles 新欄位
-- 伺服器執行：mysql -u card_admin -p'CardAuction2026!' card_auction < backend/sql/order-flow-2026-11-01.sql

-- 1. order_messages（訂單聊天）
CREATE TABLE IF NOT EXISTS order_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  orderId VARCHAR(36) NOT NULL,
  senderId VARCHAR(36) NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'chat',
  content TEXT NOT NULL,
  attachments TEXT NULL,
  proposalTime VARCHAR(50) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_order_messages_orderId(orderId),
  INDEX idx_order_messages_senderId(senderId),
  CONSTRAINT fk_order_messages_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. reviews（互評）
CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  orderId VARCHAR(36) NOT NULL,
  reviewerId VARCHAR(36) NOT NULL,
  targetUserId VARCHAR(36) NOT NULL,
  targetRole VARCHAR(20) NOT NULL,
  rating INT NOT NULL,
  content TEXT NULL,
  images TEXT NULL,
  reply TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_reviews_orderId(orderId),
  INDEX idx_reviews_reviewerId(reviewerId),
  INDEX idx_reviews_target(targetUserId, targetRole),
  CONSTRAINT fk_reviews_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. orders 新欄位（攞貨協調）
ALTER TABLE orders
  ADD COLUMN pickupProposalTime VARCHAR(50) NULL,
  ADD COLUMN pickupTime DATETIME NULL,
  ADD COLUMN pickupConfirmStatus VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN pickupConfirmedAt DATETIME NULL;

-- 4. seller_profiles 新欄位（結構化營業時間）
ALTER TABLE seller_profiles
  ADD COLUMN businessHoursSpec TEXT NULL;