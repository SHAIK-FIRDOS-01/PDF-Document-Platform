"""
User Analytics models for tracking document reading duration, interaction counts,
priority flagging (is_important), and interactive document review checklists.
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.documents.models import Document


class DocumentInteraction(models.Model):
    """
    Per-user interaction state for a specific document, tracking aggregate reading time,
    important bookmark status, and custom review checklist items.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_interactions",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="user_interactions",
    )

    # Time tracking (in seconds)
    total_time_seconds = models.PositiveIntegerField(
        default=0,
        help_text="Cumulative time spent reading/inspecting this document in seconds",
    )
    view_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of distinct viewer opening sessions",
    )
    last_page_viewed = models.PositiveIntegerField(
        default=1,
        help_text="Most recent page number viewed by the user",
    )

    # Priority / Important Checklist Flag
    is_important = models.BooleanField(
        default=False,
        db_index=True,
        help_text="User flag marking document as priority/important",
    )
    important_marked_at = models.DateTimeField(null=True, blank=True)

    # Interactive Document Review Checklist
    # Schema: [{"id": "uuid", "text": "Verify TOC", "completed": bool, "created_at": "iso"}]
    checklist = models.JSONField(
        default=list,
        blank=True,
        help_text="Interactive checklist items for reviewing this document",
    )

    # Personal review notes
    notes = models.TextField(
        blank=True,
        help_text="Personal review annotations or audit observations",
    )

    first_opened_at = models.DateTimeField(auto_now_add=True)
    last_opened_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_document_interaction"
        unique_together = ("user", "document")
        ordering = ["-last_opened_at"]
        indexes = [
            models.Index(fields=["user", "is_important"]),
            models.Index(fields=["user", "-total_time_seconds"]),
        ]

    def __str__(self) -> str:
        status = "★" if self.is_important else " "
        return f"{status} {self.user.email} - {self.document.title} ({self.total_time_seconds}s)"

    @property
    def formatted_time(self) -> str:
        """Human-readable time display (e.g. '12m 34s' or '1h 05m')."""
        total = self.total_time_seconds
        hours = total // 3600
        minutes = (total % 3600) // 60
        seconds = total % 60
        if hours > 0:
            return f"{hours}h {minutes:02d}m"
        if minutes > 0:
            return f"{minutes}m {seconds:02d}s"
        return f"{seconds}s"


class ReadingSessionLog(models.Model):
    """
    Fine-grained log of user reading sessions, recording time chunks per page
    for timeline graphs and daily activity streaks.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_session_logs",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="session_logs",
    )
    page_number = models.PositiveIntegerField(default=1)
    duration_seconds = models.PositiveIntegerField(default=0)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "analytics_reading_session_log"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.document.title} (pg {self.page_number}, {self.duration_seconds}s)"
