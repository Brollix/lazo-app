#!/bin/bash
set -e

echo "🚀 Starting Server Deployment..."

# 1. Update source code
echo "📥 Fetching latest changes from GitHub..."
# Clean up any corrupted refs and stash local changes
git remote prune origin
git stash --include-untracked || true
git fetch origin master
git reset --hard origin/master
git clean -fd

# 2. Cleanup Docker environment (Remove dangling images and stopped containers)
echo "🧹 Cleaning up old Docker resources..."
docker system prune -f

# 3. Rebuild and Restart Services
echo "🏗️  Building and starting services..."
docker compose down
docker compose up --build -d

# 4. Verification
echo "✅ Backend deployed successfully!"
echo "------------------------------------------------"
docker compose ps
echo "------------------------------------------------"

echo "📜 Last 20 lines of logs:"
docker compose logs --tail 20
