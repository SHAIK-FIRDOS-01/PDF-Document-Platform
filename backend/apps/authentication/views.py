"""Authentication API views managing registration, login, token rotation, and logout."""
from datetime import timedelta
from typing import Any, Literal, cast
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User, LoginHistory
from apps.authentication.serializers import (
    ChangePasswordSerializer,
    LoginHistorySerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


def get_client_ip(request: Request) -> str:
    """Extract client IP address, handling reverse proxy headers."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return str(request.META.get("REMOTE_ADDR", ""))


def _get_cookie_samesite() -> Literal["Lax", "Strict", "None"]:
    """Resolve strongly-typed samesite configuration from settings."""
    simple_jwt = getattr(settings, "SIMPLE_JWT", {})
    val = str(simple_jwt.get("AUTH_COOKIE_SAMESITE", "Lax")).strip().capitalize()
    return cast(
        Literal["Lax", "Strict", "None"],
        val if val in ("Lax", "Strict", "None") else "Lax",
    )


def set_jwt_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> Response:
    """Set secure HttpOnly cookies for access and refresh JWT tokens."""
    simple_jwt = getattr(settings, "SIMPLE_JWT", {})
    cookie_path: str = str(simple_jwt.get("AUTH_COOKIE_PATH", "/"))
    cookie_samesite = _get_cookie_samesite()
    cookie_secure: bool = bool(simple_jwt.get("AUTH_COOKIE_SECURE", False))
    cookie_http_only: bool = bool(simple_jwt.get("AUTH_COOKIE_HTTP_ONLY", True))

    access_name: str = str(simple_jwt.get("AUTH_COOKIE", "access_token"))
    refresh_name: str = str(simple_jwt.get("AUTH_COOKIE_REFRESH", "refresh_token"))

    access_lifetime = simple_jwt.get("ACCESS_TOKEN_LIFETIME", timedelta(minutes=60))
    refresh_lifetime = simple_jwt.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))

    access_max_age = int(access_lifetime.total_seconds())
    refresh_max_age = int(refresh_lifetime.total_seconds())

    response.set_cookie(
        key=access_name,
        value=access_token,
        max_age=access_max_age,
        httponly=cookie_http_only,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path=cookie_path,
    )
    response.set_cookie(
        key=refresh_name,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=cookie_http_only,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path=cookie_path,
    )
    return response


def clear_jwt_cookies(response: Response) -> Response:
    """Clear HttpOnly authentication cookies on logout."""
    simple_jwt = getattr(settings, "SIMPLE_JWT", {})
    cookie_path: str = str(simple_jwt.get("AUTH_COOKIE_PATH", "/"))
    cookie_samesite = _get_cookie_samesite()

    access_name: str = str(simple_jwt.get("AUTH_COOKIE", "access_token"))
    refresh_name: str = str(simple_jwt.get("AUTH_COOKIE_REFRESH", "refresh_token"))

    response.delete_cookie(access_name, path=cookie_path, samesite=cookie_samesite)
    response.delete_cookie(refresh_name, path=cookie_path, samesite=cookie_samesite)
    return response


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Accepts email and password, creates user, issues HttpOnly cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response_data = {
            "message": "Registration successful",
            "user": UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        return set_jwt_cookies(response, access_token, refresh_token)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Validates credentials, sets HttpOnly cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email: str = serializer.validated_data["email"].strip().lower()
        password: str = serializer.validated_data["password"]
        client_ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

        user = User.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password) or not user.is_active:
            if user:
                LoginHistory.objects.create(
                    user=user,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    is_success=False,
                )
            raise AuthenticationFailed("Invalid email or password.")

        LoginHistory.objects.create(
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            is_success=True,
        )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response_data = {
            "message": "Login successful",
            "user": UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_200_OK)
        return set_jwt_cookies(response, access_token, refresh_token)


class RefreshView(APIView):
    """
    POST /api/auth/refresh/
    Reads refresh token from HttpOnly cookie, rotates tokens, blacklists old token.
    """
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        simple_jwt = getattr(settings, "SIMPLE_JWT", {})
        refresh_name: str = str(simple_jwt.get("AUTH_COOKIE_REFRESH", "refresh_token"))
        raw_refresh_token = request.COOKIES.get(refresh_name)

        if not raw_refresh_token:
            raise AuthenticationFailed("Refresh token cookie missing.")

        try:
            old_refresh = RefreshToken(cast(Any, raw_refresh_token))
            user_id: Any = old_refresh.payload.get("user_id")
            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                raise AuthenticationFailed("User not found or inactive.")

            # Blacklist old refresh token
            old_refresh.blacklist()

            # Issue fresh rotated tokens
            new_refresh = RefreshToken.for_user(user)
            new_access_token = str(new_refresh.access_token)
            new_refresh_token = str(new_refresh)
        except Exception as exc:
            if isinstance(exc, AuthenticationFailed):
                raise exc
            raise AuthenticationFailed(f"Invalid or blacklisted token: {exc}")

        response = Response(
            {"message": "Token refreshed successfully"},
            status=status.HTTP_200_OK,
        )
        return set_jwt_cookies(response, new_access_token, new_refresh_token)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists refresh token and removes HttpOnly cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        simple_jwt = getattr(settings, "SIMPLE_JWT", {})
        refresh_name: str = str(simple_jwt.get("AUTH_COOKIE_REFRESH", "refresh_token"))
        raw_refresh_token = request.COOKIES.get(refresh_name)

        if raw_refresh_token:
            try:
                token = RefreshToken(cast(Any, raw_refresh_token))
                token.blacklist()
            except Exception:
                pass

        response = Response(
            {"message": "Logged out successfully"},
            status=status.HTTP_200_OK,
        )
        return clear_jwt_cookies(response)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/
    Returns authenticated user profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = UserSerializer(request.user)
        data = dict(serializer.data)
        data["user"] = serializer.data
        return Response(data, status=status.HTTP_200_OK)


class ProfileUpdateView(APIView):
    """
    PUT /api/auth/profile/
    Updates user personal profile details.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Verifies existing credentials and updates password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class LoginHistoryView(APIView):
    """
    GET /api/auth/history/
    Retrieves recent auditable login attempts for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        history = LoginHistory.objects.filter(user=request.user)[:25]
        serializer = LoginHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
