from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuViewSet, MerchantViewSet

router = DefaultRouter()
router.register(r'', MenuViewSet, basename='menu')
router.register(r'merchants', MerchantViewSet, basename='merchant')

urlpatterns = [
    path('', include(router.urls)),
]
