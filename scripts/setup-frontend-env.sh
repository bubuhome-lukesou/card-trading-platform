#!/bin/bash
# 在伺服器上創建 frontend/.env.production（Google Client ID，公開值可入 repo 但放腳本更穩）
cat > /var/www/card-trading-platform/frontend/.env.production << 'EOF'
VITE_GOOGLE_CLIENT_ID=541688976590-n7d7sjfcr8kg7ta4r4edie0kvfud0grs.apps.googleusercontent.com
EOF
cd /var/www/card-trading-platform/frontend
npm run build 2>&1 | tail -1
ls dist/assets/ | grep LoginView | head -2
grep -c '541688976590' dist/assets/LoginView-*.js