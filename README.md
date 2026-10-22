# PDF Intelligence & User Analytics Platform

[![CI Pipeline](https://github.com/SHAIK-FIRDOS-01/PDF-Document-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/SHAIK-FIRDOS-01/PDF-Document-Platform/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1%20%7C%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> An enterprise full-stack document intelligence platform that parses multi-page PDFs into structured semantic hierarchies, maps spatial bounding boxes `[x0, y0, x1, y1]` for synchronized PDF canvas highlighting, and captures document reading telemetry in real time.

---

## 🎯 Executive Summary (For Recruiters & Hiring Managers)

| What It Solves | The Solution | Engineering Differentiator |
| :--- | :--- | :--- |
| **Document Discovery Bottlenecks** | Turns unstructured 100+ page PDFs into interactive, searchable chapter trees & block coordinates | C-accelerated **PyMuPDF** spatial engine extracting normalized bounding boxes |
| **Disjointed Document Review** | Synchronized dual-pane workspace linking raw text blocks to exact PDF canvas coordinates | Custom **PDF.js** canvas overlay synchronized with chapter hierarchy |
| **Token Theft & Session Vulnerabilities** | Zero-trust authentication with auditable access logs | **HttpOnly + SameSite** JWT cookie rotation (immune to XSS/localStorage theft) |
| **Auditor Productivity Blindspots** | Real-time reading engagement metrics and review task checklists | **15s non-blocking heartbeats** feeding an analytics leaderboard & velocity chart |

---

## ⚡ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS, PDF.js, Lucide Icons, Axios |
| **Backend** | Python 3.11, Django 5.1, Django REST Framework, SimpleJWT |
| **PDF Extraction** | PyMuPDF (`fitz`) — high-speed C-native extraction |
| **Database** | SQLite (Local Dev) / MySQL compatible (Production ready) |
| **Security & Auth** | HttpOnly Cookie JWT with automatic refresh rotation, Login Audit History |
| **CI / CD** | GitHub Actions (automated Django checks, migrations test, and Vite builds) |

---

## 🌟 Key Capabilities

### 1. Spatial Coordinate Extraction & Dual-Pane Viewer
- **Semantic Chunking**: Automatically breaks PDFs into Chapters, Headings (H1/H2), and Paragraph blocks using font-size heuristics.
- **Bounding Box Mapping**: Computes `[x0, y0, x1, y1]` coordinates for every section.
- **Synchronized Canvas Overlays**: Clicking any extracted outline item instantly scrolls and highlights the region on the PDF canvas.
- **Three Review Modes**:
  - `Outline`: Table of contents & chapter hierarchy.
  - `Blocks`: Raw text blocks with coordinate metadata & word counts.
  - `Checklist`: Document-specific review tasks, flags, and notes.

### 2. Enterprise Authentication & Security Audit
- **HttpOnly Cookie Architecture**: JWT access and refresh tokens stored exclusively in `HttpOnly`, `SameSite=Lax` cookies — zero risk from client-side script inspection.
- **Login Audit Log (`LoginHistory`)**: Records IP addresses, User-Agent browser/OS metadata, timestamps, and pass/fail states for every login attempt.
- **Account Controls**: Profile editor, visual password strength meter, and session revocation.

### 3. Reading Telemetry & Analytics Dashboard
- **Active Engagement Tracking**: Background 15-second heartbeats record verified reading time per document and per page.
- **Interactive Analytics Dashboard**:
  - **4 KPI Metric Cards**: Total Uploads, Total Reading Time, Avg Duration, Priority Files.
  - **7-Day Velocity Chart**: Daily reading volume trends.
  - **Leaderboard**: Documents ranked by engagement duration and checklist completion.
- **Priority Flagging**: Toggle document priority (`★ Important`) across workspace and dashboard.

---

## 📐 Architecture & Data Model

```
┌─────────────────────────┐          ┌─────────────────────────┐
│   authentication_user   │◄─────────┤   authentication_login  │
│  (UUID, Email, Role)    │    1:N   │ (IP, Device, Timestamp) │
└────────────┬────────────┘          └─────────────────────────┘
             │ 1:N
             ├─────────────────────────────────┐
             │ 1:N                             │ 1:N
┌────────────▼────────────┐          ┌─────────▼───────────────┐
│   documents_document    │◄─────────┤ analytics_readinglog    │
│  (PDF, Metadata, Status)│    1:N   │ (Page, Duration, Date)  │
└──────┬────────────┬─────┘          └─────────────────────────┘
       │ 1:N        │ 1:1
┌──────▼──────┐ ┌───▼──────────────────────┐
│  section    │ │  analytics_interaction   │
│ (BBox, Text)│ │ (Time, Notes, Checklist) │
└─────────────┘ └──────────────────────────┘
```

---

## 🚀 2-Minute Quick Start

### 1. Clone & Set Up Backend
```powershell
# Clone the repository
git clone https://github.com/SHAIK-FIRDOS-01/PDF-Document-Platform.git
cd PDF-Document-Platform

# Activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate

# Install dependencies & prepare database
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python backend\manage.py migrate

# Seed preconfigured demo account & start server
python backend\manage.py seed_demo_user
python backend\manage.py runserver 127.0.0.1:8000
```

### 2. Start Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Credentials (Ready to Test)

A preconfigured auditor account is ready to use immediately:

| Field | Value |
| :--- | :--- |
| **Email** | `demo@example.com` |
| **Password** | `Password123!` |
| **Role** | `Compliance Auditor` |

> 📁 **Sample PDFs Included**: Ready-to-upload SEC 10-K and financial reports are located in the `sample_pdfs/` folder (`apple1.pdf`, `google1.pdf`, `microsoft1.pdf`, etc.).

---

## 🌐 Core API Reference

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/auth/login/` | `POST` | Authenticate, issue HttpOnly JWT cookies, record login audit entry |
| `/api/auth/me/` | `GET` | Fetch authenticated user profile & role |
| `/api/auth/history/` | `GET` | Audit log of recent user authentication attempts |
| `/api/documents/` | `GET` / `POST` | List user documents or upload new PDF for PyMuPDF parsing |
| `/api/documents/<id>/sections/` | `GET` | Return structured sections with normalized bounding boxes `[x0, y0, x1, y1]` |
| `/api/analytics/track-time/` | `POST` | Ingest 15s reading heartbeat and update engagement metrics |
| `/api/analytics/summary/` | `GET` | Aggregated dashboard KPIs, 7-day velocity chart data & leaderboard |
| `/api/analytics/documents/<id>/checklist/`| `POST` | Add, update, or check off compliance review tasks |

---

## 👤 Author & Contact

**Shaik Firdos**
- **GitHub**: [@SHAIK-FIRDOS-01](https://github.com/SHAIK-FIRDOS-01)
- **Repository**: [PDF-Document-Platform](https://github.com/SHAIK-FIRDOS-01/PDF-Document-Platform)
- **Email**: [shaikfirdos403@gmail.com](mailto:shaikfirdos403@gmail.com)
