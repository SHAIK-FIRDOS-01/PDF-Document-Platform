"""Serializers for enterprise authentication and user management."""
from typing import Any, Dict
from rest_framework import serializers
from apps.authentication.models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    """Public user profile serializer without sensitive credential leaks."""
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """User registration serializer enforcing email uniqueness and strong passwords."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(required=False, default=UserRole.AUDITOR)

    def validate_role(self, value: str) -> str:
        role_map = {
            "COMPLIANCE_OFFICER": UserRole.AUDITOR,
            "LEGAL_COUNSEL": UserRole.AUDITOR,
            "AUDITOR": UserRole.AUDITOR,
            "VIEWER": UserRole.VIEWER,
        }
        normalized = value.strip().upper() if value else UserRole.AUDITOR
        if normalized in ("ADMIN", "ADMINISTRATOR"):
            raise serializers.ValidationError(
                "Administrative privileges cannot be assigned via public registration."
            )
        resolved = role_map.get(normalized, normalized)
        valid_roles = [UserRole.AUDITOR, UserRole.VIEWER]
        if resolved not in valid_roles:
            raise serializers.ValidationError(
                f"Invalid role '{value}'. Allowed registration roles: {valid_roles}"
            )
        return resolved

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized

    def create(self, validated_data: Dict[str, Any]) -> User:
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", UserRole.AUDITOR),
        )


class LoginSerializer(serializers.Serializer):
    """Credentials validation serializer for email/password authentication."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information."""
    class Meta:
        model = User
        fields = ["first_name", "last_name"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for secure password modification."""
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_old_password(self, value: str) -> str:
        user = self.context.get("request").user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password does not match.")
        return value

    def validate_new_password(self, value: str) -> str:
        old_password = self.initial_data.get("old_password")
        if old_password and value == old_password:
            raise serializers.ValidationError("New password cannot be the same as the old password.")
        return value


class LoginHistorySerializer(serializers.Serializer):
    """Serializer for auditable login history entries."""
    id = serializers.UUIDField(read_only=True)
    ip_address = serializers.CharField(read_only=True)
    user_agent = serializers.CharField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    is_success = serializers.BooleanField(read_only=True)
