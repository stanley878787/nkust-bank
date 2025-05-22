# users/urls.py
from django.urls import path
from .views import LoginAPIView, RegistrationAPIView

app_name = "users"

urlpatterns = [
    # POST /api/v1/auth/login/ → 登入 API
    path('auth/login/', LoginAPIView.as_view(), name='login_api'),
    path('auth/register/', RegistrationAPIView.as_view(), name='register_api'),
]