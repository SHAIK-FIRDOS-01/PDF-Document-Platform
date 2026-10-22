"""
Document and DocumentSection models supporting PyMuPDF structure extraction,
chapter heading hierarchy, page coordinates, and search indexing for MySQL.
"""
import uuid
from django.conf import settings
from django.db import models


class DocumentStatus(models.TextChoices):
    """Lifecycle state of an uploaded PDF document."""
    PENDING = "PENDING", "Pending Ingestion"
    PARSED = "PARSED", "Parsed & Indexed"
    FAILED = "FAILED", "Processing Failed"


class Document(models.Model):
    """
    Uploaded PDF document record storing metadata, page count, and status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/%Y/%m/")
    file_hash = models.CharField(max_length=64, db_index=True)
    file_size_bytes = models.BigIntegerField(default=0)
    page_count = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=32,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
    )
    error_message = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "documents_document"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"

    @property
    def chunks(self) -> models.QuerySet["DocumentSection"]:
        """Backwards compatibility alias for sections."""
        return self.sections.all()


class DocumentSection(models.Model):
    """
    Extracted text block or section hierarchy unit from a PDF document page.
    Stores chapter headings, hierarchy levels, text, and bounding box coordinates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    section_index = models.PositiveIntegerField()
    page_number = models.PositiveIntegerField()  # 1-indexed page number
    title = models.CharField(max_length=512, default="", blank=True)
    level = models.PositiveIntegerField(default=1)  # 1: Chapter/H1, 2: H2, 3: Paragraph/Block
    is_heading = models.BooleanField(default=False)
    text_content = models.TextField()
    bounding_box = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents_section"
        ordering = ["document", "section_index"]
        indexes = [
            models.Index(fields=["document", "page_number"], name="doc_sec_page_idx"),
            models.Index(fields=["document", "is_heading"], name="doc_sec_heading_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "section_index"],
                name="unique_doc_section_index",
            ),
        ]

    def __str__(self) -> str:
        prefix = f"[H{self.level}] " if self.is_heading else ""
        content = self.title or self.text_content[:30]
        return f"{prefix}Page {self.page_number} (#{self.section_index}): {content}"


# Backward compatibility alias
DocumentChunk = DocumentSection
