-- 登入鎖定欄位（2026-10-24）
-- 後台 /auth/login 連續錯密碼 3 次：
--   seller → locked 鎖定，須 admin 解鎖
--   admin  → 臨時鎖 30 分鐘自動解（防唯一 admin 死鎖）
ALTER TABLE users ADD COLUMN failedLoginAttempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN lockedAt DATETIME NULL;

-- 抽查
SELECT id, email, role, failedLoginAttempts, lockedAt FROM users LIMIT 3;