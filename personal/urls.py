# personal/urls.py
from django.urls import path
from .views import PersonalInfoView, CredentialsView, AvatarUploadView

urlpatterns = [
    path("api/info/", PersonalInfoView.as_view(), name="personal_info"),

    # 更新 user_code 的 API
    path('api/credentials/', CredentialsView.as_view(), name='personal-credentials'),

    # 更新 avatar 使用者上傳的頭像 的 API
    path('api/avatar/', AvatarUploadView.as_view(),   name='avatar-upload'),
]
