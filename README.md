# NovaForms

A dark enterprise form-builder platform with a futuristic cyberpunk aesthetic. Build dynamic forms, collect responses, analyze data with AI, and manage everything from a real-time admin dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Java 21, Spring Boot 3.4.6 |
| Database | Neon PostgreSQL (prod) / H2 in-memory (dev) |
| Migrations | Flyway |
| Auth | Clerk (optional) / Simulated personas (dev) |
| AI | Google Gemini |
| Storage | Cloudinary |
| Exports | Apache POI (Excel), OpenPDF (PDF) |
| Real-time | Server-Sent Events (SSE) |

## Features

### Form Builder Studio
- 23+ question types: short answer, paragraph, multiple choice, checkboxes, dropdown, star rating, scale, date, email, phone, number, URL, time, datetime, signature pad, address, slider, emoji rating, NPS, ranking, matrix, checkbox matrix, file upload
- Drag-and-drop question reordering
- Multi-page form support
- Live preview iframe
- Autosave with debounce

### Theme System
- 4 built-in presets: Silver, Graphite, Onyx, Cyberpunk
- Custom accent color, border radius, background grid opacity, blur effects
- Theme customizations persist to database and apply on public forms

### Form Lifecycle Management
- States: Draft → Published → Open / Paused / Closed / Archived
- Scheduled open/close with timezone support
- Auto-close after duration
- Business hours (per-day open/close windows)
- Max response limits
- Password protection with BCrypt

### Response Center (Admin Dashboard)
- Searchable and filterable submissions table
- Bulk select and delete
- Export to Excel, CSV, PDF, or ZIP

### Collaboration
- Role-based access: Owner, Editor, Viewer
- Invite collaborators by email
- Ownership transfer workflow (initiate → accept → confirm)

### Public Intake Form
- Geo-IP tracking (browser, OS, device, country, city, referer)
- Completion time measurement
- Canvas signature pad
- File uploads via Cloudinary
- Confetti animation on successful submission
- Custom status pages (closed, paused, scheduled, limit reached)

---

### Feature Status

| Feature | Status | Notes |
|---|---|---|
| Form Builder (23+ types) | ✅ Implemented | All question types functional with inline editing |
| Theme System (4 presets + custom) | ✅ Implemented | Persists to DB via `themeJson`, applied on public forms |
| Conditional Logic | ✅ Implemented | Show/hide/required-if rules between questions, stored as `logicJson` |
| SSE Real-time Updates | ✅ Implemented | Backend `LiveEmitterRegistry` + frontend `EventSource` on admin page |
| Analytics (views, conversion) | ✅ Implemented | Backend `AnalyticsServiceImpl` + `form_views` table, shown in admin stats |
| AI Form Generation | ✅ Implemented | Requires `GEMINI_API_KEY`. No mock fallback — returns unavailable error without key |
| AI Insights (sentiment analysis) | ✅ Implemented | Requires `GEMINI_API_KEY`. Analyzes up to 200 submissions per request |
| Short URLs | ✅ Implemented | Backend `ShortUrlController` at `/s/{code}`, resolves via `sharingJson` shortCode |
| QR Code Generation | ✅ Implemented | Uses external API (`api.qrserver.com`) rendered in builder Sharing section |
| Templates | 🚧 Partial | Backend API + DB seeding (3 templates) implemented. No frontend UI to browse/apply templates yet |
| Theme Studio (custom editor panel) | 🚧 Partial | Theme preset selector + accent color implemented. Full custom editor panel not yet built |
| Export (Excel/CSV/PDF/ZIP) | ✅ Implemented | Backend `ExportServiceImpl` with date range filtering |

---

## AI Policy

AI features are enabled **only** when `GEMINI_API_KEY` is configured. If the key is missing or the Gemini API is unavailable, AI UI is hidden or disabled and the backend returns an appropriate unavailable response. No mock AI generation is implemented.

Model used: `gemini-flash-lite-latest`

---

## API Contract

All API responses follow a standard envelope:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... },
  "timestamp": "2026-06-27T06:00:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

This is enforced by `ApiResponse.java` and `GlobalExceptionHandler.java`. The `requestId` is generated per-request by `RequestIdFilter` and included in both the response body and the `X-Request-ID` response header.

### Frontend Response Handling

Every frontend fetch should unwrap the envelope:

```typescript
const res = await fetch(`${API_BASE}/api/...`);
const json = await res.json();
const data = json.data ?? json;
```

This pattern handles both wrapped (`ApiResponse`) and raw responses consistently.

---

## Project Structure

```
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── layout.tsx         # Root layout (AuthProvider + Header)
│   │   ├── globals.css        # Design system (themes, components, animations)
│   │   ├── AuthProvider.tsx   # Clerk or simulated auth context
│   │   ├── Header.tsx         # Navigation + transfer banner
│   │   ├── page.tsx           # Workspace dashboard (projects list)
│   │   ├── builder/page.tsx   # Form Builder Studio
│   │   ├── form/page.tsx      # Public intake form (respondent-facing)
│   │   ├── admin/page.tsx     # Response Center / Admin Dashboard
│   │   └── dashboard/page.tsx # Redirect shim → /
│   ├── middleware.ts          # Clerk auth middleware
│   └── package.json
│
├── backend/                   # Spring Boot API
│   ├── src/main/java/com/novaforms/
│   │   ├── NovaFormsApplication.java
│   │   └── submission/
│   │       ├── FormConfig.java              # Form entity (questions, settings, lifecycle)
│   │       ├── FormConfigController.java    # CRUD, lifecycle, collaboration, transfers
│   │       ├── Submission.java              # Response entity
│   │       ├── SubmissionController.java    # Submit, list, delete responses
│   │       ├── LifecycleServiceImpl.java    # Dynamic status calculation
│   │       ├── GeminiServiceImpl.java       # AI form generation + analysis (no offline fallback)
│   │       ├── AnalyticsServiceImpl.java    # Views, conversion, completion stats
│   │       ├── ExportServiceImpl.java       # Excel, PDF, CSV, ZIP generation
│   │       ├── LiveEmitterRegistry.java     # SSE broadcast for real-time updates
│   │       ├── CloudinaryStorageService.java
│   │       ├── RateLimitingFilter.java      # Bucket4j rate limiting
│   │       └── ...
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── application-dev.properties       # H2 in-memory config
│   │   ├── application-prod.properties      # Neon PostgreSQL config
│   │   └── db/migration/                    # Flyway V1–V7
│   └── pom.xml
```

## Run Locally

**Prerequisites:** Java 21, Maven, Node.js 18+

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

Starts on `http://localhost:8080`. Uses H2 in-memory database by default (dev profile).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts on `http://localhost:3000`.

> **Both servers must be running simultaneously.** The frontend calls the backend API at `localhost:8080`.

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=           # Optional — leave blank for simulated auth
CLERK_SECRET_KEY=                            # Optional — required only if Clerk key is set
```

### Backend (`backend/.env`)

```env
# Profile: 'dev' (H2) or 'prod' (PostgreSQL)
SPRING_PROFILES_ACTIVE=dev

# Database (only needed for prod)
DATABASE_URL=jdbc:postgresql://localhost:5432/novaforms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# AI — required for AI features, no offline fallback
GEMINI_API_KEY=

# File uploads — required for file question types + banner uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# CORS
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/form-config/{id}` | Get form config with collaborators |
| GET | `/api/form-config/list?email=` | List forms for user |
| POST | `/api/form-config/create` | Create new form |
| POST | `/api/form-config/{id}/save` | Save form config |
| POST | `/api/form-config/{id}/publish` | Publish form |
| POST | `/api/form-config/{id}/pause` | Pause form |
| POST | `/api/form-config/{id}/resume` | Resume form |
| POST | `/api/form-config/{id}/archive` | Archive form |
| GET | `/api/form-config/{id}/intake` | Get public form data + status |
| POST | `/api/submissions` | Submit a response |
| GET | `/api/submissions?formId=` | List responses |
| GET | `/api/export/excel?formId=` | Export to Excel |
| GET | `/api/export/pdf?formId=` | Export to PDF |
| GET | `/api/analytics/form/{id}/stats` | Form analytics |
| GET | `/api/ai/generate?prompt=` | AI form generation (requires key) |
| GET | `/api/ai/analyze/{formId}` | AI sentiment analysis (requires key) |
| GET | `/api/live/submissions?formId=` | SSE real-time stream |
| POST | `/api/storage/upload` | Upload file to Cloudinary |
| GET | `/api/templates` | List templates |
| GET | `/s/{code}` | Short URL redirect |
| GET | `/api/health` | Health check |

## Database Migrations

| Version | Description |
|---|---|
| V1 | Base tables: form_configs, collaborators, transfer_requests, submissions |
| V2 | Added settings_json to form_configs |
| V3 | File metadata table for Cloudinary uploads |
| V4 | Form lifecycle fields (status, published, open/close times, access mode, password) |
| V5 | Visibility, auto-close duration, business hours, status pages |
| V6 | Refactored lifecycle states (publish_state, manual_state, audit fields) |
| V7 | Conditional logic, theme JSON, sharing JSON, form views analytics, templates |

## Development Commands

### Backend

```bash
# Run dev server (H2 in-memory)
mvn spring-boot:run

# Compile only (verify build)
mvn clean compile
```

### Frontend

```bash
# Run dev server
npm run dev

# Production build (verify)
npm run build
```

## License

Private project.
