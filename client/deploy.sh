#!/bin/bash
set -e

# Configuration
PROJECT_ROOT="/home/ubuntu/lazo-app"
CLIENT_DIR="$PROJECT_ROOT/client"
DEPLOY_DIR="/var/www/lazo/client"

echo "Starting Client Deployment..."

# 1. Cleanup Docker images from previous builds (node:20-alpine)
echo "Removing old Docker images and containers..."
# Remove stopped containers
docker container prune -f
# Remove dangling images (untagged)
docker image prune -f
# Remove unused images (not just dangling)
docker image prune -a -f --filter "until=24h"
# Clean up build cache
docker builder prune -f

# 2. Update source code
echo "Fetching latest changes from GitHub..."
cd $PROJECT_ROOT
# Remove stale git lock files if they exist
rm -f .git/index.lock .git/refs/heads/master.lock .git/refs/remotes/origin/master.lock
# Clean up any corrupted refs and stash local changes
git update-ref -d refs/remotes/origin/master 2>/dev/null || true
git remote prune origin
git stash --include-untracked || true
git fetch origin master
git reset --hard origin/master
git clean -fd

# 3. Clean old build artifacts before building
echo "Cleaning old build artifacts..."
cd $CLIENT_DIR
# Fix permissions before removing (files may be owned by Docker root user)
sudo chown -R $USER:$USER . 2>/dev/null || true
sudo chmod -R u+rw . 2>/dev/null || true
rm -rf dist/ node_modules/ .vite/

# 4. Build the application (using Docker to avoid host dependencies)
echo "Building application using Docker..."
# Run Docker as current user to avoid permission issues
docker run --rm \
    --user $(id -u):$(id -g) \
    -v "$CLIENT_DIR":/app \
    -w /app \
    -e NODE_OPTIONS="--max-old-space-size=1024" \
    -e HOME=/tmp \
    node:20-alpine \
    sh -c "npm install && npm run build"

# 5. Deploy to Nginx directory
echo "Moving build artifacts to $DEPLOY_DIR..."
cd $CLIENT_DIR
sudo mkdir -p $DEPLOY_DIR
sudo rm -rf $DEPLOY_DIR/*
sudo cp -r dist/* $DEPLOY_DIR/

# 6. Nginx Configuration (if updated)
if [ -f "nginx.conf" ]; then
    echo "Updating Nginx configuration..."
    sudo cp nginx.conf /etc/nginx/sites-available/client
    sudo ln -sf /etc/nginx/sites-available/client /etc/nginx/sites-enabled/
fi

# 7. Restart Nginx
echo "Restarting Nginx..."
sudo nginx -t
sudo systemctl restart nginx

# 8. Final cleanup - Remove ALL build artifacts to free space
echo "Removing ALL build artifacts to free disk space..."
cd $CLIENT_DIR
# Use sudo to remove files if they have permission issues (as a fallback)
sudo rm -rf dist/ node_modules/ .vite/ package-lock.json 2>/dev/null || rm -rf dist/ node_modules/ .vite/ package-lock.json
# Clean npm cache
npm cache clean --force 2>/dev/null || true

# 9. Final Docker cleanup - Remove ALL unused images
echo "Final Docker cleanup..."
docker system prune -a -f --volumes
# Specifically remove old node:20-alpine images (keep only latest)
docker images node:20-alpine --format "{{.ID}}" | tail -n +2 | xargs -r docker rmi -f 2>/dev/null || true

echo "Client deployed successfully to https://soylazo.com"
echo "Disk space freed!"