#!/bin/bash
set -e

echo "🚀 Starting Server Deployment..."

# 1. Update source code
echo "📥 Pulling latest changes from GitHub..."
git pull origin master

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
