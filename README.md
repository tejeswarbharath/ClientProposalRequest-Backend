# ProposalPilot API

## Run locally

1. Create a Neon project and copy its pooled Postgres connection string.
2. Copy `.env.example` to `.env`, then set `DATABASE_URL`.
3. Run `npm install`, `npm run db:migrate`, and `npm run dev`.

The API exposes `POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/auth/me`, `GET/POST /api/proposals`, `GET/PUT /api/proposals/:id`, `POST /api/proposals/:id/attachments`, `GET /api/proposals/:id/attachments/:attachmentId/download`, `POST /api/estimates/generate`, and `GET /api/health`.

All proposal and estimation routes require an `Authorization: Bearer <token>` header. Passwords are stored as bcrypt hashes; signed JSON Web Tokens expire after eight hours.

Attachment uploads support PDF, Word, TXT, CSV, XLS, and XLSX files up to 10 MB. The file data and metadata are stored in Neon under the owning proposal.
