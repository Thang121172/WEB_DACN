from django.http import JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def api_root(request):
    """
    Trả về một phản hồi đơn giản để xác nhận API đang hoạt động.
    """
    return Response({
        "status": "API is operational",
        "service": "Fastfood Backend API",
        "environment": "Production" if not settings.DEBUG else "Development"
    })