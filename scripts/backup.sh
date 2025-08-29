#!/bin/bash

# Preposition Backup Script
# This script creates backups of the database and media files

set -e

echo "💾 Preposition Backup Script"
echo "======================"

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="preposition_db_${DATE}.sql"
MEDIA_BACKUP_FILE="preposition_media_${DATE}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"
echo "📅 Backup timestamp: $DATE"

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Preposition services are not running. Please start them first with:"
    echo "   docker-compose up -d"
    exit 1
fi

echo "✅ Services are running"

# Database backup
echo "🗄️  Creating database backup..."
docker-compose exec -T mysql mysqldump -u preposition -ppreposition preposition > "$BACKUP_DIR/$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: $DB_BACKUP_FILE"
else
    echo "❌ Database backup failed"
    exit 1
fi

# Media files backup
echo "📁 Creating media files backup..."
docker-compose exec -T backend tar -czf - /app/media > "$BACKUP_DIR/$MEDIA_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Media backup created: $MEDIA_BACKUP_FILE"
else
    echo "❌ Media backup failed"
    exit 1
fi

# Create backup info file
cat > "$BACKUP_DIR/backup_info_${DATE}.txt" << EOF
Preposition Backup Information
=======================

Backup Date: $(date)
Backup Directory: $BACKUP_DIR

Files:
- Database: $DB_BACKUP_FILE
- Media: $MEDIA_BACKUP_FILE

Services Status:
$(docker-compose ps)

Database Size: $(du -h "$BACKUP_DIR/$DB_BACKUP_FILE" | cut -f1)
Media Size: $(du -h "$BACKUP_DIR/$MEDIA_BACKUP_FILE" | cut -f1)

To restore:
1. Stop services: docker-compose down
2. Restore database: docker-compose exec -T mysql mysql -u preposition -ppreposition preposition < $DB_BACKUP_FILE
3. Restore media: docker-compose exec -T backend tar -xzf - < $MEDIA_BACKUP_FILE
4. Start services: docker-compose up -d
EOF

echo "✅ Backup information saved: backup_info_${DATE}.txt"

# Show backup summary
echo ""
echo "📊 Backup Summary"
echo "================="
echo "Database backup: $BACKUP_DIR/$DB_BACKUP_FILE ($(du -h "$BACKUP_DIR/$DB_BACKUP_FILE" | cut -f1))"
echo "Media backup: $BACKUP_DIR/$MEDIA_BACKUP_FILE ($(du -h "$BACKUP_DIR/$MEDIA_BACKUP_FILE" | cut -f1))"
echo "Backup info: $BACKUP_DIR/backup_info_${DATE}.txt"
echo ""
echo "💡 To list all backups: ls -la $BACKUP_DIR/"
echo "💡 To restore from backup: ./scripts/restore.sh $BACKUP_DIR/$DB_BACKUP_FILE $BACKUP_DIR/$MEDIA_BACKUP_FILE"
