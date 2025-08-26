#!/bin/bash

echo "🔍 Docker Container Debug Script"
echo "================================"

# Check if containers are running
echo "📋 Checking container status..."
docker compose ps

echo ""
echo "🔧 Checking frontend container files..."
docker compose exec frontend ls -la /usr/share/nginx/html/
docker compose exec frontend ls -la /usr/share/nginx/html/assets/

echo ""
echo "📄 Checking CSS file content..."
docker compose exec frontend head -20 /usr/share/nginx/html/assets/*.css

echo ""
echo "🌐 Testing frontend access..."
curl -s http://localhost:3000 | head -10

echo ""
echo "🎨 Testing CSS file access..."
CSS_FILE=$(docker compose exec frontend ls /usr/share/nginx/html/assets/*.css | head -1)
if [ ! -z "$CSS_FILE" ]; then
    echo "CSS file found: $CSS_FILE"
    curl -s http://localhost:3000/assets/$(basename $CSS_FILE) | head -5
else
    echo "No CSS file found!"
fi

echo ""
echo "📊 Checking nginx logs..."
docker compose logs frontend --tail=20

echo ""
echo "✅ Debug complete!"
