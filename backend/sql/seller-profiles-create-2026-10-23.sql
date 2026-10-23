-- 商家介紹頁 seller_profiles 表 — 2026-10-23
-- 伺服器手動執行（synchronize 只喺 dev 開）：
--   mysql -u card_admin -p'CardAuction2026!' card_auction < seller-profiles-create-2026-10-23.sql
-- ⚠️ collation 用 0900_ai_ci：users.id 係 0900_ai_ci，unicode_ci 會令 FK 不兼容（ERROR 3780）

CREATE TABLE IF NOT EXISTS `seller_profiles` (
  `userId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `logo` varchar(500) NULL,
  `banner` varchar(500) NULL,
  `descriptionZh` text NULL,
  `descriptionEn` text NULL,
  `businessHours` varchar(1000) NULL,
  `wechatId` varchar(100) NULL,
  `wechatQrCode` varchar(500) NULL,
  `location` varchar(200) NULL,
  `verified` tinyint NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`userId`),
  CONSTRAINT `FK_seller_profiles_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;