"""
URL configuration for bank_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from users.views import LoginPage, RegistrationPage

urlpatterns = [
    # 根路由 顯示登入頁
    path('', LoginPage.as_view(), name='root_login'),

    # （可選）同時保留 /login/ 指向同一頁
    path('login/', LoginPage.as_view(), name='login_page'),

    # 註冊頁面
    path("register/", RegistrationPage.as_view(), name="register_page"),

    # 管理後台
    path('admin/', admin.site.urls),

    # 使用者相關 API（含 POST /auth/login/）
    path('api/v1/', include('users.urls', namespace='users')),

    # Captcha 圖形驗證碼
    path('captcha/', include('captcha.urls')),
]
