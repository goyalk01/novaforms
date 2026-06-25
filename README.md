# NovaForms

NovaForms is a dark enterprise form-submission website with a Next.js frontend, a Java backend, and Neon PostgreSQL persistence.

## Stack

- Frontend: Next.js 15, React 19, TypeScript
- Backend: Java 21, Spring Boot
- Database: Neon PostgreSQL

## Features

- Silver, graphite, and onyx theme presets
- Dark enterprise form builder with live preview
- Rich question blocks, option controls, and field mapping
- Response vault with JSON snapshot storage
- Java API for form submissions
- PostgreSQL storage ready for Neon

## Project Layout

- `frontend/` - Next.js app
- `backend/` - Java API service
- `.github/copilot-instructions.md` - workspace instructions

## Run locally

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

Backend:

```bash
cd backend
mvn spring-boot:run
```

## Environment

Set the backend database URL with Neon connection settings before running the Java service.

## Notes

- The frontend exposes a futuristic form builder with persistence-ready submission data.
- The Java backend stores submissions in Neon PostgreSQL and returns them to the UI.
- If Maven is not installed locally, use a Maven wrapper or install Maven before starting the backend.
