"""
PyMuPDF (fitz) parsing routines for extracting text blocks, chapter headings,
metadata, and section hierarchy with exact PDF bounding box coordinates.
"""
from dataclasses import dataclass, field
import re
from typing import Any, Dict, List, Tuple
import pymupdf


@dataclass
class ExtractedSection:
    """An extracted section, chapter heading, or text block with bounding box coordinates."""
    section_index: int
    page_number: int
    title: str
    level: int
    is_heading: bool
    text_content: str
    bounding_box: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentParseResult:
    """Complete result of document extraction containing metadata and section hierarchy."""
    page_count: int
    file_metadata: Dict[str, Any]
    sections: List[ExtractedSection]
    toc: List[Dict[str, Any]]


# Backward compatibility alias
ExtractedChunk = ExtractedSection
ChunkerResult = DocumentParseResult


class PDFCoordinateChunker:
    """
    Parses PDF documents using PyMuPDF to extract text blocks, map chapter and section
    hierarchy, and calculate exact normalized bounding box coordinates.
    """

    HEADING_PATTERNS = [
        re.compile(r"^(chapter|section|part|article)\s+[0-9ivxlcdm]+[:\.\s]?", re.IGNORECASE),
        re.compile(r"^\d+(\.\d+)*\s+[A-Z]"),
        re.compile(r"^[A-Z0-9\s]{4,60}$"),
    ]

    def chunk_pdf_bytes(
        self,
        pdf_bytes: bytes,
        max_words_per_chunk: int = 350,
    ) -> DocumentParseResult:
        """Process in-memory PDF byte stream."""
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        return self._extract_sections(doc, max_words_per_chunk)

    def chunk_pdf_file(
        self,
        file_path: str,
        max_words_per_chunk: int = 350,
    ) -> DocumentParseResult:
        """Process PDF from local file system path."""
        doc = pymupdf.open(file_path)
        return self._extract_sections(doc, max_words_per_chunk)

    def _extract_toc(
        self, doc: pymupdf.Document
    ) -> Tuple[List[Dict[str, Any]], Dict[int, List[Dict[str, Any]]]]:
        """Extract Table of Contents outline items grouped by page."""
        raw_toc = doc.get_toc()
        toc_items: List[Dict[str, Any]] = []
        toc_by_page: Dict[int, List[Dict[str, Any]]] = {}

        for item in raw_toc:
            if len(item) >= 3:
                lvl = int(item[0])
                t_title = str(item[1]).strip()
                p_num = int(item[2])
                toc_entry = {"level": lvl, "title": t_title, "page": p_num}
                toc_items.append(toc_entry)
                toc_by_page.setdefault(p_num, []).append(toc_entry)

        return toc_items, toc_by_page

    def _detect_heading(
        self,
        text: str,
        page_tocs: List[Dict[str, Any]],
        page_number: int,
        block_order: int,
    ) -> Tuple[bool, str, int]:
        """Detect whether text represents a heading via TOC match or regex heuristics."""
        first_line = text.split("\n")[0].strip()

        # Check direct TOC match
        for toc_item in page_tocs:
            if toc_item["title"].lower() in text.lower():
                return True, toc_item["title"], toc_item["level"]

        # Check regex heading patterns
        for pattern in self.HEADING_PATTERNS:
            if pattern.search(first_line) and len(first_line) < 80:
                level = 1 if "chapter" in first_line.lower() else 2
                return True, first_line, level

        default_title = f"Page {page_number} - Section {block_order + 1}"
        return False, default_title, 3

    def _extract_sections(
        self,
        doc: pymupdf.Document,
        max_words: int,
    ) -> DocumentParseResult:
        """Core extraction loop parsing pages, blocks, TOC, and section hierarchy."""
        try:
            page_count = len(doc)
            if page_count == 0:
                raise ValueError("PDF document contains no pages.")

            doc_meta = doc.metadata or {}
            file_metadata = {
                "title": doc_meta.get("title", ""),
                "author": doc_meta.get("author", ""),
                "subject": doc_meta.get("subject", ""),
                "keywords": doc_meta.get("keywords", ""),
                "creator": doc_meta.get("creator", ""),
                "format": doc_meta.get("format", "PDF"),
            }

            toc_items, toc_by_page = self._extract_toc(doc)
            sections: List[ExtractedSection] = []
            section_index = 0

            for page_idx in range(page_count):
                page = doc[page_idx]
                page_number = page_idx + 1
                rect = page.rect
                page_w = float(rect.width)
                page_h = float(rect.height)

                raw_blocks = page.get_text("blocks")
                text_blocks = [
                    b for b in raw_blocks
                    if len(b) >= 7 and b[6] == 0 and b[4].strip()
                ]

                page_tocs = toc_by_page.get(page_number, [])

                for block_order, b in enumerate(text_blocks):
                    x0, y0, x1, y1 = float(b[0]), float(b[1]), float(b[2]), float(b[3])
                    text = b[4].strip()

                    norm_x0 = max(0.0, min(1.0, x0 / page_w)) if page_w > 0 else 0.0
                    norm_y0 = max(0.0, min(1.0, y0 / page_h)) if page_h > 0 else 0.0
                    norm_x1 = max(0.0, min(1.0, x1 / page_w)) if page_w > 0 else 0.0
                    norm_y1 = max(0.0, min(1.0, y1 / page_h)) if page_h > 0 else 0.0

                    is_heading, title, level = self._detect_heading(
                        text, page_tocs, page_number, block_order
                    )

                    bbox = {
                        "x0": round(x0, 2),
                        "y0": round(y0, 2),
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "norm_x0": round(norm_x0, 4),
                        "norm_y0": round(norm_y0, 4),
                        "norm_x1": round(norm_x1, 4),
                        "norm_y1": round(norm_y1, 4),
                        "page_width": round(page_w, 2),
                        "page_height": round(page_h, 2),
                    }

                    metadata = {
                        "page_number": page_number,
                        "block_order": block_order,
                        "word_count": len(text.split()),
                        "char_count": len(text),
                    }

                    sections.append(
                        ExtractedSection(
                            section_index=section_index,
                            page_number=page_number,
                            title=title,
                            level=level,
                            is_heading=is_heading,
                            text_content=text,
                            bounding_box=bbox,
                            metadata=metadata,
                        )
                    )
                    section_index += 1

            return DocumentParseResult(
                page_count=page_count,
                file_metadata=file_metadata,
                sections=sections,
                toc=toc_items,
            )
        finally:
            doc.close()
