"""
Django settings for PDF Document Management Platform.
Configured for document parsing, section extraction, and React split-screen viewer.
"""
import os
from pathlib import Path
from datetime import timedelta
from typing import List
from urllib.parse import urlsplit
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from backend/.env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-test-key-for-development-and-harness-gate-verification",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS: List[str] = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0,.onrender.com").split(",")
    if host.strip()
]

# Reverse Proxy SSL Header for Render / cloud deployments
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Core Modular Apps
    "apps.authentication",
    "apps.documents",
    "apps.analytics",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# Database Configuration (Render PostgreSQL via DATABASE_URL, MySQL, or SQLite)
DATABASE_URL = os.getenv("DATABASE_URL")
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite" if not DATABASE_URL else "postgres").lower()

if DATABASE_URL:
    try:
        import dj_database_url

        DATABASES = {
            "default": dj_database_url.config(
                default=DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    except Exception:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
elif DB_ENGINE == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("MYSQL_DATABASE", "pdf_platform_db"),
            "USER": os.getenv("MYSQL_USER", "pdf_user"),
            "PASSWORD": os.getenv("MYSQL_PASSWORD", "pdf_password"),
            "HOST": os.getenv("MYSQL_HOST", "127.0.0.1"),
            "PORT": os.getenv("MYSQL_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }

# Custom User Model
AUTH_USER_MODEL = "authentication.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static & Media Files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.authentication.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

# SimpleJWT Configuration with HttpOnly Cookie Rotation & Bearer Token Support
is_production = (
    not DEBUG
    or bool(DATABASE_URL)
    or bool(os.getenv("RENDER"))
    or os.getenv("JWT_COOKIE_SECURE", "False").lower() in ("true", "1")
)

JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "True" if is_production else "False").lower() in ("true", "1")
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "None" if is_production else "Lax")

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "60"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": JWT_COOKIE_SECURE,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_PATH": "/",
    "AUTH_COOKIE_SAMESITE": JWT_COOKIE_SAMESITE,
}

# Session & CSRF Cookie Settings
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "None" if is_production else "Lax")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "None" if is_production else "Lax")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True" if is_production else "False").lower() in ("true", "1")
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True" if is_production else "False").lower() in ("true", "1")

def _clean_origin(raw: str) -> str:
    """Normalize origin string to scheme://netloc without trailing slashes or paths."""
    trimmed = raw.strip()
    if not trimmed:
        return ""
    if not trimmed.startswith("http://") and not trimmed.startswith("https://"):
        trimmed = f"https://{trimmed}"
    parsed = urlsplit(trimmed)
    if parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return trimmed.rstrip("/")


# CORS Configuration
CORS_ALLOW_CREDENTIALS = True

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pdf-document-platform.vercel.app",
]

cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
if cors_origins_env:
    cleaned_cors = [
        _clean_origin(origin) for origin in cors_origins_env.split(",") if _clean_origin(origin)
    ]
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(cleaned_cors + default_origins))
else:
    CORS_ALLOWED_ORIGINS = default_origins

# Allow any Vercel preview or production deployment domain
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.vercel\.app$",
]

# CSRF Trusted Origins (Required for cross-origin authentication from Vercel)
csrf_origins_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if csrf_origins_env:
    cleaned_csrf = [
        _clean_origin(origin) for origin in csrf_origins_env.split(",") if _clean_origin(origin)
    ]
    CSRF_TRUSTED_ORIGINS = list(
        dict.fromkeys(cleaned_csrf + default_origins + ["https://*.vercel.app", "https://*.onrender.com"])
    )
else:
    CSRF_TRUSTED_ORIGINS = list(
        dict.fromkeys(default_origins + ["https://*.vercel.app", "https://*.onrender.com"])
    )
