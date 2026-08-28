
% Setup and Configuration

This file explains how to configure and run this project on a different machine.

Prerequisites
- Node.js (v18+ recommended) and npm
- Docker & Docker Compose (if using the provided Postgres container)
- Git (to clone the repo)

1. Clone the repo

```bash
git clone <repo-url>
cd resti-backend
```

2. Copy environment variables

Create a `.env` file in the project root. At minimum set:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/resti
JWT_SECRET=replace-with-a-secure-secret
```

Notes:
- If you run Postgres locally, change `DATABASE_URL` accordingly.
- `JWT_SECRET` should be a random string in production.

3. Start the database (recommended using Docker Compose)

```bash
docker compose up -d
```

This repository includes a Docker Compose config that starts a Postgres container used by Prisma.

4. Install dependencies

```bash
npm install
```

5. Generate Prisma client and run migrations

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

If you want to run migrations non-interactively (CI), see Prisma docs. If your DB is empty you may need to run `prisma migrate deploy`.

6. Build and run the app

```bash
npm run build
npm start
```

Or for development use a watcher (optional):

```bash
npx ts-node-dev --respawn src/modules/server.ts
```

7. Quick smoke test

Register a user:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userID":"alice01","email":"alice@example.com","password":"passw0rd"}'
```

Login:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"passw0rd"}'
```

Use the returned `token` for protected routes via `Authorization: Bearer <token>` header.

8. Updating configuration for different environments

- Development: use Docker Compose or a local Postgres instance and a local `.env` file.
- Staging/Production: set `DATABASE_URL` and `JWT_SECRET` through your environment or secrets manager. Ensure TLS and network security for the database.

9. Troubleshooting

- Missing `DATABASE_URL` → check `.env` and that Postgres is running.
- Prisma client errors → run `npx prisma generate` and recompile TypeScript.
- JWT verification errors → ensure both `JWT_SECRET` and issued tokens use the same secret.

10. Additional notes

- If you add new Prisma models or change schema, run `prisma migrate dev` and `npm run build`.
- For CI, prefer `prisma migrate deploy` and use environment variables securely.

If you'd like, I can add a `docker-compose` service for the app itself or create a small Makefile to automate these steps.
