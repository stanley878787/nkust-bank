from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import LoginSerializer, RegistrationSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.generic import TemplateView

from twilio.rest import Client
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

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
        ser = RegistrationSerializer(data=request.data, context={"request": request})
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


class DashboardPage(TemplateView):
    """
    根路由／login/ 頁面的 View
    會 render templates/Dashboard.html
    """
    template_name = "Dashboard.html"


# 建立 Twilio 串接 client
twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


class ForgetPasswordPage(TemplateView):
    """
    根路由／login/ 頁面的 View
    會 render templates/forgetpassword.html
    """
    template_name = "forgetpassword.html"


@csrf_exempt
def send_otp(request):
    """
    前端傳過來一個 JSON，內容 { "phone": "+8869xxxxxxxx" }
    本函式呼叫 Twilio Verify Service 送出驗證碼
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    import json
    try:
        data = json.loads(request.body)
        phone = data.get("phone", "").strip()
        if not phone:
            return JsonResponse({"error": "需要 phone 參數。"}, status=400)

        # 呼叫 Twilio Verify Service 發送驗證碼
        verification = twilio_client.verify \
            .services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verifications \
            .create(to=phone, channel="sms")

        # Twilio 回傳的 status 會是 "pending"
        return JsonResponse({"status": verification.status})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def verify_otp(request):
    """
    前端傳過來 JSON，內容 { "phone": "+8869xxxxxxxx", "code": "123456" }
    呼叫 Twilio Verify Service 檢查驗證碼是否正確
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    import json
    try:
        data = json.loads(request.body)
        phone = data.get("phone", "").strip()
        code  = data.get("code", "").strip()

        if not phone or not code:
            return JsonResponse({"error": "需要 phone 與 code 參數。"}, status=400)

        # 呼叫 Twilio 驗證此 code
        check = twilio_client.verify \
            .services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks \
            .create(to=phone, code=code)

        # 如果驗證成功，status 會是 "approved"
        if check.status == "approved":
            return JsonResponse({"status": "approved"})
        else:
            return JsonResponse({"status": check.status}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)