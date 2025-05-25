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
import json

# ＜－－ 新增：引入 get_user_model，用來找出使用者
from django.contrib.auth import get_user_model

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
User = get_user_model()   # 取得當前專案的 User model

class ForgetPasswordPage(TemplateView):
    """
    根路由／login/ 頁面的 View
    會 render templates/forgetpassword.html
    """
    template_name = "forgetpassword.html"


def to_local_phone(e164_phone: str) -> str:
    """
    如果傳入的是 +8869XXXXXXXX，就回傳 09XXXXXXXX。
    否則原樣回傳（可自行擴充不同規格）。
    """
    p = e164_phone.strip()
    # 簡單檢查開頭
    if p.startswith("+886") and len(p) == 13 and p[4] == "9":
        return "0" + p[4:]   # "+8869..." → "09..."
    # 若不是預期的 +8869xxx 格式，就原樣回傳（或拋錯）
    return p

@csrf_exempt
def send_otp(request):
    """
    前端傳 { "phone": "+8869XXXXXXXX" }
    1. 先把 +8869… 轉成 09…
    2. 用 09… 去檢查 User 是否存在
    3. 如果存在，才呼叫 Twilio，用原始的 +8869… 去發 OTP
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body)
        e164_phone = data.get("phone", "").strip()  # 例如 "+886912345678"
        if not e164_phone:
            return JsonResponse({"error": "需要 phone 參數。"}, status=400)

        # ── 1. 轉成本地格式（09開頭） ─────────────────────────
        local_phone = to_local_phone(e164_phone)      # 例如 "0912345678"
        # Optional：可先驗證 local_phone 是否符合 /^09\d{8}$/
        if not local_phone.startswith("09") or len(local_phone) != 10:
            return JsonResponse({"error": "不合法的手機號碼格式。"}, status=400)
        # ──────────────────────────────────────────────────────

        # ── 2. 檢查資料庫裡是否有這個 local_phone ────────────
        try:
            User.objects.get(phone=local_phone)
        except User.DoesNotExist:
            return JsonResponse(
                {"error": "此手機號碼尚未註冊，請先確認後再試。"},
                status=404
            )
        # ──────────────────────────────────────────────────────

        # ── 3. 呼叫 Twilio，用原始的 e164_phone（+8869...）去發驗證碼 ──
        verification = twilio_client.verify \
            .services(settings.TWILIO_VERIFY_SERVICE_SID) \
            .verifications \
            .create(to=e164_phone, channel="sms")
        return JsonResponse({"status": verification.status})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
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

# ＜－－ 新增：重設密碼端點
@csrf_exempt
def reset_password(request):
    """
    前端傳來 JSON，內容 { "phone": "+8869xxxxxxxx", "new_password": "...", "confirm_password": "..." }
    1. 先呼叫 to_local_phone() 將 E.164 格式轉成本地 09xxxxxxxx
    2. 用 09xxxxxxxx 去查 User，找不到就回 404
    3. 檢查 new_password / confirm_password 是否一致，再更新
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    e164_phone = data.get("phone", "").strip()           # 例如 "+886912345678"
    new_password = data.get("new_password", "").strip()
    confirm_password = data.get("confirm_password", "").strip()

    # 欄位檢查
    if not e164_phone or not new_password or not confirm_password:
        return JsonResponse({"error": "需要 phone、new_password 及 confirm_password 參數。"}, status=400)

    # 1. 先轉成本地格式
    local_phone = to_local_phone(e164_phone)             # 轉成 "09xxxxxxxx"
    if not local_phone.startswith("09") or len(local_phone) != 10:
        return JsonResponse({"error": "不合法的手機號碼格式。"}, status=400)

    # 2. 檢查密碼一致性
    if new_password != confirm_password:
        return JsonResponse({"error": "兩次輸入的密碼不一致。"}, status=400)

    User = get_user_model()
    try:
        user = User.objects.get(phone=local_phone)
    except User.DoesNotExist:
        return JsonResponse({"error": "找不到對應的使用者。"}, status=404)

    # 3. 更新密碼
    try:
        user.set_password(new_password)
        user.save()
    except Exception as e:
        return JsonResponse({"error": f"更新密碼失敗：{str(e)}"}, status=500)

    return JsonResponse({"status": "success"}, status=200)