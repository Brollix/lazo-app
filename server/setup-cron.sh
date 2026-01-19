#!/bin/bash
# Setup Cron Job for Automated Disk Cleanup
# Run this script once to configure automatic disk maintenance

set -e

echo "🔧 Setting up automated disk cleanup cron jobs..."

# Create cron job entries
CRON_MONITOR="0 * * * * /home/ubuntu/lazo-app/server/disk-monitor.sh >> /home/ubuntu/disk-monitor.log 2>&1"
CRON_DAILY_CLEANUP="0 3 * * * /usr/bin/docker system prune -a -f --volumes >> /home/ubuntu/docker-cleanup.log 2>&1"
CRON_LOG_ROTATION="0 4 * * 0 /usr/bin/journalctl --vacuum-time=14d >> /home/ubuntu/log-rotation.log 2>&1"

# Check if cron jobs already exist
(crontab -l 2>/dev/null | grep -v "disk-monitor.sh" | grep -v "docker system prune" | grep -v "journalctl --vacuum"; echo "$CRON_MONITOR"; echo "$CRON_DAILY_CLEANUP"; echo "$CRON_LOG_ROTATION") | crontab -

echo "✅ Cron jobs configured:"
echo "  - Hourly disk monitoring and auto-cleanup"
echo "  - Daily Docker cleanup at 3:00 AM"
echo "  - Weekly log rotation on Sundays at 4:00 AM"
echo ""
echo "📋 Current crontab:"
crontab -l

# Make disk-monitor.sh executable
chmod +x /home/ubuntu/lazo-app/server/disk-monitor.sh

echo ""
echo "✅ Setup complete! Automated disk maintenance is now active."
echo "📜 Logs will be written to:"
echo "  - ~/disk-monitor.log"
echo "  - ~/docker-cleanup.log"
echo "  - ~/log-rotation.log"
