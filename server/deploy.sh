#!/bin/bash
set -e

echo "🚀 Starting Server Deployment..."

# 1. Stop and remove old containers
echo "🛑 Stopping old containers..."
cd /home/ubuntu/lazo-app/server
docker compose down --remove-orphans

# 2. AGGRESSIVE Docker cleanup - Remove ALL unused resources
echo "🗑️  AGGRESSIVE cleanup of Docker resources..."
# Remove all stopped containers
docker container prune -f
# Remove ALL unused images (not just dangling ones)
docker image prune -a -f
# Remove all unused volumes
docker volume prune -f
# Remove all unused networks
docker network prune -f
# Remove build cache
docker builder prune -a -f

# 3. Clean system logs to free space
echo "🧹 Rotating and cleaning system logs..."
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null || true

# 4. Remove old lazo-server image specifically
echo "🗑️  Removing old lazo-server images..."
docker images | grep lazo-server | awk '{print $3}' | xargs -r docker rmi -f || true

# 5. Verify disk space before proceeding
echo "💾 Checking available disk space..."
AVAILABLE_GB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB_HUMAN=$(df -h / | tail -1 | awk '{print $4}')
echo "Available space: $AVAILABLE_GB_HUMAN"
if [ "$AVAILABLE_GB" -lt 5242880 ]; then  # Less than 5GB
    echo "⚠️  WARNING: Less than 5GB available. Running emergency cleanup..."
    docker system prune -a -f --volumes
fi

# 6. Update source code
echo "📥 Fetching latest changes from GitHub..."
cd /home/ubuntu/lazo-app
# Remove stale git lock files if they exist
rm -f .git/index.lock .git/refs/heads/master.lock .git/refs/remotes/origin/master.lock
# Clean up any corrupted refs and stash local changes
git update-ref -d refs/remotes/origin/master 2>/dev/null || true
git remote prune origin
git stash --include-untracked || true
git fetch origin master
git reset --hard origin/master
git clean -fd

# 7. Clean node_modules and other build artifacts
echo "🧹 Removing node_modules and build artifacts..."
cd /home/ubuntu/lazo-app/server
rm -rf node_modules/ dist/ .tsbuildinfo package-lock.json

# 8. Rebuild and Restart Services
echo "🏗️  Building and starting services with fresh image..."
docker compose up --build -d --force-recreate

# 9. Final cleanup after successful deployment
echo "🧹 Final cleanup to free maximum disk space..."
docker system prune -a -f --volumes

# 8. Verification
echo "✅ Backend deployed successfully!"
echo "------------------------------------------------"
docker compose ps
echo "------------------------------------------------"

echo "📜 Last 20 lines of logs:"
docker compose logs --tail 20

echo ""
echo "💾 Disk space summary:"
df -h / | grep -E '^Filesystem|/$'
echo "🐳 Docker disk usage:"
docker system df
