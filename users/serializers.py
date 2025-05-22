# users/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from captcha.models import CaptchaStore
# from users.models import User

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    id_number = serializers.CharField(max_length=10)
    user_code = serializers.CharField(max_length=20)
    password  = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get("request") 
        user = authenticate(
            request=request,
            id_number=attrs["id_number"],
            user_code=attrs["user_code"],
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("帳號或密碼錯誤")
            # raise serializers.ValidationError({"detail": "帳號或密碼錯誤"})
        if not user.is_active:
            raise serializers.ValidationError("帳號已停用")
        
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "id_number": user.id_number,
                "user_code": user.user_code,
            },
        }


class RegistrationSerializer(serializers.Serializer):
    id_number        = serializers.CharField(max_length=10)
    phone            = serializers.CharField(max_length=15)
    user_code        = serializers.CharField(min_length=6, max_length=20)
    password         = serializers.CharField(min_length=8, max_length=20, write_only=True)
    confirm_password = serializers.CharField(min_length=8, max_length=20, write_only=True)
    captcha          = serializers.CharField(max_length=6, write_only=True)
    captcha_id       = serializers.CharField(write_only=True)

    def validate_id_number(self, v):
        if User.objects.filter(id_number=v).exists():
            raise serializers.ValidationError("身分證字號已存在")
        return v

    def validate_user_code(self, v):
        if User.objects.filter(user_code=v).exists():
            raise serializers.ValidationError("使用者代號已被使用")
        return v

    def validate_phone(self, v):
        if User.objects.filter(phone=v).exists():
            raise serializers.ValidationError("手機號碼已被使用")
        # 你也可以加上手機格式檢查（Regex）
        return v

    def validate(self, attrs):
        # 1) 密碼一致性
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("兩次輸入的密碼不一致")

        # 2) Captcha 驗證
        if not CaptchaStore.objects.filter(
            hashkey=attrs["captcha_id"],
            response=attrs["captcha"].strip()
        ).exists():
            raise serializers.ValidationError("驗證碼錯誤或已過期")

        return attrs

    def create(self, validated_data):
        # 移除不用的欄位
        validated_data.pop("confirm_password")
        validated_data.pop("captcha")
        validated_data.pop("captcha_id")

        # 用 create_user 會自動 hash password
        user = User.objects.create_user(
            username   = validated_data["user_code"],
            password   = validated_data["password"],
            id_number  = validated_data["id_number"],
            user_code  = validated_data["user_code"],
            phone      = validated_data["phone"],
            email      = validated_data.get("email",""),  # 若有 email 欄位
        )

        # TODO: 這裡可以呼叫 service 幫他自動建立三個帳戶(model accounts)
        # from accounts.services import create_user_accounts
        # create_user_accounts(user)

        return user