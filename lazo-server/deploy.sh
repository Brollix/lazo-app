#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting deployment for Lazo Server..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker Desktop."
  exit 1
fi

echo "⬇️  Stopping currently running containers..."
docker compose down

echo "🏗️  Building and starting services..."
docker compose up --build -d

echo "✅ Backend deployed successfully!"
echo "Checking service status..."
docker compose ps

echo "📜 Streaming logs (Press Ctrl+C to stop viewing logs, server will continue running)..."
echo "--------------------------------------------------------------------------------"
docker compose logs -f
