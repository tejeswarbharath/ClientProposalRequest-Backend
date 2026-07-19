# ProposalPilot API

## Run locally

1. Create a Neon project and copy its pooled Postgres connection string.
2. Copy `.env.example` to `.env`, then set `DATABASE_URL`.
3. Run `npm install`, `npm run db:migrate`, and `npm run dev`.

The API exposes `GET/POST /api/proposals`, `GET/PUT /api/proposals/:id`, `POST /api/estimates/generate`, and `GET /api/health`.
