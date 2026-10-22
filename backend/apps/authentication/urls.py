"""Authentication API URL routing."""
from django.urls import path
from apps.authentication.views import (
    ChangePasswordView,
    CurrentUserView,
    LoginHistoryView,
    LoginView,
    LogoutView,
    ProfileUpdateView,
    RefreshView,
    RegisterView,
)

app_name = "authentication"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/", LoginView.as_view(), name="token_login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("token/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("profile/", ProfileUpdateView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("history/", LoginHistoryView.as_view(), name="login_history"),
]
