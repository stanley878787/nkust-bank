# personal/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
import base64
import re

User = get_user_model()

class PersonalInfoView(APIView):
    """
    GET: 回傳 first_name / last_name / email / phone
    PATCH: 更新 first_name / last_name / email / phone（若 phone 重複，回傳 400）
    """
    permission_classes = [IsAuthenticated]


    def get(self, request, *args, **kwargs):
        user = request.user
        # 直接從資料庫讀 Base64（可能為 None 或空字串）
        avatar_base64 = user.avatar_base64 or ""

        return Response({
            "first_name": user.first_name or "",
            "last_name":  user.last_name or "",
            "email":      user.email or "",
            "phone":      user.phone or "",
            "user_code":  getattr(user, "user_code", "") or "",
            "avatar_url": avatar_base64
        })

    def patch(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        # 如果有要更新 phone，就先檢查是否已被其他使用者使用
        if "phone" in data:
            new_phone = data.get("phone", "").strip()
            if new_phone:
                # 排除自己，若有任何使用者使用了這個號碼，就回傳錯誤
                if User.objects.filter(phone=new_phone).exclude(id=user.id).exists():
                    return Response(
                        {"detail": "此行動電話已被其他使用者使用，請更改為其他號碼。"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.phone = new_phone

        if "first_name" in data:
            user.first_name = data.get("first_name", "").strip()
        if "last_name" in data:
            user.last_name = data.get("last_name", "").strip()
        if "email" in data:
            user.email = data.get("email", "").strip()

        user.save()
        return Response({"detail": "更新成功"}, status=status.HTTP_200_OK)


class CredentialsView(APIView):
    """
    PATCH: 僅更新用戶代號 (user_code)，並同步更新 username
      - user_code：長度需介於 6~20，且不能與其他使用者重複
    只有 Authenticated 使用者可呼叫此 API
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        # 取出 new_user_code（若前端沒傳，就拿空字串）
        new_user_code = data.get("user_code", "").strip()

        # (1) 若前端沒傳 user_code，就回 400
        if not new_user_code:
            return Response(
                {"detail": "請提供 user_code 進行更新。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # (2) 長度驗證：6~20
        if len(new_user_code) < 6 or len(new_user_code) > 20:
            return Response(
                {"detail": "用戶代號長度需介於 6 到 20 字元。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # (3) 唯一性檢查：排除自己，其他人若已使用過就回錯誤
        #     這邊同時檢查 User.user_code 和 User.username
        #     假設你的 User model 既有 user_code 欄位，也使用 username 作帳號登入
        conflict = User.objects.filter(
            user_code=new_user_code
        ).exclude(id=user.id).exists() or User.objects.filter(
            username=new_user_code
        ).exclude(id=user.id).exists()

        if conflict:
            return Response(
                {"detail": "此用戶代號已被其他使用者使用，請更換。"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # (4) 通過檢查，才更新：同時更新 user.user_code & user.username
        user.user_code = new_user_code
        user.username = new_user_code

        # (5) 寫入資料庫
        user.save()

        return Response(
            {"detail": "用戶代號更新成功。"},
            status=status.HTTP_200_OK
        )

class AvatarUploadView(APIView):
    """
    POST: 前端把完整的 Data URI (e.g. "data:image/png;base64,AAA…") 放在 JSON { "avatar_base64": "..."}；
    後端直接檢查開頭並存到 user.avatar_base64。
    """
    permission_classes = [IsAuthenticated]
    # 不需要 MultiPartParser、FormParser，讓它用預設的 JSONParser 即可

    def post(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        # （1）先確定 request.data 裡有 avatar_base64
        avatar_data = data.get("avatar_base64", "").strip()
        if not avatar_data:
            return Response(
                {"detail": "請提供 avatar_base64 欄位（完整的 Data URI）"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # （2）簡單驗證：一定要以 data:image/ 開頭，後面才接 base64
        pattern = r"^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+=*$"
        if not re.match(pattern, avatar_data):
            return Response(
                {"detail": "avatar_base64 格式錯誤，必須是 data:image/png;base64 或 data:image/jpeg;base64 開頭"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # （3）如果你想更確保，還可以把 Base64 解碼一次檢查大小（可選）
        #    這邊範例直接存，假設前端已經檢查過大小／格式

        user.avatar_base64 = avatar_data
        user.save()

        return Response(
            {"detail": "頭像上傳成功", "avatar_base64": user.avatar_base64},
            status=status.HTTP_200_OK
        )