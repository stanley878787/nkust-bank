from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    自訂 User 模型：
      - id_number: 身分證字號（唯一）
      - user_code: 使用者代碼（唯一）
      - phone:     手機號碼（唯一）
    """

    id_number = models.CharField(
        "身分證字號",
        max_length=10,
        unique=True,
        help_text="輸入格式如 A123456789"
    )
    user_code = models.CharField(
        "使用者代碼",
        max_length=20,
        unique=True,
        help_text="6–20 字元，可含大小寫與數字"
    )
    phone = models.CharField(
        "手機號碼",
        max_length=15,
        unique=True,
        help_text="格式：09xxxxxxxx"
    )
    # 新增：使用者頭像欄位（圖片）
    # 改成用 TextField 存 Base64
    avatar_base64 = models.TextField(blank=True, null=True)

    # AbstractUser 預設 username, email, password 等欄位都已包含
    REQUIRED_FIELDS = ["id_number", "phone", "email"]
    # 若你希望註冊時 email 必填，可把 email 加到 REQUIRED_FIELDS

    def __str__(self):
        return f"{self.username} ({self.id_number})"