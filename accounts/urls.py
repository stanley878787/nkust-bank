# accounts/urls.py 
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, TransferAPIView

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')

urlpatterns = [
    path('', include(router.urls)),
    path('transfer/', TransferAPIView.as_view(), name="transfer"),
]
