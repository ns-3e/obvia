#!/bin/bash

# Preposition Restore Script
# This script restores the database and media files from backup

set -e

echo "🔄 Preposition Restore Script"
echo "======================="

# Check arguments
if [ $# -lt 2 ]; then
    echo "❌ Usage: $0 <database_backup_file> <media_backup_file>"
    echo ""
    echo "Example:"
    echo "  $0 ./backups/preposition_db_20241201_143022.sql ./backups/preposition_media_20241201_143022.tar.gz"
    exit 1
fi

DB_BACKUP_FILE="$1"
MEDIA_BACKUP_FILE="$2"

# Check if backup files exist
if [ ! -f "$DB_BACKUP_FILE" ]; then
    echo "❌ Database backup file not found: $DB_BACKUP_FILE"
    exit 1
fi

if [ ! -f "$MEDIA_BACKUP_FILE" ]; then
    echo "❌ Media backup file not found: $MEDIA_BACKUP_FILE"
    exit 1
fi

echo "✅ Backup files found:"
echo "   Database: $DB_BACKUP_FILE"
echo "   Media: $MEDIA_BACKUP_FILE"

# Confirm restore
echo ""
echo "⚠️  WARNING: This will overwrite your current data!"
echo "   Make sure you have a backup of your current data before proceeding."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "✅ Restore confirmed"

# Stop services
echo "🛑 Stopping services..."
docker-compose down

# Start database and Redis
echo "🚀 Starting database and Redis..."
docker-compose up -d mysql redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Restore database
echo "🗄️  Restoring database..."
docker-compose exec -T mysql mysql -u preposition -ppreposition preposition < "$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Database restore failed"
    exit 1
fi

# Start backend
echo "🐍 Starting backend..."
docker-compose up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Restore media files
echo "📁 Restoring media files..."
docker-compose exec -T backend rm -rf /app/media/*
docker-compose exec -T backend tar -xzf - < "$MEDIA_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Media files restored successfully"
else
    echo "❌ Media files restore failed"
    exit 1
fi

# Start frontend
echo "⚛️  Starting frontend..."
docker-compose up -d frontend

# Run migrations to ensure database is up to date
echo "🗄️  Running database migrations..."
docker-compose exec -T backend python manage.py migrate

# Create system shelves if they don't exist
echo "📚 Creating system shelves..."
docker-compose exec -T backend python manage.py create_system_shelves

echo ""
echo "🎉 Restore completed successfully!"
echo "================================"
echo "📱 Frontend: http://localhost:5173 (dev) or http://localhost:80 (prod)"
echo "🔧 Backend API: http://localhost:8000"
echo ""
echo "📋 Next steps:"
echo "  1. Verify your data is restored correctly"
echo "  2. Test the application functionality"
echo "  3. Update any configuration if needed"
echo ""
