#!/bin/bash
set -e

# Configuration
PROJECT_ROOT="/home/ubuntu/lazo-app"
CLIENT_DIR="$PROJECT_ROOT/client"
DEPLOY_DIR="/var/www/lazo/client"

echo "🚀 Starting Client Deployment..."

# 1. Update source code
echo "📥 Fetching latest changes from GitHub..."
cd $PROJECT_ROOT
# Clean up any corrupted refs and stash local changes
git update-ref -d refs/remotes/origin/master
git remote prune origin
git stash --include-untracked || true
git fetch origin master
git reset --hard origin/master
git clean -fd

# 2. Build the application (using Docker to avoid host dependencies)
echo "📦 Building application using Docker..."
docker run --rm \
    -v "$CLIENT_DIR":/app \
    -w /app \
    -e NODE_OPTIONS="--max-old-space-size=1024" \
    node:20-alpine \
    sh -c "npm install && npm run build"

# 3. Deploy to Nginx directory
echo "🚚 Moving build artifacts to $DEPLOY_DIR..."
cd $CLIENT_DIR
sudo mkdir -p $DEPLOY_DIR
sudo rm -rf $DEPLOY_DIR/*
sudo cp -r dist/* $DEPLOY_DIR/

# 4. Nginx Configuration (if updated)
if [ -f "nginx.conf" ]; then
    echo "⚙️  Updating Nginx configuration..."
    sudo cp nginx.conf /etc/nginx/sites-available/client
    sudo ln -sf /etc/nginx/sites-available/client /etc/nginx/sites-enabled/
fi

# 5. Restart Nginx
echo "🔄 Restarting Nginx..."
sudo nginx -t
sudo systemctl restart nginx

# 6. Cleanup
echo "🧹 Cleaning up build artifacts..."
# We keep dist/ for reference, but could remove node_modules if space is tight
# npm prune --production

echo "✅ Client deployed successfully to https://soylazo.com"
