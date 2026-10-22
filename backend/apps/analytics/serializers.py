"""Serializers for User Analytics and Document Activity Tracking."""
from rest_framework import serializers
from apps.analytics.models import DocumentInteraction, ReadingSessionLog


class DocumentInteractionSerializer(serializers.ModelSerializer):
    """Full detail serializer for document interactions and review checklists."""
    document_title = serializers.CharField(source="document.title", read_only=True)
    document_page_count = serializers.IntegerField(source="document.page_count", read_only=True)
    document_file_size = serializers.IntegerField(source="document.file_size_bytes", read_only=True)
    document_status = serializers.CharField(source="document.status", read_only=True)
    formatted_time = serializers.CharField(read_only=True)

    class Meta:
        model = DocumentInteraction
        fields = [
            "id",
            "document",
            "document_title",
            "document_page_count",
            "document_file_size",
            "document_status",
            "total_time_seconds",
            "formatted_time",
            "view_count",
            "last_page_viewed",
            "is_important",
            "important_marked_at",
            "checklist",
            "notes",
            "first_opened_at",
            "last_opened_at",
        ]
        read_only_fields = [
            "id",
            "document",
            "total_time_seconds",
            "view_count",
            "first_opened_at",
            "last_opened_at",
        ]


class HeartbeatTrackTimeSerializer(serializers.Serializer):
    """Payload serializer for periodic reading heartbeats."""
    document_id = serializers.UUIDField(required=True)
    duration_seconds = serializers.IntegerField(default=15, min_value=1, max_value=300)
    page_number = serializers.IntegerField(default=1, min_value=1)


class ChecklistActionSerializer(serializers.Serializer):
    """Payload for adding, toggling, or removing review checklist items."""
    action = serializers.ChoiceField(choices=["add", "toggle", "delete"])
    item_id = serializers.CharField(required=False, allow_blank=True)
    text = serializers.CharField(required=False, allow_blank=True, max_length=255)


class NotesUpdateSerializer(serializers.Serializer):
    """Payload for updating document personal review notes."""
    notes = serializers.CharField(allow_blank=True)


class ReadingSessionLogSerializer(serializers.ModelSerializer):
    """Serializer for reading timeline history."""
    document_title = serializers.CharField(source="document.title", read_only=True)

    class Meta:
        model = ReadingSessionLog
        fields = [
            "id",
            "document",
            "document_title",
            "page_number",
            "duration_seconds",
            "timestamp",
        ]
