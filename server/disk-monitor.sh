#!/bin/bash
# Disk Monitor and Auto-Cleanup Script
# This script monitors disk usage and performs automatic cleanup when needed

set -e

LOG_FILE="$HOME/disk-monitor.log"
THRESHOLD_PERCENT=80
CRITICAL_THRESHOLD=85

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get current disk usage percentage
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

log "Current disk usage: ${USAGE}%"

# Check if usage exceeds threshold
if [ "$USAGE" -ge "$CRITICAL_THRESHOLD" ]; then
    log "⚠️  CRITICAL: Disk usage at ${USAGE}% (threshold: ${CRITICAL_THRESHOLD}%)"
    log "🗑️  Running AGGRESSIVE cleanup..."
    
    # Emergency cleanup
    docker system prune -a -f --volumes
    sudo journalctl --vacuum-time=3d
    sudo find /var/log -type f -name "*.log.*" -mtime +3 -delete 2>/dev/null || true
    sudo find /var/log -type f -name "*.gz" -mtime +3 -delete 2>/dev/null || true
    
    # Clean npm cache if exists
    npm cache clean --force 2>/dev/null || true
    
    NEW_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    log "✅ Cleanup complete. New usage: ${NEW_USAGE}%"
    
elif [ "$USAGE" -ge "$THRESHOLD_PERCENT" ]; then
    log "⚠️  WARNING: Disk usage at ${USAGE}% (threshold: ${THRESHOLD_PERCENT}%)"
    log "🧹 Running standard cleanup..."
    
    # Standard cleanup
    docker container prune -f
    docker image prune -a -f
    docker volume prune -f
    docker builder prune -f
    sudo journalctl --vacuum-time=7d
    
    NEW_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    log "✅ Cleanup complete. New usage: ${NEW_USAGE}%"
else
    log "✅ Disk usage is healthy (${USAGE}%)"
fi

# Display disk usage summary
log "--- Disk Usage Summary ---"
df -h / | grep -E '^Filesystem|/$' | tee -a "$LOG_FILE"
docker system df 2>/dev/null | tee -a "$LOG_FILE" || true
log "-------------------------"
