from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import LoginSerializer
from .serializers import RegistrationSerializer
from django.views.generic import TemplateView

class LoginPage(TemplateView):
    """
    根路由／login/ 頁面的 View
    會 render templates/login.html
    """
    template_name = "login.html"

class LoginAPIView(APIView):
    """
    POST /api/v1/auth/login/ 的 API
    依 LoginSerializer 驗證身分證、使用者代號、密碼、captcha
    回傳 {access, refresh, user}
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        return Response(ser.validated_data, status=status.HTTP_200_OK)
    

class RegistrationPage(TemplateView):
    """ 
    GET /register/ → 顯示 registration.html
    """
    template_name = "registration.html"

class RegistrationAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = RegistrationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()

        # 建立 JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id":        user.id,
                "id_number": user.id_number,
                "user_code": user.user_code,
                "phone":     user.phone,
            }
        }, status=status.HTTP_201_CREATED)