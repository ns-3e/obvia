# Docker Data Persistence Setup

This document explains how to set up Obvia with Docker to ensure your data persists across container restarts and rebuilds.

## Overview

Your Docker setup is configured with persistent volumes that store:
- **MySQL Database**: All your books, libraries, notes, ratings, etc.
- **Media Files**: Uploaded PDFs, EPUBs, and other files

## Quick Start

### Using the Management Script

We've created a convenient management script to handle Docker operations:

```bash
# Start all services with data persistence
./scripts/docker-manage.sh start

# Stop services (data preserved)
./scripts/docker-manage.sh stop

# Restart services
./scripts/docker-manage.sh restart

# Check status
./scripts/docker-manage.sh status

# View logs
./scripts/docker-manage.sh logs
```

### Manual Docker Commands

```bash
# Start all services
docker compose up -d

# Stop services (data preserved)
docker compose down

# Stop services and remove volumes (⚠️ destroys all data)
docker compose down -v

# View logs
docker compose logs -f

# Access Django shell
docker compose exec backend python manage.py shell
```

## Data Persistence

### What Persists

✅ **Data that persists across `docker compose down`**:
- All books and their metadata
- Libraries and library organization
- Notes, ratings, and reviews
- Tags and shelves
- Uploaded files (PDFs, EPUBs)
- User preferences and settings

❌ **Data that does NOT persist**:
- Temporary cache data
- Session data (if using default session backend)

### Volume Locations

- **MySQL Data**: `obvia_mysql_data` volume
- **Media Files**: `obvia_media_data` volume

You can inspect these volumes:
```bash
docker volume ls | grep obvia
docker volume inspect obvia_mysql_data
```

## Backup and Restore

### Creating Backups

```bash
# Using the management script
./scripts/docker-manage.sh backup

# Manual backup
docker compose exec mysql mysqldump -u obvia -pobvia obvia > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restoring Backups

```bash
# Using the management script
./scripts/docker-manage.sh restore backup_20241227_143022.sql

# Manual restore
docker compose exec -T mysql mysql -u obvia -pobvia obvia < backup_file.sql
```

## Troubleshooting

### Data Not Persisting

If your data is not persisting, check:

1. **Volume exists**: `docker volume ls | grep obvia`
2. **Volume mounted**: `docker compose ps` (should show healthy containers)
3. **No `-v` flag**: Make sure you're not using `docker compose down -v`

### Reset Everything

If you need to start fresh:

```bash
# ⚠️ WARNING: This destroys ALL data
./scripts/docker-manage.sh clean
```

### Database Connection Issues

If you can't connect to the database:

1. Check if MySQL is running: `docker compose ps`
2. Check MySQL logs: `docker compose logs mysql`
3. Restart MySQL: `docker compose restart mysql`

## Development Workflow

### Making Code Changes

1. Make your code changes
2. Rebuild the affected container:
   ```bash
   # Rebuild backend
   docker compose build backend
   docker compose up -d backend
   
   # Rebuild frontend
   docker compose build frontend
   docker compose up -d frontend
   ```

### Running Migrations

```bash
# Create migrations
./scripts/docker-manage.sh makemigrations

# Apply migrations
./scripts/docker-manage.sh migrate
```

### Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **MySQL**: localhost:3306 (user: obvia, password: obvia)

## Environment Variables

The Docker setup uses these environment variables (defined in docker-compose.yml):

- `MYSQL_HOST=mysql`
- `MYSQL_PORT=3306`
- `MYSQL_DB=obvia`
- `MYSQL_USER=obvia`
- `MYSQL_PASSWORD=obvia`
- `REDIS_URL=redis://redis:6379/0`

## Security Notes

- The MySQL root password is set to "root" (change this in production)
- The obvia user password is set to "obvia" (change this in production)
- All services are exposed on localhost only
- Consider using Docker secrets for production deployments

## Production Considerations

For production deployment:

1. Change default passwords
2. Use Docker secrets for sensitive data
3. Set up proper backup schedules
4. Configure SSL/TLS
5. Use a reverse proxy (nginx)
6. Set up monitoring and logging
7. Configure proper resource limits
