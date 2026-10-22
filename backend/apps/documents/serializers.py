"""Serializers for document management, chapter headings, and section blocks."""
import hashlib
from typing import Any, Dict
from rest_framework import serializers
from apps.documents.models import Document, DocumentSection

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


class DocumentSectionSerializer(serializers.ModelSerializer):
    """Serializer for extracted sections and text blocks with coordinates and heading info."""
    chunk_index = serializers.IntegerField(source="section_index", read_only=True)

    class Meta:
        model = DocumentSection
        fields = [
            "id",
            "document",
            "section_index",
            "chunk_index",
            "page_number",
            "title",
            "level",
            "is_heading",
            "text_content",
            "bounding_box",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


# Backward compatibility alias
DocumentChunkSerializer = DocumentSectionSerializer


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Detailed document status, section count, and metadata serializer."""
    section_count = serializers.SerializerMethodField()
    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "file_hash",
            "file_size_bytes",
            "page_count",
            "status",
            "error_message",
            "metadata",
            "section_count",
            "chunk_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_section_count(self, obj: Document) -> int:
        return obj.sections.count()

    def get_chunk_count(self, obj: Document) -> int:
        return obj.sections.count()


class DocumentUploadSerializer(serializers.Serializer):
    """Validates PDF uploads and computes cryptographic SHA-256 hash."""
    file = serializers.FileField()
    title = serializers.CharField(max_length=255, required=False)

    def validate_file(self, file: Any) -> Any:
        filename = getattr(file, "name", "").lower()
        if not filename.endswith(".pdf"):
            raise serializers.ValidationError("Only PDF documents (.pdf) are supported.")

        if file.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File size exceeds the 50MB maximum limit ({file.size} bytes)."
            )

        # Validate PDF magic header bytes (%PDF-)
        header = file.read(5)
        file.seek(0)
        if not header.startswith(b"%PDF-"):
            raise serializers.ValidationError(
                "Invalid PDF document: File missing '%PDF-' header signature."
            )

        return file

    def create(self, validated_data: Dict[str, Any]) -> Document:
        file = validated_data["file"]
        title = validated_data.get("title") or file.name

        hasher = hashlib.sha256()
        for chunk in file.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        user = self.context["request"].user

        document = Document.objects.create(
            user=user,
            title=title,
            file=file,
            file_hash=file_hash,
            file_size_bytes=file.size,
        )
        return document
