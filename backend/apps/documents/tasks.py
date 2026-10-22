"""
Document parsing pipeline routines for extracting text blocks, chapter headings,
and section hierarchy using PyMuPDF.
"""
import logging
import traceback
from apps.documents.models import Document, DocumentSection, DocumentStatus
from apps.documents.services.chunking import PDFCoordinateChunker

logger = logging.getLogger(__name__)


def parse_and_index_document(document: Document) -> None:
    """
    Parses an uploaded PDF document:
    1. Extracts page count, file metadata, and outline table of contents (TOC).
    2. Segregates text into page-level blocks and maps section/chapter hierarchy.
    3. Calculates exact spatial bounding boxes for frontend canvas overlays.
    4. Persists DocumentSection records and updates Document status to PARSED.
    """
    try:
        document.file.open("rb")
        try:
            pdf_bytes = document.file.read()
        finally:
            document.file.close()

        chunker = PDFCoordinateChunker()
        parse_result = chunker.chunk_pdf_bytes(pdf_bytes)

        if not parse_result.sections:
            raise ValueError("No extractable text blocks found in the uploaded PDF.")

        # Clear any preexisting sections for idempotency
        DocumentSection.objects.filter(document=document).delete()

        # Bulk create extracted sections and headings
        section_objects = [
            DocumentSection(
                document=document,
                section_index=sec.section_index,
                page_number=sec.page_number,
                title=sec.title,
                level=sec.level,
                is_heading=sec.is_heading,
                text_content=sec.text_content,
                bounding_box=sec.bounding_box,
                metadata=sec.metadata,
            )
            for sec in parse_result.sections
        ]
        DocumentSection.objects.bulk_create(section_objects)

        # Update Document record with page count, TOC, and metadata
        document.page_count = parse_result.page_count
        document.status = DocumentStatus.PARSED
        document.metadata = {
            "toc": parse_result.toc,
            **parse_result.file_metadata,
        }
        document.error_message = None
        document.save(update_fields=["page_count", "status", "metadata", "error_message"])

    except Exception as exc:
        logger.exception(f"Document parsing failed for {document.id}: {exc}")
        document.status = DocumentStatus.FAILED
        document.error_message = f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}"
        document.save(update_fields=["status", "error_message"])


def process_document_pipeline(document_id: str) -> None:
    """Synchronous pipeline invocation for document parsing and section indexing."""
    try:
        doc = Document.objects.get(id=document_id)
        parse_and_index_document(doc)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found.")
