#!/bin/bash
set -e

# 纯静态部署:状态存浏览器 localStorage,无需后端。
# 改成你的阿里云 ECS ↓
SERVER_IP="112.124.38.17"
SERVER_USER="root"
REMOTE_FRONTEND_DIR="/var/www/html"

ROOT_DIR="$(pwd)"
LOCAL_BUILD_DIR="$ROOT_DIR/dist"        # vite build 输出

# ==== 1. 打包前端 ====
echo "🚀 打包前端..."
npm run build

# ==== 2. 远程目录 ====
echo "📂 创建远程目录..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_FRONTEND_DIR /var/log"

# ==== 3. 上传 dist(增量)====
echo "📤 上传前端 dist..."
rsync -avz --delete "$LOCAL_BUILD_DIR/" "$SERVER_USER@$SERVER_IP:$REMOTE_FRONTEND_DIR/"

# ==== 4. Nginx 托管静态文件 ====
echo "🛠 配置 Nginx..."
ssh "$SERVER_USER@$SERVER_IP" bash -s << 'EOF'
set -e
if ! command -v nginx > /dev/null; then
  apt update && apt install -y nginx
fi

cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
NGINX

nginx -t && systemctl restart nginx
echo "$(date '+%Y-%m-%d %H:%M:%S') | static deploy | SUCCESS" >> /var/log/deploy.log
EOF

echo "🎉 部署完成!(纯静态,状态存浏览器 localStorage)"
echo "访问: http://$SERVER_IP"
