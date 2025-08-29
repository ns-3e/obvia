from django.urls import path
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

def health_check(request):
    """Basic health check endpoint."""
    return JsonResponse({'status': 'healthy'})

def health_check_db(request):
    """Database health check."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'database': str(e)}, status=500)

def health_check_cache(request):
    """Cache health check."""
    try:
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        if result == 'ok':
            return JsonResponse({'status': 'healthy', 'cache': 'connected'})
        else:
            return JsonResponse({'status': 'unhealthy', 'cache': 'not working'}, status=500)
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'cache': str(e)}, status=500)

urlpatterns = [
    path('', health_check, name='health'),
    path('db/', health_check_db, name='health-db'),
    path('cache/', health_check_cache, name='health-cache'),
]
