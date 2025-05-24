# users/urls.py
from django.urls import path
from .views import (
    LoginAPIView,
    RegistrationAPIView,
    send_otp,
    verify_otp,
)

app_name = "users"

urlpatterns = [
    # POST /api/v1/auth/login/ → 登入 API
    path('auth/login/', LoginAPIView.as_view(), name='login_api'),
    path('auth/register/', RegistrationAPIView.as_view(), name='register_api'),

    # 發送 OTP 驗證碼到手機
    # POST /api/v1/auth/send-otp/ → 需要傳 JSON { "phone": "+8869xxxxxxxx" }
    path('auth/send-otp/', send_otp, name='send_otp'),

    # 驗證 OTP 是否正確
    # POST /api/v1/auth/verify-otp/ → 需要傳 JSON { "phone": "+8869xxxxxxxx", "code": "123456" }
    path('auth/verify-otp/', verify_otp, name='verify_otp'),
]