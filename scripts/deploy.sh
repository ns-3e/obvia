#!/bin/bash

# Preposition Production Deployment Script
# This script helps deploy the Preposition application in production mode

set -e

echo "🚀 Preposition Production Deployment"
echo "=============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example and configure it for production."
    exit 1
fi

echo "✅ Environment configuration found"

# Function to wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=60
    local attempt=1
    
    echo "⏳ Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            echo "✅ $service is healthy"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to become healthy after $max_attempts attempts"
    return 1
}

# Build and start services
echo "🐳 Building and starting production services..."

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build images
echo "🔨 Building images..."
docker-compose build --no-cache

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."

# Wait for database
if wait_for_service mysql; then
    echo "✅ Database is ready"
else
    echo "❌ Database failed to start"
    docker-compose logs mysql
    exit 1
fi

# Wait for Redis
if wait_for_service redis; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis failed to start"
    docker-compose logs redis
    exit 1
fi

# Wait for backend
if wait_for_service backend; then
    echo "✅ Backend is ready"
else
    echo "❌ Backend failed to start"
    docker-compose logs backend
    exit 1
fi

# Wait for frontend
if wait_for_service frontend; then
    echo "✅ Frontend is ready"
else
    echo "❌ Frontend failed to start"
    docker-compose logs frontend
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend python manage.py migrate

# Create system shelves
echo "📚 Creating system shelves..."
docker-compose exec -T backend python manage.py create_system_shelves

echo ""
echo "🎉 Preposition is now deployed and running!"
echo "====================================="
echo "📱 Frontend: http://localhost:80 (or your domain)"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 API Documentation: http://localhost:8000/api/docs/"
echo "🗄️  Database: localhost:3306"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f backend    # View backend logs"
echo "  docker-compose logs -f frontend   # View frontend logs"
echo "  docker-compose down               # Stop all services"
echo "  docker-compose restart backend    # Restart backend"
echo "  docker-compose restart frontend   # Restart frontend"
echo ""
echo "🔧 Production commands:"
echo "  docker-compose exec backend python manage.py createsuperuser"
echo "  docker-compose exec backend python manage.py seed_books --create-library"
echo "  docker-compose exec backend python manage.py create_embeddings"
echo ""
echo "📊 Monitoring:"
echo "  docker-compose ps                 # Check service status"
echo "  docker stats                      # Monitor resource usage"
echo ""
