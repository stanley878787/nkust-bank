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
from users.views import LoginPage, RegistrationPage, DashboardPage, ForgetPasswordPage, TransferPage, InvestPage, RecivePage, AnalysisPage, PersonalPage
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # 根路由 顯示登入頁
    path('', LoginPage.as_view(), name='root_login'),

    # （可選）同時保留 /login/ 指向同一頁
    path('login/', LoginPage.as_view(), name='login_page'),

    # 註冊頁面
    path('register/', RegistrationPage.as_view(), name="register_page"),

    # 顯示忘記密碼頁面
    path('forgetpassword/', ForgetPasswordPage.as_view(), name='forget_password_page'),

    # 首頁
    path('dashboard/', DashboardPage.as_view(), name="dashboard_page"),

    # 轉帳
    path('transfer/', TransferPage.as_view(), name="transfer_page"),

    # 投資
    path('invest/', InvestPage.as_view(), name="invest_page"),

    # 明細
    path('recive/', RecivePage.as_view(), name="recive_page"),

    # 分析
    path('analysis/', AnalysisPage.as_view(), name='analysis_page'),

    #個人資料
    path('personal/', PersonalPage.as_view(), name='personal_page'),

    # 投資
    path('investments/', include('investments.urls')),

    # 管理後台
    path('admin/', admin.site.urls),

    # 使用者相關 API（含 POST /auth/login/）
    path('api/v1/', include('users.urls', namespace='users')),

    path("api/v1/", include( ("accounts.urls","accounts"), namespace='accounts' )),

    # 把 personal app 的 URL 加進來
    path('personal/', include('personal.urls')),

    # Captcha 圖形驗證碼
    path('captcha/', include('captcha.urls')),

    # 取得新的 access/refresh token
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # 透過 refresh token 拿新的 access token
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
