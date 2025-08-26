#!/bin/bash

# Obvia Development Script
# This script helps set up and run the Obvia application in development mode

set -e

echo "🚀 Obvia Development Setup"
echo "=========================="

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

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update the configuration if needed."
else
    echo "✅ .env file already exists"
fi

# Function to wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            echo "✅ $service is healthy"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to become healthy after $max_attempts attempts"
    return 1
}

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d mysql redis

# Wait for database to be ready
if wait_for_service mysql; then
    echo "✅ Database is ready"
else
    echo "❌ Database failed to start"
    exit 1
fi

# Wait for Redis to be ready
if wait_for_service redis; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis failed to start"
    exit 1
fi

# Start backend
echo "🐍 Starting backend..."
docker-compose up -d backend

# Wait for backend to be ready
if wait_for_service backend; then
    echo "✅ Backend is ready"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "⚛️  Starting frontend..."
docker-compose up -d frontend

echo ""
echo "🎉 Obvia is now running!"
echo "=========================="
echo "📱 Frontend: http://localhost:5173"
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
echo "🔧 Development commands:"
echo "  docker-compose exec backend python manage.py migrate"
echo "  docker-compose exec backend python manage.py createsuperuser"
echo "  docker-compose exec backend python manage.py seed_books --create-library"
echo ""
