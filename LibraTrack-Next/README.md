# LibraTrack - Library Resource Management and Analytics System

Admin (Librarian) and Member sides in **one** project. Built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**, with **Lucide** icons.

## Run it (3 steps)

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000 . Needs Node.js 18.18 or newer.

## Temporary accounts

| Role | Email | Password |
|---|---|---|
| Admin (Librarian) | admin@library.com | admin123 |
| Member | member@library.com | member123 |

Other members: `*@school.edu` / `member123`. Anyone can also register a new member account.
The first run creates `data/db.json` with demo data. Admin > Settings > "Reset demo data" restores it.

## Features

- **Login / register**, role-based pages (admin and member cannot open each other's pages; the API checks roles too).
- **Admin**: dashboard analytics (most borrowed, borrow/overdue trend, categories, active members), resources add / edit / delete / search / filter, borrowing and returns, reservations (issue / cancel), fines (mark paid), members (add, activate / deactivate), **PDF and Excel reports** (inventory, circulation, overdue and fines), library rules (loan days, fine per day, renewals, borrow limit).
- **Member**: dashboard, search and classify, borrow, reserve, renew, history, fines, profile and password.
- **Rules**: 14-day loan, PHP 5 fine per overdue day, 2 renewals of 7 days, 5 books per member, overdue books cannot be renewed, reserved copies are protected. All editable in Settings.

## Folder guide

```
src/app/            pages (login, register, admin/*, member/*) and api/* routes
src/components/     UI pieces (ui.tsx buttons/cards/modals/tables, charts, managers)
src/lib/service.ts  ALL library rules (borrow, return, renew, fines, analytics)
src/lib/db.ts       the "database" (JSON file)  <- replace this to use PostgreSQL
src/lib/auth.ts     password hashing + signed session cookie
src/lib/export-*.ts PDF and Excel file writers (no extra packages)
tests/              npm test
```

## Useful commands

`npm run dev` develop - `npm run build` + `npm run start` production - `npm run typecheck` - `npm test`

## Going further (capstone architecture)

- **PostgreSQL / Supabase**: only `src/lib/db.ts` reads and writes data. Replace `readDb` / `writeDb` (or move each function in `service.ts` to SQL) and keep the pages as they are.
- **Vercel**: the JSON file cannot be saved on Vercel, so use a real database there. Set `SESSION_SECRET` to a long random value in production.
- Remove `src/app/api/demo/reset` before a real deployment.

## Honest notes

This project was assembled in an environment without access to the npm registry, so `npm install` and `next dev` were **not** run. Verified instead: strict TypeScript check, 19 automated tests (rules and API), server rendering of every page, generated Tailwind classes, and PDF / Excel output opened with independent readers. If something fails on first run, send me the error message.
