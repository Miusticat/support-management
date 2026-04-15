# Support Management

Internal support team management app built with Next.js 16, NextAuth (Discord), and Prisma + PostgreSQL.

## Stack

- Next.js 16 (App Router)
- React 19
- NextAuth v4 with Discord provider
- Prisma ORM
- PostgreSQL

## Requirements

- Node.js 20.9.0 or newer
- npm 10+
- A PostgreSQL database (Neon, Supabase, Railway, etc.)
- Discord application and bot credentials

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

Required variables:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_GUILD_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_ROLE_HEAD_ID`
- `DISCORD_ROLE_SUPPORT_LEAD_ID`
- `DISCORD_ROLE_SUPPORT_TRAINER_ID`
- `DISCORD_ROLE_SUPPORT_ID`
- `DISCORD_ANNOUNCEMENTS_WEBHOOK_URL`
- `DISCORD_ANNOUNCE_KEY`
- `DISCORD_SANCTIONS_WEBHOOK_URL`
- `DISCORD_SANCTIONS_HISTORY_WEBHOOK_URL`
- `DISCORD_SANCTIONS_KEY`

Optional bot-invite variables:

- `DISCORD_BOT_CLIENT_ID`
- `DISCORD_BOT_CLIENT_SECRET`
- `DISCORD_BOT_GUILD_ID`
- `DISCORD_BOT_PERMISSIONS`
- `DISCORD_BOT_LOCK_GUILD`
- `DISCORD_BOT_CODE_GRANT`
- `DISCORD_BOT_REDIRECT_URI`

Optional recruitment sheet variables:

- `GOOGLE_POSTULACIONES_SHEET_URL` (recommended, full Google Sheets URL)
- `GOOGLE_POSTULACIONES_SHEET_ID`
- `GOOGLE_POSTULACIONES_SHEET_GID`

The app will automatically extract `sheetId` and `gid` from `GOOGLE_POSTULACIONES_SHEET_URL`.
If that variable is missing, it falls back to `GOOGLE_POSTULACIONES_SHEET_ID` and `GOOGLE_POSTULACIONES_SHEET_GID`.

## Local Development

Install dependencies:

```bash
npm install
```

Run Prisma migrations in your local database:

```bash
npm run db:migrate:deploy
```

Start development server:

```bash
npm run dev
```

## Production Deployment (Vercel)

This repository is configured so Vercel runs:

- `npm run vercel-build`

That command executes:

1. `prisma migrate deploy`
2. `next build`

### Steps

1. Import this repository in Vercel.
2. Ensure Framework Preset is `Next.js`.
3. In Project Settings -> Environment Variables, add all required env vars from `.env.example`.
4. Set `NEXTAUTH_URL` to your production domain, for example `https://your-project.vercel.app`.
5. Set a strong random `NEXTAUTH_SECRET`.
6. Deploy.

### Database Migration Strategy

- Production migrations are applied during build via `prisma migrate deploy`.
- Never use `prisma migrate dev` in production.

## Useful Scripts

- `npm run dev`: run local development server
- `npm run build`: production build
- `npm run start`: start production server locally
- `npm run lint`: run ESLint
- `npm run db:migrate:deploy`: apply pending migrations
- `npm run vercel-build`: migration + build pipeline for Vercel
