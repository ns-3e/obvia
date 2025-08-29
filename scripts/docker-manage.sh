#!/bin/bash

# Docker management script for Preposition
# This script helps manage the Docker containers with data persistence

set -e

case "$1" in
    "start")
        echo "Starting Preposition with data persistence..."
        docker compose up -d
        echo "✅ Preposition is running!"
        echo "🌐 Frontend: http://localhost:5173"
        echo "🔧 Backend API: http://localhost:8000/api"
        echo "🗄️  MySQL: localhost:3306"
        
        # Wait for backend to be ready
        echo "⏳ Waiting for backend to be ready..."
        sleep 10
        
        # Create default libraries
        echo "📚 Setting up default libraries..."
        docker compose exec backend python manage.py create_default_libraries
        ;;
    "stop")
        echo "Stopping Preposition containers..."
        docker compose down
        echo "✅ Containers stopped (data preserved)"
        ;;
    "restart")
        echo "Restarting Preposition containers..."
        docker compose restart
        echo "✅ Containers restarted"
        ;;
    "logs")
        echo "Showing logs..."
        docker compose logs -f
        ;;
    "backend-logs")
        echo "Showing backend logs..."
        docker compose logs -f backend
        ;;
    "frontend-logs")
        echo "Showing frontend logs..."
        docker compose logs -f frontend
        ;;
    "shell")
        echo "Opening Django shell..."
        docker compose exec backend python manage.py shell
        ;;
    "migrate")
        echo "Running migrations..."
        docker compose exec backend python manage.py migrate
        ;;
    "makemigrations")
        echo "Creating migrations..."
        docker compose exec backend python manage.py makemigrations
        ;;
    "collectstatic")
        echo "Collecting static files..."
        docker compose exec backend python manage.py collectstatic --noinput
        ;;
    
    "setup-defaults")
        echo "Setting up default libraries..."
        docker compose exec backend python manage.py create_default_libraries
        ;;
    "backup")
        echo "Creating database backup..."
        docker compose exec mysql mysqldump -u preposition -ppreposition preposition > backup_$(date +%Y%m%d_%H%M%S).sql
        echo "✅ Backup created"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "❌ Please provide backup file: ./docker-manage.sh restore backup_file.sql"
            exit 1
        fi
        echo "Restoring database from $2..."
        docker compose exec -T mysql mysql -u preposition -ppreposition preposition < "$2"
        echo "✅ Database restored"
        ;;
    "clean")
        echo "⚠️  WARNING: This will remove ALL data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Removing containers and volumes..."
            docker compose down -v
            docker volume rm preposition_mysql_data preposition_media_data 2>/dev/null || true
            echo "✅ All data removed"
        else
            echo "Operation cancelled"
        fi
        ;;
    "status")
        echo "Container status:"
        docker compose ps
        echo
        echo "Volume status:"
        docker volume ls | grep preposition
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|backend-logs|frontend-logs|shell|migrate|makemigrations|collectstatic|backup|restore|clean|status}"
        echo
        echo "Commands:"
        echo "  start         - Start all containers with data persistence"
        echo "  stop          - Stop containers (data preserved)"
        echo "  restart       - Restart containers"
        echo "  logs          - Show all logs"
        echo "  backend-logs  - Show backend logs"
        echo "  frontend-logs - Show frontend logs"
        echo "  shell         - Open Django shell"
        echo "  migrate       - Run database migrations"
        echo "  makemigrations- Create new migrations"
        echo "  collectstatic - Collect static files"
        echo "  backup        - Create database backup"
        echo "  restore <file>- Restore database from backup"
        echo "  setup-defaults- Create default libraries (Unassigned)"
        echo "  clean         - Remove all containers and data (⚠️  destructive)"
        echo "  status        - Show container and volume status"
        exit 1
        ;;
esac
