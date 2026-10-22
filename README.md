# PDF Intelligence & User Analytics Platform

> An enterprise-grade full-stack document intelligence platform built with **Python**, **Django REST Framework**, **PyMuPDF**, **React**, and **TailwindCSS**. Combines high-fidelity PDF extraction and spatial coordinate mapping with **top-notch authentication auditing** and **advanced user reading analytics**.

---

## 🌟 Highlights & Core Features

### 1. PyMuPDF Spatial Extraction Engine
- **Page-by-Page Extraction**: Rapidly parses multi-page PDFs, extracts metadata, tables of contents (TOC), and splits pages into structured semantic text blocks.
- **Normalized Bounding Boxes**: Computes precise spatial coordinates `[x0, y0, x1, y1]` for every heading, paragraph, and block for synchronized canvas highlighting.
- **Chapter Hierarchy Recognition**: Automatically infers outline levels (Chapters, H1, H2, and sub-blocks) through outline inspection and font-size heuristics.

### 2. Dual-Pane Split Screen Viewer (`/workspace`)
- **PDF.js Canvas Renderer**: High-performance canvas rendering with page zooming, quick jumping, and page navigation controls.
- **Active Coordinate Overlays**: Clicking any section in the right explorer immediately highlights its bounding box on the original document page.
- **Three Explorer Modes**:
  - `Outline`: Chapter hierarchy and table of contents.
  - `Blocks`: All raw extracted text blocks with word counts and coordinate metadata.
  - `Checklist`: Interactive review tasks, document notes, and live reading statistics.

### 3. Top-Notch Authentication App (`apps.authentication`)
- **HttpOnly Cookie JWT Architecture**: Access and refresh tokens are securely stored in `HttpOnly`, `SameSite=Lax` cookies to prevent client-side token exposure and XSS theft.
- **Custom User Model**: UUID primary keys with email authentication, role-based tiers (`AUDITOR`, `MANAGER`, `VIEWER`), and profile metadata.
- **Auditable Login History (`LoginHistory`)**: Logs every authentication attempt with client IP address, User-Agent browser/OS identification, timestamp, and success/failure status.
- **Account & Security Display (`/account`)**:
  - Live profile editing (First Name, Last Name).
  - Secure password changes with real-time visual password strength verification.
  - Interactive login audit history table.

### 4. Advanced User Analytics App (`apps.analytics`)
- **Reading Time Tracking via Heartbeats**: Automatically sends 15-second background heartbeats (`POST /api/analytics/track-time/`) while a document is open, logging reading time per file and per page.
- **Priority & Importance Flagging**: Toggle any document as **Important** (`★ Important`) directly from the workspace toolbar or the leaderboard.
- **Review Checklist**: Create, check off, or delete document-specific review items (e.g. *"Review Section 3 liability terms"*).
- **Document Notes**: Write and persist detailed review notes directly while examining a document.
- **Comprehensive Analytics Dashboard (`/analytics`)**:
  - **4 KPI Metric Cards**: Total Uploads, Total Reading Duration, Average Time per File, Important Files.
  - **7-Day Reading Velocity Chart**: Interactive bar visualization of daily reading volume.
  - **Reading Time Leaderboard**: Files ranked by engagement time, status, and checklist completion progress.

### 5. Professional Light UI & Collapsible Navigation
- **Light Slate & White Aesthetic**: Clean typography, high-contrast badges, and soft borders.
- **Collapsible Navigation**: Desktop sidebar collapses smoothly with a hamburger toggle button (`☰`), and mobile devices feature a slide-in drawer.

---

## 📐 Architecture & Relational Schema

```
┌─────────────────────────────────────────┐        ┌─────────────────────────────────────────┐
│           authentication_user           │        │      authentication_loginhistory        │
├─────────────────────────────────────────┤        ├─────────────────────────────────────────┤
│ id: UUID (PK)                           │◄───────┤ id: UUID (PK)                           │
│ email: VARCHAR(255) [UNIQUE, INDEX]     │        │ user_id: UUID (FK)                      │
│ first_name: VARCHAR(150)                │        │ ip_address: VARCHAR(45)                 │
│ last_name: VARCHAR(150)                 │        │ user_agent: VARCHAR(500)                │
│ role: VARCHAR(32) ('AUDITOR', 'VIEWER') │        │ is_success: BOOLEAN                     │
│ is_active: BOOLEAN                      │        │ timestamp: DATETIME [INDEX]             │
│ date_joined: DATETIME                   │        └─────────────────────────────────────────┘
└────────────────────┬────────────────────┘
                     │ 1
                     │ 
                     ├──────────────────────────────────────────┐
                     │ N                                        │ N
┌────────────────────▼────────────────────┐        ┌────────────▼────────────────────────────┐
│           documents_document            │        │      analytics_readingsessionlog        │
├─────────────────────────────────────────┤        ├─────────────────────────────────────────┤
│ id: UUID (PK)                           │        │ id: UUID (PK)                           │
│ user_id: UUID (FK -> authentication_user│        │ user_id: UUID (FK -> user)              │
│ title: VARCHAR(255)                     │◄───────┤ document_id: UUID (FK -> document)      │
│ file: VARCHAR(1024)                     │        │ page_number: INT                        │
│ file_size_bytes: BIGINT                 │        │ duration_seconds: INT                   │
│ page_count: INT                         │        │ timestamp: DATETIME [INDEX]             │
│ status: VARCHAR(32) ('PARSED', etc.)    │        └─────────────────────────────────────────┘
│ metadata: JSON                          │
│ created_at: DATETIME [INDEX]            │
└──────┬───────────────────────────┬──────┘
       │ 1                         │ 1
       │                           │ 
       │ N                         │ 1
┌──────▼──────────────────────────┐ ┌──────▼───────────────────────────────────┐
│       documents_section         │ │    analytics_documentinteraction         │
├─────────────────────────────────┤ ├──────────────────────────────────────────┤
│ id: UUID (PK)                   │ │ id: UUID (PK)                            │
│ document_id: UUID (FK -> doc)   │ │ user_id: UUID (FK -> user)               │
│ section_index: INT              │ │ document_id: UUID (FK -> doc) [UNIQUE]   │
│ page_number: INT [INDEX]        │ │ total_time_seconds: INT                  │
│ title: VARCHAR(512)             │ │ view_count: INT                          │
│ level: INT (1: Chapter, 2: H2)  │ │ is_important: BOOLEAN [INDEX]            │
│ is_heading: BOOLEAN [INDEX]     │ │ important_marked_at: DATETIME            │
│ text_content: TEXT              │ │ checklist: JSON ([{id, text, completed}])│
│ bounding_box: JSON [x0,y0,x1,y1]│ │ notes: TEXT                              │
│ created_at: DATETIME            │ │ updated_at: DATETIME                     │
└─────────────────────────────────┘ └──────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
PDF-Document/
├── backend/                         # Django REST Framework application
│   ├── manage.py
│   ├── requirements.txt             # Django, DRF, PyMuPDF, PyMySQL, SimpleJWT
│   ├── core/                        # Root settings, middleware, and URL routing
│   │   ├── settings.py              # Installed apps, database, JWT cookie config
│   │   ├── urls.py                  # API routes mounting auth, docs, analytics
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── authentication/          # App 1: Auth, HttpOnly JWT, LoginHistory
│   │   │   ├── models.py            # User, LoginHistory
│   │   │   ├── serializers.py       # Login, Register, Profile, Password serializers
│   │   │   ├── views.py             # Auth endpoints, login logging, profile updates
│   │   │   └── urls.py              # /api/auth/*
│   │   ├── analytics/               # App 2: User Activity, Time Tracker & Checklist
│   │   │   ├── models.py            # DocumentInteraction, ReadingSessionLog
│   │   │   ├── serializers.py       # Heartbeats, KPI summaries, Checklists
│   │   │   ├── views.py             # TrackReadingTime, Summary, Checklist actions
│   │   │   └── urls.py              # /api/analytics/*
│   │   └── documents/               # Document management & PyMuPDF extractor
│   │       ├── models.py            # Document, DocumentSection
│   │       ├── serializers.py       # Document upload, detail, section serializers
│   │       ├── views.py             # Upload, Sections list, Search
│   │       ├── urls.py              # /api/documents/*
│   │       └── services/
│   │           └── chunking.py      # PyMuPDF spatial coordinate parser
│   └── media/                       # Uploaded PDF document storage
│
├── frontend/                        # React 18 + Vite + TailwindCSS application
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx                  # React Router configuration
│   │   ├── components/
│   │   │   ├── layout/              # TopNav (with user avatar) & SidebarNav (collapsible)
│   │   │   ├── documents/           # Upload modal and document table
│   │   │   └── viewer/              # PDF.js canvas viewer & bounding box overlays
│   │   ├── pages/
│   │   │   ├── auth/                # LoginPage, RegisterPage, AccountPage
│   │   │   ├── documents/           # DocumentsPage (upload & document library)
│   │   │   ├── workspace/           # WorkspacePage (split-screen viewer + checklist)
│   │   │   └── analytics/           # AnalyticsPage (KPI cards, charts, leaderboard)
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication state and cookie bootstrap
│   │   └── services/
│   │       └── api.js               # Axios instance with 401 interceptor & authApi
│
├── sample_pdfs/                     # Sample PDF documents for instant testing
├── .gitignore
└── README.md
```

---

## 🛠️ Technology Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | **Django 5.1 & DRF** | Robust REST API with modular applications |
| **PDF Extraction** | **PyMuPDF (`fitz`)** | Fast C-backed PDF parsing, TOC extraction, bounding box calculations |
| **Security & Auth** | **SimpleJWT + HttpOnly** | XSS-resilient token storage, rotation, and login audit logging |
| **Database** | **SQLite / MySQL** | Normalized schema with foreign key constraints and indexes |
| **Frontend UI** | **React 18 & Vite** | Lightning-fast HMR and modular component architecture |
| **PDF Rendering** | **PDF.js** | HTML5 canvas document rendering with bounding box coordinate overlays |
| **Styling** | **TailwindCSS** | Clean professional light theme (slate & white, blue accents) |
| **Icons** | **Lucide React** | Consistent enterprise icon library |

---

## ⚡ Quick Start Guide

### Prerequisites
- **Git**
- **Python 3.10+**
- **Node.js 18+** and **npm**

---

### Step 0: Clone the Repository

```bash
git clone https://github.com/SHAIK-FIRDOS-01/PDF-Document-Platform.git
cd PDF-Document-Platform
```

---

### Step 1: Backend Setup

1. **Create and activate a Python virtual environment**:
   ```powershell
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\activate

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install backend dependencies**:
   ```powershell
   pip install -r backend\requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `backend\.env.example` to `backend\.env` (defaults to local SQLite and development secret keys):
   ```powershell
   # Windows PowerShell
   Copy-Item backend\.env.example backend\.env

   # Linux / macOS
   cp backend/.env.example backend/.env
   ```

4. **Apply database migrations**:
   ```powershell
   python backend\manage.py migrate
   ```

5. **Seed the Preconfigured Demo User**:
   ```powershell
   python backend\manage.py seed_demo_user
   ```

6. **Start the Django backend server**:
   ```powershell
   python backend\manage.py runserver 127.0.0.1:8000
   ```
   Backend will be running at `http://127.0.0.1:8000/`.

---

### Step 2: Frontend Setup

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Configure Frontend Environment** (optional for local dev with Vite proxy):
   ```powershell
   Copy-Item .env.example .env
   ```

3. **Install Node packages**:
   ```powershell
   npm install
   ```

4. **Start the Vite development server**:
   ```powershell
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173/`.

---

### Default Credentials for Local Testing

A preconfigured demo user is available in the database (or seeded via `python backend\manage.py seed_demo_user`):
- **Email**: `demo@example.com`
- **Password**: `Password123!`
- **Role**: `AUDITOR`

---

## 🌐 API Reference

### 1. Authentication Endpoints (`/api/auth/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | Validates credentials, logs attempt to `LoginHistory`, sets HttpOnly cookies |
| `POST` | `/api/auth/register/` | Registers new user account with role assignment |
| `POST` | `/api/auth/logout/` | Blacklists refresh token and clears auth cookies |
| `GET` | `/api/auth/me/` | Retrieves authenticated user profile |
| `PUT` | `/api/auth/profile/` | Updates user first and last name |
| `POST` | `/api/auth/change-password/` | Validates old password and securely updates password |
| `GET` | `/api/auth/history/` | Returns last 25 login audit history attempts with IP & device |

### 2. Document Management Endpoints (`/api/documents/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents/` | Lists all uploaded documents for the authenticated user |
| `POST` | `/api/documents/` | Uploads a new PDF and triggers PyMuPDF spatial parsing |
| `GET` | `/api/documents/<id>/` | Retrieves document detail and parsing status |
| `GET` | `/api/documents/<id>/sections/` | Lists structured sections, headings, text content, and bounding boxes |
| `DELETE` | `/api/documents/<id>/` | Deletes a document, sections, and associated file |

### 3. User Analytics & Interaction Endpoints (`/api/analytics/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analytics/track-time/` | Ingests 15s reading heartbeat; increments reading duration and creates session log |
| `GET` | `/api/analytics/summary/` | Aggregates total files, reading time, 7-day velocity trend, and leaderboard |
| `GET` | `/api/analytics/documents/` | Lists interaction records for all documents |
| `GET` | `/api/analytics/documents/<doc_id>/` | Retrieves interaction, checklist, and notes for a specific document |
| `POST` | `/api/analytics/documents/<doc_id>/toggle-important/` | Toggles the document's priority important flag (`★ Important`) |
| `POST` | `/api/analytics/documents/<doc_id>/checklist/` | Adds, toggles completion, or removes review checklist tasks |
| `PATCH` | `/api/analytics/documents/<doc_id>/notes/` | Saves and updates user review notes for the document |

---

## 🖥️ Application Pages Overview

1. **Documents Library (`/documents`)**:
   - Upload modal supporting drag-and-drop PDF uploads.
   - Real-time status badges (`Parsed`, `Processing`, `Failed`).
   - Quick launch into Split-Screen Viewer.
2. **Split-Screen Viewer (`/workspace`)**:
   - PDF.js canvas viewer with bounding box coordinate overlays.
   - Live reading timer pill (`⏱️ 02:45 on this file`) with automatic heartbeats.
   - Priority toggle button (`★ Important`).
   - Chapter outline, text blocks explorer, and interactive review checklist.
3. **User Analytics Dashboard (`/analytics`)**:
   - 4 KPI metric cards (Uploads, Total Reading Duration, Average Time, Important Files).
   - 7-day reading velocity bar chart.
   - Priority checklist manager.
   - Reading time leaderboard ranking files by engagement.
4. **Account & Security (`/account`)**:
   - Personal profile editor (First & Last Name).
   - Password change with visual password strength criteria.
   - Auditable login history table displaying recent authentication attempts.

---

## 📄 License
This project is licensed under the MIT License.
