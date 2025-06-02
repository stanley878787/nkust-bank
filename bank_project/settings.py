"""
bank_project/settings.py
完整範例 – Django 4.x             （以 XAMPP/MariaDB、Redis、Celery 為例）
---------------------------------------------------------------------
❶ .env 檔在專案根目錄，負責放機密資訊：
    SECRET_KEY=your-long-random-string
    DB_NAME=bank_sys
    DB_USER=django_user
    DB_PW=super-secure-password
    REDIS_URL=redis://127.0.0.1:6379/0
---------------------------------------------------------------------
"""

from pathlib import Path
import environ, os
from datetime import timedelta

# --------------------------- 基本設定 --------------------------- #
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")


SECRET_KEY   = env("SECRET_KEY")
DEBUG        = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])



# --------------------------- 核心 Apps -------------------------- #
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
    "corsheaders",
    "captcha",
]

LOCAL_APPS = [
    "users",
    "accounts",
    "transactions",
    "investments",
    "common",
    "personal",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------- 中介軟體 ------------------------------ #
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # "common.middleware.AuditLogMiddleware",   # 自訂：寫入 audit_logs
]

ROOT_URLCONF = "bank_project.urls"
WSGI_APPLICATION = "bank_project.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # 你的專案下如果有放 templates/ 資料夾，就加進來
        "DIRS": [ BASE_DIR / "templates" ],
        "APP_DIRS": True,   # 自動尋找各 app 內的 templates/
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",  # admin 需要
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --------------------------- 資料庫 ----------------------------- #
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PW"),
        "HOST": "127.0.0.1",
        "PORT": "3306",
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# MySQL 預設即使用 InnoDB；若要強制： 'ENGINE': 'INNODB'

# -------------------------- 驗證系統 ---------------------------- #
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------- i18n / time zone ----------------------- #
LANGUAGE_CODE = "zh-hant"
TIME_ZONE = "Asia/Taipei"
USE_I18N = True
USE_TZ = True

# ----------------------- Static / Media ------------------------ #
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"         # collectstatic 收集目錄
MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
STATICFILES_DIRS = [ BASE_DIR / "static" ]

# --------------------- Django REST Framework ------------------- #
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DATETIME_FORMAT": "%Y-%m-%d %H:%M:%S",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------- drf-spectacular -------------------------- #
SPECTACULAR_SETTINGS = {
    "TITLE": "Bank System API",
    "DESCRIPTION": "期末專案 - 銀行後端服務",
    "VERSION": "1.0.0",
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
}

# ------------------------ CORS 設定 ----------------------------- #
CORS_ALLOW_ALL_ORIGINS = True   # Demo 階段先全部允許，正式環境請改白名單

# ------------------------- Celery ------------------------------ #
CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# ------------------------- Logging ----------------------------- #
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

# -------------------- Default primary key ---------------------- #
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"



# ----------------------- #
AUTHENTICATION_BACKENDS = [
    "users.auth_backend.IDNumberBackend",
    "django.contrib.auth.backends.ModelBackend",
]


TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE_SID = env("TWILIO_VERIFY_SERVICE_SID")
