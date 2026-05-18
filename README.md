# AI Internship Application Copilot

Full-stack internship application workspace built with Vite, React, FastAPI, PostgreSQL, and Docker.

## Stack

- Frontend: Vite, React, TypeScript
- Backend: FastAPI, SQLAlchemy, JWT authentication
- Database: PostgreSQL
- AI: frontend-local outreach draft generation
- Runtime: Docker Compose

## Current scope

Implemented in the first pass:

- Production-shaped monorepo layout
- JWT-based user registration and login
- PostgreSQL schema for users, resumes, job descriptions, applications, and AI analyses
- Seeded sample application data
- Responsive dashboard shell with reusable UI components
- Analytics charts for application progress and response trend

## Project structure

```text
ai-internship-copilot/
├── backend/
│   └── app/
│       ├── api/routes/
│       ├── core/
│       ├── db/
│       ├── models/
│       └── schemas/
├── database/
│   └── init.sql
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── .env.example
└── docker-compose.yml
```

## Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Start the stack:

   ```bash
   docker compose up --build
   ```

3. Open:

   - Frontend: `http://localhost:5173`
   - Backend docs: `http://localhost:8000/docs`
   - Backend health check: `http://localhost:8000/health`

## API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`

## Environment variables

See `.env.example` for all required values.

Outreach Draft generation runs locally in the frontend and does not require an OpenAI API key.
The Vite frontend only needs `VITE_API_URL` for the other backend calls.

## Seed data

The database starts with:

- demo user: `demo@example.com`
- demo password: `demo-password`
- five sample applications across all supported statuses

## Next implementation slice

- Connect auth forms to the backend
- Add resume PDF upload
- Add application CRUD
- Add OpenAI-backed job analysis endpoints
- Replace dashboard sample data with live API responses
