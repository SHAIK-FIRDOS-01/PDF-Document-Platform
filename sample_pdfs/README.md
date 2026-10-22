# Sample PDF Test Documents

This directory contains public SEC 10-K and financial report PDF documents designed for testing the PDF Intelligence Platform:

| File Name | Size | Document Type | Key Features Tested |
| :--- | :--- | :--- | :--- |
| `apple1.pdf` | ~1.5 MB | Corporate Report | Text block extraction, Table of Contents hierarchy |
| `apple2.pdf` | ~1.5 MB | Financial Report | Multi-column tables, heading levels |
| `google1.pdf` | ~2.5 MB | SEC Annual Report | Deep chapter hierarchy, spatial bounding box mapping |
| `google2.pdf` | ~3.6 MB | Quarterly Filing | Dense financial data, multi-page reading tracker |
| `microsoft1.pdf` | ~9.4 MB | Comprehensive 10-K | Stress-testing multi-page rendering and large TOC trees |
| `microsoft2.pdf` | ~8.3 MB | Annual Review | PDF.js canvas rendering and section highlights |

### How to Use
1. Start the backend (`python backend/manage.py runserver`) and frontend (`npm run dev`).
2. Log into the platform at `http://localhost:5173/`.
3. Navigate to **Documents** (`/documents`) and click **Upload PDF**.
4. Choose any of these sample PDFs from `sample_pdfs/` to test instant PyMuPDF spatial parsing, outline extraction, and dual-pane split-screen document exploration.
