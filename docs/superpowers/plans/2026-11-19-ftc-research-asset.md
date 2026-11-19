# FTC Research Asset Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a full-stack Next.js + PostgreSQL + Docker + Adminer web application for Fakultas Teknologi Cerdas (FTC) UDINUS to catalog research product assets (condition, modular floorplan placement, usage guides, completion date, contact person), handle exhibition borrowing & issue reports for unauthenticated PIC Pameran, and provide an authenticated Admin CMS.

**Architecture:** Single Next.js 15 App Router monolith (`node:22-alpine` standalone) serving 5 Stitch-adapted public pages, mobile QR asset detail pages (`/aset/[uuid]`), Admin CMS (`/admin`), and JSON/file Route Handlers over PostgreSQL 16 via Drizzle ORM (`pg`). All primary keys and uploaded filenames use native UUIDs; uploads are split into public media and admin-only private attachments on a persistent Docker volume; the 3-container stack (`ftc_asset_web`, `ftc_asset_db`, `ftc_asset_adminer`) deploys to `/home/serverhaw/web/ftc-asset` on `ssh.haweb.my.id`.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS 3.4 (Stitch `DESIGN.md` tokens), PostgreSQL 16 (`postgres:16-alpine`), Drizzle ORM + `drizzle-kit` + `pg`, Zod, `exceljs`, `qrcode`, Vitest, Docker Compose, Adminer.

**Spec:** [2026-11-19-ftc-research-asset-design.md](file:///c:/Users/ariva/Documents/projek/ftc_asset/docs/superpowers/specs/2026-11-19-ftc-research-asset-design.md)

## Global Constraints

- Tech stack fixed: Next.js, PostgreSQL, Docker (+ Docker Compose), Adminer; ORM is Drizzle (`pg`).
- Branding rebranded everywhere from LPPM UDINUS to **Fakultas Teknologi Cerdas (FTC) UDINUS**; logo copied locally from `stitch_research_asset_management_system/logo_dinus_new.png/screen.png` to `public/images/logo-dinus.png`; zero external `lh3.googleusercontent.com` image URLs in app code.
- Borrower identity type strictly `NIM | NPP | UNIT` — **never NIDN**.
- Every core table PK and uploaded filename uses native PostgreSQL `uuid` (`gen_random_uuid()`) / `crypto.randomUUID()`; all `[uuid]` route and API params validated before DB queries.
- Public portal (`/`, `/aset/[uuid]`, `/denah`, `/peminjaman`, `/tutorial`, `/narahubung`) requires no login; `/admin/**` (except `/admin/login`) and `/api/admin/**` require valid server-side `admin_sessions` cookie.
- Dropped LPPM features must NOT appear: no Level 3 Operator Certification Quiz, no fake HVAC/RH/power/RFID telemetry, no automated WAHA/SMTP outbound notifications (manual `wa.me` links only).
- Server deployment target: `ssh.haweb.my.id` at `/home/serverhaw/web/ftc-asset`; ports fixed to Web `4031:3000`, PostgreSQL `127.0.0.1:4032:5432`, Adminer `4033:8080`.
- Secrets (`POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`, SSH password) live only in `.env` on server / runtime environment — never committed in source files.
- **Ponytail (`full`) coding standard:** Write the smallest clean code that completely solves each task. No speculative wrappers, premature abstractions, or unused dependencies; prefer standard Node/Web APIs (`crypto`, `URL`, `FormData`, native SQL/Drizzle). Mark any intentional simplification with `// shortcut: <limit>, <when to upgrade>`. Never cut trust-boundary validation, security, data-loss protection, or requested features.

## Review Focus

- **Inclusive boundary date overlap (`start_date === existing.end_date`)**: Two bookings touching on the same day must collide (`409` / blocked), while adjacent days (`existing.end_date + 1 day`) must succeed *(pinned in Task 4)*.
- **Magic-byte spoofed uploads and path-traversal filenames**: A `.png` containing `<script>` bytes must fail upload with `400`, and `../../.env` or non-UUID filenames on upload serve routes must fail with `400`/`404`; private attachments must return `401` without admin session *(pinned in Task 3)*.
- **Multi-asset return with mixed conditions**: Returning a loan with Asset A=`prima` and Asset B=`rusak` must restore Asset A to `tersedia` while marking Asset B `condition='rusak'` and `availability='tidak_tersedia'` atomically *(pinned in Task 4 & Task 6)*.
- **Indonesian WhatsApp phone normalization**: Formatting `0812-3456-7890`, `+62 812 3456 7890`, and `6281234567890` into `wa.me` URLs must always produce valid `https://wa.me/6281234567890?text=...` links *(pinned in Task 4)*.
- **Malformed/integer IDs and `NIDN` inputs**: Sequential integer IDs like `/api/assets/1` must return `400` (never a `500` PostgreSQL `22P02` error), and `borrowerIdType: 'NIDN'` must be rejected by Zod with `400` *(pinned in Task 3, Task 4, Task 5)*.

---

## File Structure

- **Root config & Docker:** `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `drizzle.config.ts`, `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `.gitignore`
- **Static assets:** `public/images/logo-dinus.png`, `public/images/placeholders/asset-default.svg`, `public/images/placeholders/avatar-default.svg`
- **Database (`src/db/` & `scripts/`):**
  - `src/db/schema.ts` — 12 Drizzle PostgreSQL tables (`uuid` PKs, constraints, relations)
  - `src/db/index.ts` — `pg.Pool` + Drizzle instance singleton
  - `drizzle/` — Generated PostgreSQL SQL migration files (`npx drizzle-kit generate`)
  - `scripts/init-db.mjs` — Lean plain-Node startup runner (applies Drizzle SQL migrations + idempotent FTC seed using only `pg`, `drizzle-orm`, and `node:crypto` — no `drizzle-kit`/`tsx` in Docker runner)
- **Domain & Security (`src/lib/`):**
  - `src/lib/uuid.ts` — `isValidUuid`, `parseUuidOrThrow`
  - `src/lib/auth.ts` — `hashPassword`, `verifyPassword`, session token creation/verification, `getAdminSession`, `requireAdmin`, cookie helpers
  - `src/lib/uploads.ts` — Magic-byte validated public/private UUID file writer & traversal-safe path resolver
  - `src/lib/validators.ts` — Zod input schemas for every entity and workflow
  - `src/lib/loan-rules.ts` — Date overlap, eligibility, return state transitions, condition-availability invariants, ticket code formatting, `buildWhatsAppUrl`, public DTO sanitizers
  - `src/lib/format.ts` — Indonesian date formatting (`Tanggal Jadi Aset`), condition/availability labels, badge styling maps
- **API Routes (`src/app/api/`):**
  - Auth & uploads: `auth/login`, `auth/logout`, `auth/me`, `uploads/public/[filename]`, `admin/uploads/[filename]`, `admin/uploads`
  - Public: `assets`, `assets/[uuid]`, `assets/[uuid]/qr`, `assets/export`, `locations`, `locations/spotlight`, `loans/public`, `loans/availability`, `loans`, `tutorials`, `contacts`, `issues`, `issues/lookup`
  - Admin CMS: `admin/dashboard`, `admin/assets`, `admin/assets/[uuid]`, `admin/buildings`, `admin/buildings/[uuid]`, `admin/floors`, `admin/floors/[uuid]`, `admin/rooms`, `admin/rooms/[uuid]`, `admin/tutorials`, `admin/tutorials/[uuid]`, `admin/faqs`, `admin/faqs/[uuid]`, `admin/contacts`, `admin/contacts/[uuid]`, `admin/loans`, `admin/loans/[uuid]`, `admin/issues`, `admin/issues/[uuid]`
- **Public UI (`src/app/` & `src/components/`):**
  - `src/app/layout.tsx`, `src/app/globals.css`, `src/components/PublicHeader.tsx`, `src/components/PublicFooter.tsx`, `src/components/StatusBadge.tsx`, `src/components/QrLabelModal.tsx`, `src/components/SafeStepsRenderer.tsx`
  - `src/app/page.tsx` + `src/components/CatalogClient.tsx`
  - `src/app/aset/[uuid]/page.tsx` + `src/components/AssetDetailActions.tsx`
  - `src/app/denah/page.tsx` + `src/components/FloorPlanClient.tsx`
  - `src/app/peminjaman/page.tsx` + `src/components/LoanPortalClient.tsx`
  - `src/app/tutorial/page.tsx` + `src/components/TutorialClient.tsx`
  - `src/app/narahubung/page.tsx` + `src/components/ContactHelpdeskClient.tsx`
- **Admin CMS UI (`src/app/admin/` & `src/components/admin/`):**
  - `src/app/admin/login/page.tsx` (unprotected login route)
  - `src/app/admin/(cms)/layout.tsx`, `src/components/admin/AdminShell.tsx` (server-guarded CMS route group)
  - `src/app/admin/(cms)/page.tsx`
  - `src/app/admin/(cms)/aset/page.tsx` + `src/components/admin/AssetsManager.tsx`
  - `src/app/admin/(cms)/lokasi/page.tsx` + `src/components/admin/LocationsManager.tsx`
  - `src/app/admin/(cms)/tutorial/page.tsx` + `src/components/admin/TutorialsManager.tsx`
  - `src/app/admin/(cms)/narahubung/page.tsx` + `src/components/admin/ContactsManager.tsx`
  - `src/app/admin/(cms)/peminjaman/page.tsx` + `src/components/admin/LoansManager.tsx`
  - `src/app/admin/(cms)/kendala/page.tsx` + `src/components/admin/IssuesManager.tsx`
- **Tests (`tests/`):** `tests/setup.test.ts`, `tests/db/schema.test.ts`, `tests/lib/auth.test.ts`, `tests/lib/uploads.test.ts`, `tests/lib/loan-rules.test.ts`, `tests/lib/validators.test.ts`, `tests/api/public-dtos.test.ts`, `tests/api/admin-guards.test.ts`

---

### Task 1: Project Scaffold, Git Init, Stitch Design Tokens, & Docker Stack

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`
- Create: `src/app/globals.css`, `src/lib/format.ts`
- Create: `public/images/logo-dinus.png` (copied from `stitch_research_asset_management_system/logo_dinus_new.png/screen.png`), `public/images/placeholders/asset-default.svg`, `public/images/placeholders/avatar-default.svg`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Consumes: `stitch_research_asset_management_system/academic_enterprise_research_catalog/DESIGN.md`, `stitch_research_asset_management_system/logo_dinus_new.png/screen.png`
- Produces:
  - `formatIndonesianDate(isoDate: string | Date | null): string` in `src/lib/format.ts`
  - `CONDITION_META`, `AVAILABILITY_META`, `LOAN_STATUS_META`, `URGENCY_META` in `src/lib/format.ts`
  - Tailwind Stitch tokens (`primary`, `primary-container`, `secondary`, `secondary-container`, `surface`, `surface-container-*`, `on-surface*`, `error*`, `space-*`, `gutter`, `headline-*`, `title-*`, `body-*`, `label-*`, `mono-data`) in `tailwind.config.ts`
  - Docker services `ftc_asset_db` (`127.0.0.1:4032:5432`), `ftc_asset_web` (`4031:3000`), `ftc_asset_adminer` (`4033:8080`) in `docker-compose.yml`

- [ ] **Step 1: Initialize Git repository and install core dependencies**

Initialize Git in `c:\Users\ariva\Documents\projek\ftc_asset`, create `.gitignore` (ignoring `node_modules/`, `.next/`, `.env`, `uploads/`, `coverage/`), create `package.json` with scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:push`, `db:seed`) and dependencies (`next@^15.3.0`, `react@^19.0.0`, `react-dom@^19.0.0`, `drizzle-orm`, `pg`, `zod`, `exceljs`, `qrcode`) + devDependencies (`typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg`, `@types/qrcode`, `tailwindcss@^3.4.17`, `postcss`, `autoprefixer`, `drizzle-kit`, `tsx`, `vitest`, `eslint`, `eslint-config-next`). Run `npm install`.

- [ ] **Step 2: Copy local UDINUS logo and create local SVG fallbacks**

Copy `stitch_research_asset_management_system/logo_dinus_new.png/screen.png` to `public/images/logo-dinus.png`. Create clean FTC-themed local fallback SVGs at `public/images/placeholders/asset-default.svg` (16:10 technical blueprint icon) and `public/images/placeholders/avatar-default.svg` (institutional user silhouette).

- [ ] **Step 3: Configure Next.js standalone, Tailwind Stitch tokens, Vitest, and Docker files**

Create:
- `tsconfig.json` (`strict: true`, path alias `@/*` → `./src/*`).
- `next.config.ts` (`output: "standalone"`, `images: { unoptimized: true }`).
- `tailwind.config.ts` containing the exact Stitch color, spacing, borderRadius, and fontSize palette from `DESIGN.md` / `code.html` (`primary: "#003369"`, `primary-container: "#0d4a8e"`, `secondary: "#835500"`, `secondary-container: "#feae2c"`, `surface: "#faf8ff"`, `surface-container-low: "#f2f3ff"`, etc.) and `Plus Jakarta Sans` font family.
- `postcss.config.mjs`, `vitest.config.ts` (resolving `@/` alias), `src/app/globals.css`.
- `.env.example` with placeholders: `DATABASE_URL`, `POSTGRES_DB=ftc_asset`, `POSTGRES_USER=ftc_admin`, `POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD`, `SESSION_SECRET=CHANGE_ME_64_HEX`, `ADMIN_EMAIL=admin@ftc.dinus.ac.id`, `ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASS`, `COOKIE_SECURE=false`, `UPLOAD_DIR=/app/uploads`, `NEXT_PUBLIC_APP_URL=http://ssh.haweb.my.id:4031`.
- `Dockerfile` (3-stage `node:22-alpine`: `deps`, `builder`, `runner` copying standalone output + `drizzle/` migrations + `scripts/init-db.mjs`, exposing `3000`, running `docker-entrypoint.sh` — zero dev tools in runtime image).
- `docker-entrypoint.sh` (POSIX `#!/bin/sh`, `set -e`: creates `$UPLOAD_DIR/public` and `$UPLOAD_DIR/private`, runs `node scripts/init-db.mjs`, executes `exec node server.js`).
- `docker-compose.yml` defining `ftc_asset_db` (`postgres:16-alpine`, `127.0.0.1:4032:5432`, healthcheck `pg_isready`, volume `ftc_asset_pgdata`), `ftc_asset_web` (`4031:3000`, volume `ftc_asset_uploads:/app/uploads`, depends_on healthy DB), and `ftc_asset_adminer` (`adminer:latest`, `4033:8080`, `ADMINER_DEFAULT_SERVER=ftc_asset_db`), all on bridge network `ftc_asset_net` with `restart: unless-stopped`.

- [ ] **Step 4: Write failing test for `src/lib/format.ts` and config invariants**

```ts
// tests/setup.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { formatIndonesianDate, CONDITION_META, AVAILABILITY_META } from '@/lib/format';

describe('format utilities & local assets', () => {
  it('formats ISO date into Indonesian display format', () => {
    expect(formatIndonesianDate('2025-10-28')).toBe('28 Okt 2025');
    expect(formatIndonesianDate(null)).toBe('Belum tercatat');
  });

  it('defines labels for all condition and availability states', () => {
    expect(CONDITION_META.prima.label).toBe('Kondisi Prima');
    expect(CONDITION_META.maintenance.label).toBe('Perawatan / Kalibrasi');
    expect(CONDITION_META.rusak.label).toBe('Perlu Perbaikan');
    expect(AVAILABILITY_META.tersedia.label).toBe('Tersedia');
    expect(AVAILABILITY_META.dipinjam.label).toBe('Sedang Dipinjam');
    expect(AVAILABILITY_META.tidak_tersedia.label).toBe('Tidak Tersedia');
  });

  it('stores UDINUS logo locally', () => {
    expect(existsSync('public/images/logo-dinus.png')).toBe(true);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run tests/setup.test.ts`
Expected: FAIL because `@/lib/format` does not exist yet.

- [ ] **Step 6: Implement `src/lib/format.ts`**

Implement `formatIndonesianDate(isoDate: string | Date | null): string` (deterministic Indonesian month abbreviations `Jan..Des`, timezone-safe for `YYYY-MM-DD` strings), plus `CONDITION_META`, `AVAILABILITY_META`, `LOAN_STATUS_META`, and `URGENCY_META` using the exact Stitch emerald/amber/rose/blue badge classes.

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run tests/setup.test.ts && npm run typecheck`
Expected: PASS (3 tests passing, 0 TypeScript errors).

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs vitest.config.ts .env.example Dockerfile docker-entrypoint.sh docker-compose.yml public/images src/app/globals.css src/lib/format.ts tests/setup.test.ts docs/superpowers
git commit -m "chore: scaffold Next.js app, Stitch design tokens, and Docker stack"
```

---

### Task 2: PostgreSQL Schema (Drizzle Native UUID), SQL Migrations, & Idempotent Seed

**Files:**
- Create: `src/lib/password.ts`, `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle/` (generated SQL migration), `scripts/init-db.mjs`
- Test: `tests/db/schema.test.ts`

**Interfaces:**
- Consumes: `package.json` (`drizzle-orm`, `pg`, `drizzle-kit`)
- Produces:
  - `hashPassword(password: string): string`, `verifyPassword(password: string, stored: string): boolean` in `src/lib/password.ts`
  - All 12 Drizzle table exports in `src/db/schema.ts`: `adminUsers`, `adminSessions`, `buildings`, `floors`, `rooms`, `contacts`, `assets`, `tutorials`, `loans`, `loanItems`, `issueTickets`, `faqs` + exported TypeScript row/insert types (`AssetRow`, `LoanRow`, `RoomRow`, `ContactRow`, `TutorialRow`, `IssueTicketRow`)
  - `db`, `pool` in `src/db/index.ts`
  - `scripts/init-db.mjs` (runs Drizzle SQL migrations from `drizzle/` + idempotent FTC seed with zero TypeScript runtime dependencies)

- [ ] **Step 1: Write failing schema contract test**

```ts
// tests/db/schema.test.ts
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

describe('PostgreSQL Drizzle schema contracts', () => {
  const tables = [
    schema.adminUsers,
    schema.adminSessions,
    schema.buildings,
    schema.floors,
    schema.rooms,
    schema.contacts,
    schema.assets,
    schema.tutorials,
    schema.loans,
    schema.loanItems,
    schema.issueTickets,
    schema.faqs,
  ];

  it('uses native PostgreSQL uuid PK on all 12 tables', () => {
    for (const table of tables) {
      const cfg = getTableConfig(table);
      const idCol = cfg.columns.find((c) => c.name === 'id');
      expect(idCol, `${cfg.name} missing id column`).toBeDefined();
      expect(idCol!.dataType).toBe('string');
      expect(idCol!.columnType).toBe('PgUUID');
      expect(idCol!.primary).toBe(true);
    }
  });

  it('includes completion_date and archived_at on assets', () => {
    const cols = getTableConfig(schema.assets).columns.map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'inventory_code',
        'completion_date',
        'placement_detail',
        'usage_summary',
        'condition',
        'availability',
        'archived_at',
      ]),
    );
  });

  it('records per-item return_condition and return_notes on loan_items and omits return_condition_notes on loans', () => {
    const loanCols = getTableConfig(schema.loans).columns.map((c) => c.name);
    const itemCols = getTableConfig(schema.loanItems).columns.map((c) => c.name);
    expect(loanCols).toContain('borrower_id_type');
    expect(loanCols).not.toContain('return_condition_notes');
    expect(itemCols).toEqual(expect.arrayContaining(['return_condition', 'return_notes']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: FAIL because `@/db/schema` does not exist.

- [ ] **Step 3: Implement `src/lib/password.ts`, `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, generate SQL migration, and implement `scripts/init-db.mjs`**

- `src/lib/password.ts`: `hashPassword(password: string): string` using `crypto.scryptSync` + 16-byte random hex salt (`salt:derivedKeyHex`), and timing-safe `verifyPassword(password: string, stored: string): boolean`.
- `src/db/schema.ts`: Define all 12 tables exactly per Spec Section 5.2 with `uuid('id').defaultRandom().primaryKey()`, unique constraints (`(building_id, floor_number)`, `(loan_id, asset_id)`, unique codes), foreign key delete actions (`loan_items.asset_id` → `onDelete: 'restrict'`, `loan_items.loan_id` → `onDelete: 'cascade'`, `assets.room_id` / `contact_id` → `onDelete: 'set null'`), and `jsonb('specifications').$type<Array<{ label: string; value: string }>>()`.
- `src/db/index.ts`: Export singleton `pool = new Pool({ connectionString: process.env.DATABASE_URL })` and `db = drizzle(pool, { schema })`.
- `drizzle.config.ts`: Point to `./src/db/schema.ts`, out `./drizzle`, dialect `postgresql`, `dbCredentials: { url: process.env.DATABASE_URL! }`. Run `npx drizzle-kit generate` to produce deterministic SQL migrations in `drizzle/`.
- `scripts/init-db.mjs`: Plain Node ESM script using `pg`, `drizzle-orm/node-postgres/migrator`, and `node:crypto` (matching `scryptSync` `salt:hex` format in `src/lib/password.ts`) that:
  1. Applies SQL migrations from `./drizzle`.
  2. Idempotently upserts default FTC Admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
  3. If `buildings` is empty, inserts realistic FTC UDINUS sample data: 2 buildings (`Gedung H — Fakultas Teknologi Cerdas`, `Gedung E — Lab Robotika & IoT FTC`), floors (`Lt. 1`, `Lt. 2`, `Lt. 3`), 5 modular rooms per main floor with `gridZone` (`top`/`bottom`) & `gridColSpan` summing cleanly to 12, 4 FTC contacts (`PIC-FTC-01..04`) with valid WhatsApp numbers, 8 FTC research product assets (e.g., `FTC-IOT-001` Smart Precision Agriculture Node, `FTC-ROB-002` Autonomous Campus Delivery Robot, `FTC-AI-003` Edge Vision Traffic Analytics Box, `FTC-MED-004` Wearable Vital-Sign Telemetry Kit, `FTC-DRN-005` Multispectral Mapping Drone, `FTC-AI-006` Sign-Language Translator Kiosk, `FTC-IOT-007` Smart Flood Early-Warning Buoy, `FTC-ROB-008` 6-DOF Cobot Arm Trainer) across `prima`, `maintenance`, and `rusak` states with realistic `completionDate` (`Tanggal Jadi Aset`), `placementDetail`, `usageSummary`, linked `tutorials` (text steps, checklist, video), 4 `faqs`, 2 sample `loans` (`NIM` and `NPP` borrowers), and 2 sample `issueTickets`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/db/schema.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts src/db drizzle drizzle.config.ts scripts/init-db.mjs tests/db/schema.test.ts
git commit -m "feat: add Drizzle PostgreSQL UUID schema, SQL migration, and idempotent FTC seed"
```

---

### Task 3: UUID Guard, Admin Session Auth, & Split Public/Private Upload Pipeline

**Files:**
- Create: `src/lib/uuid.ts`, `src/lib/auth.ts`, `src/lib/uploads.ts`
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`
- Create: `src/app/api/uploads/public/[filename]/route.ts`, `src/app/api/admin/uploads/[filename]/route.ts`, `src/app/api/admin/uploads/route.ts`
- Test: `tests/lib/auth.test.ts`, `tests/lib/uploads.test.ts`

**Interfaces:**
- Consumes: `src/db/index.ts`, `src/db/schema.ts` (`adminUsers`, `adminSessions`), `src/lib/password.ts`
- Produces:
  - `isValidUuid(value: unknown): value is string` in `src/lib/uuid.ts`
  - `SESSION_COOKIE_NAME`, `hashSessionToken(rawToken: string): string`, `createAdminSession(userId: string): Promise<string>`, `getAdminSession(): Promise<{ userId: string; email: string; name: string } | null>`, `requireAdminApi(): Promise<{ user: { userId: string; email: string; name: string } } | { response: NextResponse }>`, `destroyCurrentSession(): Promise<void>`, `buildSessionCookieOptions(maxAgeSeconds: number)` in `src/lib/auth.ts`
  - `validateMagicBytes(buffer: Buffer, ext: string): boolean`, `saveUploadedFile(file: File, visibility: 'public' | 'private', allowedKind: 'image' | 'document' | 'any'): Promise<{ filename: string; url: string; mimeType: string; size: number }>`, `resolveSafeUploadPath(visibility: 'public' | 'private', filename: string): string | null` in `src/lib/uploads.ts`

- [ ] **Step 1: Write failing tests for UUID validation, auth hashing/sessions, magic-byte validation, and path traversal protection**

```ts
// tests/lib/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import { isValidUuid } from '@/lib/uuid';
import { hashSessionToken, buildSessionCookieOptions } from '@/lib/auth';

describe('uuid & auth primitives', () => {
  it('accepts valid UUIDs and rejects sequential integers or malformed strings', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('1')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });

  it('hashes and verifies passwords with unique random salts', () => {
    const h1 = hashPassword('SuperSecret#2026');
    const h2 = hashPassword('SuperSecret#2026');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('SuperSecret#2026', h1)).toBe(true);
    expect(verifyPassword('WrongPass', h1)).toBe(false);
  });

  it('hashes session tokens deterministically with SHA-256 and sets HttpOnly cookie options', () => {
    const digest = hashSessionToken('raw-token-abc');
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe('raw-token-abc');
    const opts = buildSessionCookieOptions(3600);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });
});
```

```ts
// tests/lib/uploads.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateMagicBytes, resolveSafeUploadPath, saveUploadedFile } from '@/lib/uploads';

describe('secure upload validation & path safety', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ftc-uploads-'));
    process.env.UPLOAD_DIR = tempDir;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.UPLOAD_DIR;
  });

  it('rejects disguised .png containing HTML/script bytes (Review Focus #2)', async () => {
    const fakePng = new File([Buffer.from('<html><script>alert(1)</script></html>')], 'evil.png', {
      type: 'image/png',
    });
    expect(validateMagicBytes(Buffer.from('<html>'), 'png')).toBe(false);
    await expect(saveUploadedFile(fakePng, 'public', 'image')).rejects.toThrow(/signature|format|valid/i);
  });

  it('saves valid PNG with UUID filename into public vs private directory', async () => {
    const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const file = new File([validPngBytes], 'photo.png', { type: 'image/png' });
    const pub = await saveUploadedFile(file, 'public', 'image');
    expect(pub.url).toMatch(/^\/api\/uploads\/public\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(join(tempDir, 'public', pub.filename))).toBe(true);

    const priv = await saveUploadedFile(file, 'private', 'image');
    expect(priv.url).toMatch(/^\/api\/admin\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(join(tempDir, 'private', priv.filename))).toBe(true);
  });

  it('blocks path traversal and non-UUID filenames on serve path resolution (Review Focus #2)', () => {
    expect(resolveSafeUploadPath('public', '../../.env')).toBeNull();
    expect(resolveSafeUploadPath('public', '../private/550e8400-e29b-41d4-a716-446655440000.pdf')).toBeNull();
    expect(resolveSafeUploadPath('public', 'logo.png')).toBeNull();
    const ok = resolveSafeUploadPath('public', '550e8400-e29b-41d4-a716-446655440000.png');
    expect(ok).toContain(join('public', '550e8400-e29b-41d4-a716-446655440000.png'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/auth.test.ts tests/lib/uploads.test.ts`
Expected: FAIL because `@/lib/uuid`, `@/lib/auth`, `@/lib/uploads` do not exist.

- [ ] **Step 3: Implement `src/lib/uuid.ts`, `src/lib/auth.ts`, `src/lib/uploads.ts`, and auth/upload routes**

- `src/lib/uuid.ts`: Strict RFC-4122 UUID regex validation (`isValidUuid`).
- `src/lib/auth.ts`:
  - `SESSION_COOKIE_NAME = 'ftc_admin_session'`.
  - `hashSessionToken(rawToken)` via SHA-256 hex.
  - `createAdminSession(userId)` inserts random 32-byte token hash into `admin_sessions` (7 days TTL) and returns raw token.
  - `getAdminSession()` reads cookie via `next/headers` `cookies()`, joins `admin_sessions` & `admin_users` where `expires_at > NOW()`, returns `{ userId, email, name } | null`.
  - `requireAdminApi()` returns `{ user }` or `{ response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }`.
  - `buildSessionCookieOptions(maxAge)` sets `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: process.env.COOKIE_SECURE === 'true'`.
- `src/lib/uploads.ts`:
  - Magic-byte checks for `jpg`/`jpeg` (`FF D8 FF`), `png` (`89 50 4E 47 0D 0A 1A 0A`), `webp` (`RIFF....WEBP`), and `pdf` (`%PDF-`).
  - Size limits: 5 MB for images, 10 MB for PDFs.
  - Generates `${crypto.randomUUID()}.${ext}`, ensures directory exists, writes buffer, returns `{ filename, url, mimeType, size }`.
  - `resolveSafeUploadPath` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$/i` and verifies resolved path stays inside `join(uploadRoot, visibility)`.
- Routes:
  - `POST /api/auth/login`: Validates `{ email, password }`, verifies scrypt hash, creates DB session, sets cookie, returns `{ user }`.
  - `POST /api/auth/logout`: Deletes DB session & clears cookie.
  - `GET /api/auth/me`: Returns `{ authenticated: boolean, user }`.
  - `GET /api/uploads/public/[filename]`: Serves file with `X-Content-Type-Options: nosniff` and safe MIME type.
  - `GET /api/admin/uploads/[filename]`: Calls `requireAdminApi()` FIRST (returns `401` if unauthenticated), then serves from `private/` with `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
  - `POST /api/admin/uploads`: Calls `requireAdminApi()`, accepts `multipart/form-data` (`file`, `kind: 'image' | 'document'`), writes to `public/` and returns `{ url, filename }`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/lib/auth.test.ts tests/lib/uploads.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/uuid.ts src/lib/auth.ts src/lib/uploads.ts src/app/api/auth src/app/api/uploads src/app/api/admin/uploads tests/lib/auth.test.ts tests/lib/uploads.test.ts
git commit -m "feat: add UUID guard, scrypt session auth, and public/private upload pipeline"
```

---

### Task 4: Domain Rules, Validators, Ticket Formatting, & Public Privacy DTOs

**Files:**
- Create: `src/lib/validators.ts`, `src/lib/loan-rules.ts`
- Test: `tests/lib/validators.test.ts`, `tests/lib/loan-rules.test.ts`

**Interfaces:**
- Consumes: `src/lib/uuid.ts`, `src/db/schema.ts` types
- Produces:
  - Zod schemas in `src/lib/validators.ts`: `assetInputSchema`, `buildingInputSchema`, `floorInputSchema`, `roomInputSchema`, `contactInputSchema`, `tutorialInputSchema`, `faqInputSchema`, `publicLoanInputSchema`, `adminLoanTransitionSchema`, `publicIssueInputSchema`, `adminIssueUpdateSchema`
  - Pure domain functions in `src/lib/loan-rules.ts`:
    - `hasDateRangeOverlap(startA: string, endA: string, startB: string, endB: string): boolean`
    - `checkAssetLoanEligibility(asset: { condition: string; availability: string; archivedAt: Date | null }, existingBookings: Array<{ startDate: string; endDate: string; status: string }>, startDate: string, endDate: string): { ok: true } | { ok: false; reason: string }`
    - `resolveReturnAssetUpdates(items: Array<{ assetId: string; returnCondition: 'prima' | 'maintenance' | 'rusak'; returnNotes?: string | null }>): Array<{ assetId: string; nextCondition: 'prima' | 'maintenance' | 'rusak'; nextAvailability: 'tersedia' | 'tidak_tersedia' }>`
    - `resolveConditionChangeAvailability(currentAvailability: 'tersedia' | 'dipinjam' | 'tidak_tersedia', newCondition: 'prima' | 'maintenance' | 'rusak', requestedAvailability?: 'tersedia' | 'dipinjam' | 'tidak_tersedia'): { availability: 'tersedia' | 'dipinjam' | 'tidak_tersedia'; error?: string }`
    - `formatTicketCode(prefix: 'FTC' | 'FTC-INC', year: number, sequence: number): string`
    - `buildWhatsAppUrl(rawPhone: string, message?: string): string`
    - `sanitizePublicLoan(loan: RawLoanWithItems, includeAdminNotes: boolean): PublicLoanDto`
    - `sanitizePublicIssue(ticket: RawIssueTicket): PublicIssueDto`

- [ ] **Step 1: Write failing tests covering all 5 Review Focus rules**

```ts
// tests/lib/validators.test.ts
import { describe, it, expect } from 'vitest';
import { publicLoanInputSchema, assetInputSchema, adminLoanTransitionSchema } from '@/lib/validators';

describe('Zod domain validators', () => {
  const assetUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts NIM, NPP, and UNIT and rejects NIDN (Review Focus #5)', () => {
    const base = {
      borrowerName: 'Rina Kusuma',
      borrowerIdValue: 'A11.2023.14901',
      borrowerWhatsapp: '081234567890',
      purposeTitle: 'Pameran Expo FTC 2026',
      usageLocationType: 'external',
      externalLocationDetail: 'PRPP Semarang',
      fundingCategory: 'Pameran / Expo FTC',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      dailySession: 'Sesi Penuh (08.00 - 17.00 WIB)',
      assetIds: [assetUuid],
      integrityAgreed: true,
    };

    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NIM' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NPP' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'UNIT' }).success).toBe(true);
    expect(publicLoanInputSchema.safeParse({ ...base, borrowerIdType: 'NIDN' }).success).toBe(false);
  });

  it('rejects > 3 assets, endDate before startDate, or unchecked integrity', () => {
    const ids = [assetUuid, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'];
    expect(publicLoanInputSchema.safeParse({ borrowerName: 'A', borrowerIdType: 'NIM', borrowerIdValue: '1', borrowerWhatsapp: '0812', purposeTitle: 'Expo', usageLocationType: 'internal', fundingCategory: 'Pameran', startDate: '2026-04-12', endDate: '2026-04-10', dailySession: 'Penuh', assetIds: [assetUuid], integrityAgreed: true }).success).toBe(false);
    expect(publicLoanInputSchema.safeParse({ borrowerName: 'A', borrowerIdType: 'NIM', borrowerIdValue: '1', borrowerWhatsapp: '0812', purposeTitle: 'Expo', usageLocationType: 'internal', fundingCategory: 'Pameran', startDate: '2026-04-10', endDate: '2026-04-12', dailySession: 'Penuh', assetIds: ids, integrityAgreed: true }).success).toBe(false);
  });

  it('requires completionDate on asset creation and per-item return conditions when transitioning to returned', () => {
    expect(assetInputSchema.safeParse({ inventoryCode: 'FTC-01', name: 'Robot', category: 'Robotika', description: 'Desc', condition: 'prima', availability: 'tersedia', completionDate: '2025-08-15' }).success).toBe(true);
    expect(adminLoanTransitionSchema.safeParse({ status: 'returned', items: [{ assetId: assetUuid, returnCondition: 'rusak', returnNotes: 'Sensor patah' }] }).success).toBe(true);
    expect(adminLoanTransitionSchema.safeParse({ status: 'returned', items: [] }).success).toBe(false);
  });
});
```

```ts
// tests/lib/loan-rules.test.ts
import { describe, it, expect } from 'vitest';
import {
  hasDateRangeOverlap,
  checkAssetLoanEligibility,
  resolveReturnAssetUpdates,
  resolveConditionChangeAvailability,
  buildWhatsAppUrl,
  sanitizePublicLoan,
  sanitizePublicIssue,
} from '@/lib/loan-rules';

describe('loan & asset domain rules', () => {
  it('treats inclusive boundary dates as overlapping and next-day as free (Review Focus #1)', () => {
    expect(hasDateRangeOverlap('2026-04-10', '2026-04-12', '2026-04-12', '2026-04-14')).toBe(true);
    expect(hasDateRangeOverlap('2026-04-10', '2026-04-12', '2026-04-13', '2026-04-14')).toBe(false);
  });

  it('allows future dates on currently dipinjam asset if non-overlapping, blocks rusak/archived', () => {
    const active = [{ startDate: '2026-04-01', endDate: '2026-04-05', status: 'borrowed' }];
    expect(
      checkAssetLoanEligibility({ condition: 'prima', availability: 'dipinjam', archivedAt: null }, active, '2026-04-10', '2026-04-12').ok,
    ).toBe(true);
    expect(
      checkAssetLoanEligibility({ condition: 'prima', availability: 'dipinjam', archivedAt: null }, active, '2026-04-05', '2026-04-06').ok,
    ).toBe(false);
    expect(
      checkAssetLoanEligibility({ condition: 'rusak', availability: 'tidak_tersedia', archivedAt: null }, [], '2026-04-10', '2026-04-12').ok,
    ).toBe(false);
    expect(
      checkAssetLoanEligibility({ condition: 'prima', availability: 'tersedia', archivedAt: new Date() }, [], '2026-04-10', '2026-04-12').ok,
    ).toBe(false);
  });

  it('computes independent per-asset updates on mixed-condition return (Review Focus #3)', () => {
    const updates = resolveReturnAssetUpdates([
      { assetId: 'a1', returnCondition: 'prima' },
      { assetId: 'a2', returnCondition: 'rusak', returnNotes: 'Layar retak' },
      { assetId: 'a3', returnCondition: 'maintenance', returnNotes: 'Perlu kalibrasi' },
    ]);
    expect(updates).toEqual([
      { assetId: 'a1', nextCondition: 'prima', nextAvailability: 'tersedia' },
      { assetId: 'a2', nextCondition: 'rusak', nextAvailability: 'tidak_tersedia' },
      { assetId: 'a3', nextCondition: 'maintenance', nextAvailability: 'tidak_tersedia' },
    ]);
  });

  it('enforces condition-availability invariants and locks dipinjam against manual edits', () => {
    expect(resolveConditionChangeAvailability('tersedia', 'rusak').availability).toBe('tidak_tersedia');
    expect(resolveConditionChangeAvailability('dipinjam', 'rusak').availability).toBe('dipinjam');
    expect(resolveConditionChangeAvailability('dipinjam', 'prima', 'tersedia').error).toBeDefined();
  });

  it('normalizes Indonesian phone formats into valid wa.me URLs (Review Focus #4)', () => {
    expect(buildWhatsAppUrl('0812-3456-7890', 'Halo FTC')).toBe('https://wa.me/6281234567890?text=Halo%20FTC');
    expect(buildWhatsAppUrl('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
  });

  it('strips borrower phone/id/attachment and reporter PII from public DTOs', () => {
    const pubLoan = sanitizePublicLoan(
      {
        id: 'u1',
        ticketCode: 'FTC-2026-0001',
        borrowerName: 'Budi',
        borrowerIdType: 'NIM',
        borrowerIdValue: 'A11.2023.0001',
        borrowerWhatsapp: '08123456789',
        borrowerUnitDetail: 'Teknik Informatika',
        purposeTitle: 'Pameran FTC',
        usageLocationType: 'external',
        startDate: '2026-04-10',
        endDate: '2026-04-12',
        dailySession: 'Penuh',
        attachmentUrl: '/api/admin/uploads/secret.pdf',
        status: 'approved',
        adminNotes: 'Ambil jam 8',
        items: [],
      },
      false,
    );
    expect(pubLoan).not.toHaveProperty('borrowerWhatsapp');
    expect(pubLoan).not.toHaveProperty('borrowerIdValue');
    expect(pubLoan).not.toHaveProperty('attachmentUrl');
    expect(pubLoan).not.toHaveProperty('adminNotes');

    const pubIssue = sanitizePublicIssue({
      id: 'i1',
      ticketCode: 'FTC-INC-2026-0001',
      assetCodeInput: 'FTC-IOT-001',
      reporterName: 'Ani',
      reporterContact: '08999999999',
      category: 'kerusakan',
      urgency: 'darurat',
      description: 'Mati total',
      photoUrl: '/api/admin/uploads/bug.png',
      status: 'open',
      resolutionNotes: null,
      createdAt: new Date(),
    });
    expect(pubIssue).not.toHaveProperty('reporterName');
    expect(pubIssue).not.toHaveProperty('reporterContact');
    expect(pubIssue).not.toHaveProperty('photoUrl');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/validators.test.ts tests/lib/loan-rules.test.ts`
Expected: FAIL because `@/lib/validators` and `@/lib/loan-rules` do not exist.

- [ ] **Step 3: Implement `src/lib/validators.ts` and `src/lib/loan-rules.ts`**

Implement all Zod schemas and pure domain helpers matching the exact signatures above.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/lib/validators.test.ts tests/lib/loan-rules.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators.ts src/lib/loan-rules.ts tests/lib/validators.test.ts tests/lib/loan-rules.test.ts
git commit -m "feat: add Zod validators, loan conflict rules, and public DTO sanitizers"
```

---

### Task 5: Public API Routes (Catalog, XLSX Export, QR Code, Floorplan, Loans, Tutorials, Contacts, Issues)

**Files:**
- Create: `src/lib/export-xlsx.ts`, `src/lib/qr.ts`
- Create: `src/app/api/assets/route.ts`, `src/app/api/assets/[uuid]/route.ts`, `src/app/api/assets/[uuid]/qr/route.ts`, `src/app/api/assets/export/route.ts`
- Create: `src/app/api/locations/route.ts`, `src/app/api/locations/spotlight/route.ts`
- Create: `src/app/api/loans/route.ts`, `src/app/api/loans/public/route.ts`, `src/app/api/loans/availability/route.ts`
- Create: `src/app/api/tutorials/route.ts`, `src/app/api/contacts/route.ts`
- Create: `src/app/api/issues/route.ts`, `src/app/api/issues/lookup/route.ts`
- Test: `tests/api/public-dtos.test.ts`

**Interfaces:**
- Consumes: `src/db/index.ts`, `src/db/schema.ts`, `src/lib/uuid.ts`, `src/lib/uploads.ts`, `src/lib/validators.ts`, `src/lib/loan-rules.ts`, `src/lib/format.ts`
- Produces:
  - `buildAssetsWorkbookBuffer(rows: AssetExportRow[]): Promise<Buffer>` in `src/lib/export-xlsx.ts`
  - `generateAssetQrPngBuffer(assetUrl: string): Promise<Buffer>`, `buildAssetPublicUrl(uuid: string, origin?: string): string` in `src/lib/qr.ts`
  - Public REST endpoints:
    - `GET /api/assets` (filters: `q`, `category`, `roomId`, `condition`, `availability`, `sort`, `page`, `limit`; excludes `archived_at IS NOT NULL`; returns `{ items, total, page, totalPages, kpis, urgentAssets, openIssueCount, filters }`)
    - `GET /api/assets/[uuid]` (`400` on invalid UUID, `404` if missing/archived; returns full asset + room/floor/building + contact + linked tutorials + upcoming approved/borrowed dates)
    - `GET /api/assets/[uuid]/qr` (PNG image encoding `${NEXT_PUBLIC_APP_URL}/aset/${uuid}`)
    - `GET /api/assets/export` (`.xlsx` download with columns: Kode Inventaris, Nama Produk, Kategori, Kondisi, Ketersediaan, Tanggal Jadi Aset, Lokasi & Rak, Narahubung, Tim Peneliti)
    - `GET /api/locations` (buildings → floors → rooms + floor live KPIs + placed active assets)
    - `GET /api/locations/spotlight?q=...` (returns best matching asset with `buildingId`, `floorId`, `roomId`, `assetId`)
    - `POST /api/loans` (handles JSON or `multipart/form-data` with optional private PDF/image attachment, runs atomic conflict check against `approved`/`borrowed` loans, returns `201` with `{ id, ticketCode }` or `409` on conflict)
    - `GET /api/loans/public?q=&status=` (sanitized public active list; when `q` matches exact `ticket_code` or `NIM/NPP/Unit`, includes `adminNotes` while still hiding WhatsApp/attachments)
    - `GET /api/loans/availability?assetId=[uuid]&month=YYYY-MM` (returns approved/borrowed date ranges for calendar highlight)
    - `GET /api/tutorials?q=&category=` (tutorials + linked asset summary + `faqs`)
    - `GET /api/contacts` (contacts + handled non-archived asset count + open issue count)
    - `POST /api/issues` (`multipart/form-data` or JSON with optional private photo upload, auto-links asset by `assetCodeInput` and auto-assigns `assignedContactId` from asset contact if unset, returns `201` `{ id, ticketCode }`)
    - `GET /api/issues/lookup?code=FTC-INC-...` (sanitized status lookup)

- [ ] **Step 1: Write failing tests for XLSX export, QR generation, and UUID param rejection on public asset route**

```ts
// tests/api/public-dtos.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildAssetsWorkbookBuffer } from '@/lib/export-xlsx';
import { generateAssetQrPngBuffer, buildAssetPublicUrl } from '@/lib/qr';
import { GET as getAssetByUuid } from '@/app/api/assets/[uuid]/route';

describe('XLSX export, QR generator, and UUID route guard', () => {
  it('generates valid XLSX buffer containing Tanggal Jadi Aset column', async () => {
    const buf = await buildAssetsWorkbookBuffer([
      {
        inventoryCode: 'FTC-IOT-001',
        name: 'Smart Agriculture Node',
        category: 'IoT & Sensor',
        condition: 'prima',
        availability: 'tersedia',
        completionDate: '2025-09-12',
        locationLabel: 'Gedung H Lt. 3 - H3.03 (Rak A1)',
        contactName: 'M. Yusuf, S.T.',
        researcherTeam: 'Tim IoT FTC',
      },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet('Aset Produk Penelitian FTC');
    expect(ws).toBeDefined();
    expect(ws!.getRow(1).values).toEqual(expect.arrayContaining(['Kode Inventaris', 'Tanggal Jadi Aset', 'Narahubung']));
    expect(ws!.getRow(2).getCell(1).value).toBe('FTC-IOT-001');
  });

  it('generates valid PNG QR code encoding /aset/[uuid]', async () => {
    const url = buildAssetPublicUrl('550e8400-e29b-41d4-a716-446655440000', 'http://ssh.haweb.my.id:4031');
    expect(url).toBe('http://ssh.haweb.my.id:4031/aset/550e8400-e29b-41d4-a716-446655440000');
    const png = await generateAssetQrPngBuffer(url);
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('returns 400 on non-UUID asset parameter without hitting DB (Review Focus #5)', async () => {
    const res = await getAssetByUuid(new Request('http://localhost/api/assets/1'), {
      params: Promise.resolve({ uuid: '1' }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/public-dtos.test.ts`
Expected: FAIL because `@/lib/export-xlsx`, `@/lib/qr`, and `/api/assets/[uuid]/route.ts` do not exist.

- [ ] **Step 3: Implement `src/lib/export-xlsx.ts`, `src/lib/qr.ts`, and all public API route handlers**

Follow exact interfaces above. Ensure every query over `assets` filters `isNull(assets.archivedAt)`. Generate unique sequential `ticket_code` inside a PostgreSQL transaction (using count/max + retry on unique violation) so concurrent submissions never collide.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/api/public-dtos.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-xlsx.ts src/lib/qr.ts src/app/api/assets src/app/api/locations src/app/api/loans src/app/api/tutorials src/app/api/contacts src/app/api/issues tests/api/public-dtos.test.ts
git commit -m "feat: add public API routes, XLSX export, and asset QR generator"
```

---

### Task 6: Admin CMS API Routes (Auth-Protected CRUD & Transactional Workflows)

**Files:**
- Create: `src/app/api/admin/dashboard/route.ts`
- Create: `src/app/api/admin/assets/route.ts`, `src/app/api/admin/assets/[uuid]/route.ts`
- Create: `src/app/api/admin/buildings/route.ts`, `src/app/api/admin/buildings/[uuid]/route.ts`
- Create: `src/app/api/admin/floors/route.ts`, `src/app/api/admin/floors/[uuid]/route.ts`
- Create: `src/app/api/admin/rooms/route.ts`, `src/app/api/admin/rooms/[uuid]/route.ts`
- Create: `src/app/api/admin/tutorials/route.ts`, `src/app/api/admin/tutorials/[uuid]/route.ts`
- Create: `src/app/api/admin/faqs/route.ts`, `src/app/api/admin/faqs/[uuid]/route.ts`
- Create: `src/app/api/admin/contacts/route.ts`, `src/app/api/admin/contacts/[uuid]/route.ts`
- Create: `src/app/api/admin/loans/route.ts`, `src/app/api/admin/loans/[uuid]/route.ts`
- Create: `src/app/api/admin/issues/route.ts`, `src/app/api/admin/issues/[uuid]/route.ts`
- Test: `tests/api/admin-guards.test.ts`

**Interfaces:**
- Consumes: `src/lib/auth.ts` (`requireAdminApi`), `src/lib/uuid.ts`, `src/lib/validators.ts`, `src/lib/loan-rules.ts`, `src/db/index.ts`, `src/db/schema.ts`
- Produces:
  - Authenticated `/api/admin/**` CRUD endpoints returning `401` when unauthenticated and `400` on invalid UUIDs:
    - `PATCH /api/admin/assets/[uuid]`: enforces `resolveConditionChangeAvailability`, supports `{ restore: true }` to unarchive, returns `{ asset, affectedApprovedLoans }` warning when condition becomes `rusak`/`maintenance`.
    - `DELETE /api/admin/assets/[uuid]`: checks `loan_items` count; if `> 0`, sets `archivedAt = new Date()` (blocks if currently in active `borrowed` loan with `409`); if `0`, hard deletes.
    - `PATCH /api/admin/loans/[uuid]`: runs inside `db.transaction`:
      - `pending -> approved`: re-checks date overlap against `approved`/`borrowed` loans (`409` if conflict), sets `approvedAt`.
      - `pending|approved -> rejected|cancelled`: updates status & `adminNotes`.
      - `approved -> borrowed`: sets `borrowedAt`, updates all linked assets' `availability = 'dipinjam'`.
      - `borrowed -> returned`: requires `items: [{ assetId, returnCondition, returnNotes }]` covering every `loan_item`, persists per-item `returnCondition`/`returnNotes`, computes each asset's next `condition` & `availability` via `resolveReturnAssetUpdates`, sets `returnedAt`.
    - `PATCH /api/admin/issues/[uuid]`: updates ticket status & `resolutionNotes`, and when optional `updateAssetCondition` is provided, updates linked asset's `condition` & `availability` in the same transaction.

- [ ] **Step 1: Write failing tests verifying unauthenticated `401` enforcement across Admin endpoints**

```ts
// tests/api/admin-guards.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAdminApi: vi.fn(async () => ({
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  })),
}));

import { GET as getDashboard } from '@/app/api/admin/dashboard/route';
import { POST as createAsset } from '@/app/api/admin/assets/route';
import { PATCH as patchLoan } from '@/app/api/admin/loans/[uuid]/route';
import { PATCH as patchIssue } from '@/app/api/admin/issues/[uuid]/route';
import { GET as getPrivateUpload } from '@/app/api/admin/uploads/[filename]/route';

describe('Admin API auth guard enforcement', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('rejects unauthenticated requests with 401 on dashboard, assets, loans, issues, and private uploads', async () => {
    expect((await getDashboard()).status).toBe(401);
    expect((await createAsset(new Request('http://localhost/api/admin/assets', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect((await patchLoan(new Request('http://localhost/api/admin/loans/' + validUuid, { method: 'PATCH', body: '{}' }), { params: Promise.resolve({ uuid: validUuid }) })).status).toBe(401);
    expect((await patchIssue(new Request('http://localhost/api/admin/issues/' + validUuid, { method: 'PATCH', body: '{}' }), { params: Promise.resolve({ uuid: validUuid }) })).status).toBe(401);
    expect((await getPrivateUpload(new Request('http://localhost/api/admin/uploads/x.pdf'), { params: Promise.resolve({ filename: validUuid + '.pdf' }) })).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/admin-guards.test.ts`
Expected: FAIL because admin route handlers do not exist yet.

- [ ] **Step 3: Implement all `/api/admin/**` route handlers**

Implement every route handler listed above with `requireAdminApi()` on line 1, `isValidUuid()` guard on `[uuid]` params, Zod parsing, clean `409` error handling for PostgreSQL unique violations (`23505`), and transactional integrity for loans/issues/assets.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS across all test suites.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin tests/api/admin-guards.test.ts
git commit -m "feat: add authenticated Admin CMS API routes and transactional loan workflows"
```

---

### Task 7: Shared Stitch Shell & Public Pages Part 1 (`/` Katalog, `/aset/[uuid]` QR Landing, `/denah` Modular Denah)

**Files:**
- Create: `src/app/layout.tsx`, `src/components/PublicHeader.tsx`, `src/components/PublicFooter.tsx`, `src/components/StatusBadge.tsx`, `src/components/QrLabelModal.tsx`, `src/components/SafeStepsRenderer.tsx`
- Create: `src/app/page.tsx`, `src/components/CatalogClient.tsx`
- Create: `src/app/aset/[uuid]/page.tsx`, `src/components/AssetDetailActions.tsx`
- Create: `src/app/denah/page.tsx`, `src/components/FloorPlanClient.tsx`

**Interfaces:**
- Consumes: Public APIs from Task 5, `src/lib/format.ts`, `src/lib/auth.ts` (`getAdminSession` for header state), `src/lib/loan-rules.ts` (`buildWhatsAppUrl`)
- Produces:
  - Shared `PublicHeader` (local `/images/logo-dinus.png`, badge `FTC`, subtitle `Fakultas Teknologi Cerdas (FTC) — Universitas Dian Nuswantoro`, global search bar, `Login Admin` / `Panel CMS Admin` button, 5-tab navigation matching Stitch) & `PublicFooter`
  - Reusable `StatusBadge`, `QrLabelModal`, and `SafeStepsRenderer` (used in `/aset/[uuid]` and Task 8 `/tutorial`)
  - Working pages `/`, `/aset/[uuid]`, and `/denah`

- [ ] **Step 1: Implement root layout (`Plus Jakarta Sans` + Material Symbols Outlined) and shared public shell components**

Match the exact Stitch visual tokens (`bg-surface`, fixed `header` with 2-tier branding bar + horizontal nav bar, `max-w-[1440px] mx-auto px-gutter`, crisp hairline cards). Never include any external `lh3.googleusercontent.com` URL. Include print CSS (`@media print`) in `globals.css` for QR sticker sheets and room inventory printouts.

- [ ] **Step 2: Implement `/` (`Katalog & Kondisi Aset`)**

Build `src/app/page.tsx` and `src/components/CatalogClient.tsx` faithfully matching `katalog_kondisi_aset_penelitian/screen.png`:
- Top FTC status banner + `Unduh Rekap (XLSX)` (hits `/api/assets/export` with active filters) + `Cetak Label QR` (opens `QrLabelModal`) + (when admin logged in) `Registrasi Aset Baru` linking to `/admin/aset`.
- 5 live KPI cards (Total Aset Produk, Kondisi Prima + %, Perawatan/Kalibrasi, Perlu Perbaikan, Sedang Dipinjam).
- Search & multi-faceted filter toolbar (Kategori, Ruangan/Lab, Status Kondisi, Urutan) + active filter chips + **Grid / Tabel view toggle**.
- Asset cards showing photo (with local SVG fallback), `inventory_code`, condition + availability badge, building/room + `placement_detail`, asset title, **Tanggal Jadi Aset** (`formatIndonesianDate`), top specs, `Detail & SOP` (`/aset/[uuid]`), and `Ajukan Pinjam` (`/peminjaman?asset=[uuid]`, disabled for `rusak`/`tidak_tersedia`).
- Right sidebar: `Perlu Tindakan` (real `rusak`/`maintenance` assets + open ticket count badge), dynamic SVG Donut chart computed from real counts, and FTC Exhibition Readiness card linking to `/tutorial`.

- [ ] **Step 3: Implement `/aset/[uuid]` (Mobile-First QR Detail Landing Page)**

Validate UUID server-side (`notFound()` on invalid/missing/archived UUID). Display all 6 core facts clearly above the fold: Photo, `inventoryCode`, condition & availability badges, **Tanggal Jadi Aset**, **Peletakan** (Gedung → Lantai → Ruangan + `placementDetail` + `Lihat di Denah` link to `/denah?asset=[uuid]`), and **Narahubung** (direct `wa.me` + `mailto:` buttons). Below: `usageSummary`, linked tutorials (inline steps via `SafeStepsRenderer`, PDF download, video link), technical specs table, embedded QR Code card (`/api/assets/[uuid]/qr`) with print/download button, and CTAs (`Ajukan Pinjam Aset Ini` → `/peminjaman?asset=[uuid]`, `Laporkan Kendala` → `/narahubung?asset=[inventoryCode]`).

- [ ] **Step 4: Implement `/denah` (`Penempatan & Denah Lab`)**

Build `src/app/denah/page.tsx` and `src/components/FloorPlanClient.tsx` faithfully matching `penempatan_denah_laboratorium/screen.png`:
- Dynamic Building tabs + Floor switcher from `/api/locations`.
- Quick Spotlight Search (`Lacak aset`) calling `/api/locations/spotlight` (also honors `?asset=[uuid]` query param on initial load): auto-switches building & floor, pulses target room card, selects it in right drawer.
- Modular floorplan canvas: renders `gridZone === 'top'` rooms in a 12-col CSS grid using each room's `gridColSpan`, middle corridor bar, and `gridZone === 'bottom'` rooms, displaying live asset pills with status dots.
- Bottom strip displays REAL floor metrics (*Total Aset di Lantai*, *Siap Pameran (Prima)*, *Perawatan/Rusak*, *Sedang Dipinjam*) — zero fake HVAC/power/RFID text.
- Right Room Dossier Drawer: room code, name, PIC, capacity, hours, scrollable list of assets with `placementDetail` linking to `/aset/[uuid]`, `Cetak Inventaris Ruang`, `Reservasi Alat`, and `Lapor`.

- [ ] **Step 5: Verify TypeScript, lint, and production build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx src/app/aset src/app/denah src/components
git commit -m "feat: build Stitch public shell, Catalog, QR Asset Detail, and Modular Floorplan pages"
```

---

### Task 8: Public Pages Part 2 (`/peminjaman`, `/tutorial`, `/narahubung`)

**Files:**
- Create: `src/app/peminjaman/page.tsx`, `src/components/LoanPortalClient.tsx`
- Create: `src/app/tutorial/page.tsx`, `src/components/TutorialClient.tsx`
- Create: `src/app/narahubung/page.tsx`, `src/components/ContactHelpdeskClient.tsx`

**Interfaces:**
- Consumes: `PublicHeader`, `PublicFooter`, `StatusBadge`, `SafeStepsRenderer`, Public APIs from Task 5 (`/api/loans*`, `/api/tutorials`, `/api/contacts`, `/api/issues*`), `src/lib/loan-rules.ts` (`buildWhatsAppUrl`)
- Produces: Complete user-facing pages `/peminjaman`, `/tutorial`, and `/narahubung` matching Stitch layouts and FTC requirements.

- [ ] **Step 1: Implement `/peminjaman` (`Layanan Peminjaman Aset`)**

Faithfully match `layanan_peminjaman_aset/screen.png` adapted for Opsi A (unauthenticated PIC Pameran):
- Tabs: `Pengajuan Baru` | `Pelacakan Tiket & Jadwal Aktif`.
- 4-section form:
  1. Identitas Peminjam: Nama Lengkap, **Jenis Identitas (`NIM` / `NPP` / `Unit`)** + Nomor/Nama Identitas (NO NIDN!), No. WhatsApp, Unit/Prodi, Nama Acara Pameran / Keperluan.
  2. Multi-aset picker (max 3 assets; pre-loads `?asset=[uuid]`), live search from `/api/assets`, shows condition/availability badge & conflict warnings.
  3. Tanggal Mulai, Tanggal Selesai, Sesi Harian, Lokasi Operasi (`Internal Kampus` vs `Dibawa Keluar Kampus / Pameran Luar` with conditional location field), Kategori Keperluan (`Pameran / Expo FTC`, `Riset Dosen`, `Tugas Akhir / Skripsi`, `Kemitraan Industri`).
  4. Optional PDF/image document upload (max 10 MB) + Pakta Integritas checkbox.
- Right sidebar: live monthly/weekly availability calendar & daily timeline for the selected asset from `/api/loans/availability`, Syarat & Ketentuan, and FTC duty contact.
- Submission modal displaying generated `ticketCode` with one-click copy button.
- Tracking tab/section: search by `ticketCode` or `NIM/NPP/Unit` + privacy-safe table of active/scheduled loans (never renders phone numbers or private attachments).

- [ ] **Step 2: Implement `/tutorial` (`Tutorial & SOP`)**

Faithfully match `tutorial_standar_operasional_sop/screen.png` adapted for FTC:
- Hero banner with search bar (`Ctrl+K` shortcut) + category filter chips.
- Guide cards from `/api/tutorials` showing format badge (`Panduan Teks`, `PDF`, `Video`, `Checklist`), `docCode`, linked asset pill (`/aset/[uuid]`), summary, `Buka Baca Cepat` modal (renders `stepsMarkdown` via `SafeStepsRenderer` or safe YouTube iframe embed / Google Drive link), and `Unduh PDF` when `fileUrl` exists.
- Right sidebar: **Checklist Cepat Persiapan Pameran FTC** (interactive local checkboxes for PIC Pameran: cek kondisi fisik, cek baterai/adaptor, unduh panduan demo, simpan kontak narahubung — NO Level 3 Quiz!), Quick Downloads card, and FTC Technical Support Contacts populated from DB.
- Bottom FAQ grid populated from `faqs`.

- [ ] **Step 3: Implement `/narahubung` (`Direktori Narahubung & Bantuan`)**

Faithfully match `direktori_narahubung_bantuan/screen.png` adapted for FTC:
- Top FTC Emergency & Helpdesk Bento banner with hotline, emergency WhatsApp (`wa.me`), and live active PIC count.
- Contact directory grid from `/api/contacts` with availability badge, photo/avatar fallback, role, specialization, room, duty hours, handled asset count, direct `WhatsApp` (`buildWhatsAppUrl`) + `Email` buttons, and `Pilih PIC Tiket` button scrolling smoothly to and pre-selecting the PIC in the form below.
- `Lapor Kendala & Kerusakan Aset` form (pre-fills `?asset=` if navigated from `/aset/[uuid]` or `/denah`): category, asset selector/code input, PIC dropdown (`Auto-assign` or specific contact), reporter name & WhatsApp/email, description, urgency (`Rendah`/`Sedang`/`Darurat`), optional photo upload (JPG/PNG max 5 MB). Shows confirmation banner with generated `FTC-INC-YYYY-XXXX` ticket code.
- Compact **Cek Status Tiket Kendala** widget querying `/api/issues/lookup?code=...` (sanitized response).
- Right sidebar: FTC Secretariat Office Hours & Campus Location card with local vector styling and Google Maps link.

- [ ] **Step 4: Verify TypeScript, lint, and production build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/peminjaman src/app/tutorial src/app/narahubung src/components/LoanPortalClient.tsx src/components/TutorialClient.tsx src/components/ContactHelpdeskClient.tsx
git commit -m "feat: build Borrowing, Tutorial/SOP, and Contact Helpdesk public pages"
```

---

### Task 9: Admin CMS UI (`/admin/login` & Complete `/admin/(cms)/**` Management Suite)

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/(cms)/layout.tsx`, `src/components/admin/AdminShell.tsx`
- Create: `src/app/admin/(cms)/page.tsx`
- Create: `src/app/admin/(cms)/aset/page.tsx`, `src/components/admin/AssetsManager.tsx`
- Create: `src/app/admin/(cms)/lokasi/page.tsx`, `src/components/admin/LocationsManager.tsx`
- Create: `src/app/admin/(cms)/tutorial/page.tsx`, `src/components/admin/TutorialsManager.tsx`
- Create: `src/app/admin/(cms)/narahubung/page.tsx`, `src/components/admin/ContactsManager.tsx`
- Create: `src/app/admin/(cms)/peminjaman/page.tsx`, `src/components/admin/LoansManager.tsx`
- Create: `src/app/admin/(cms)/kendala/page.tsx`, `src/components/admin/IssuesManager.tsx`

**Interfaces:**
- Consumes: Admin APIs from Task 6, Auth APIs from Task 3, `QrLabelModal`, `StatusBadge`, `src/lib/format.ts`, `src/lib/loan-rules.ts` (`buildWhatsAppUrl`)
- Produces: Complete server-guarded Admin CMS matching Stitch `DESIGN.md` aesthetics.

- [ ] **Step 1: Implement `/admin/login` and server-guarded `/admin/layout.tsx` + `AdminShell`**

- `src/app/admin/login/page.tsx`: Clean FTC login card (UDINUS logo, email/password inputs, error feedback, redirects to `/admin` on success).
- `src/app/admin/layout.tsx`: Server component checking `getAdminSession()`; note `/admin/login` must bypass the auth redirect (put protected routes under `src/app/admin/(cms)/layout.tsx` and keep `src/app/admin/login/page.tsx` outside the protected route group so there is zero redirect loop!).
- `AdminShell`: Fixed Stitch-blue left sidebar (collapsible on mobile) with 7 items (`Ringkasan`, `Aset & QR Code`, `Gedung & Denah`, `Tutorial & FAQ`, `Narahubung`, `Peminjaman`, `Laporan Kendala`), link to `Lihat Portal Publik`, and `Keluar` button.

- [ ] **Step 2: Implement Dashboard (`/admin`) and Assets CMS (`/admin/aset`)**

- Dashboard shows live KPIs, quick action links, pending loan approval queue, open issue tickets, and assets in `rusak`/`maintenance`.
- `AssetsManager`: Search/filter + `Tampilkan Arsip` toggle, table of assets displaying UUID tooltip, `inventoryCode`, photo, `completionDate`, condition, availability, location, contact; create/edit drawer/modal with photo upload (`/api/admin/uploads`), dynamic `{label, value}` specs editor, room dropdown + `placementDetail`, contact dropdown, `usageSummary`, disabled `availability` when `dipinjam` (with helper note), visible warning banner if `affectedApprovedLoans` returned on `rusak`/`maintenance`, archive/restore/delete action, and `QrLabelModal` button.

- [ ] **Step 3: Implement Locations (`/admin/lokasi`), Tutorials & FAQs (`/admin/tutorial`), and Contacts (`/admin/narahubung`)**

- `LocationsManager`: 3-pane or tabbed manager for Buildings → Floors → Rooms, including `gridZone` (`top` | `bottom`) and `gridColSpan` (`1..12`) with a live miniature preview of the floor's modular grid layout.
- `TutorialsManager`: CRUD for tutorials (asset selector, category, format, step-by-step text editor, PDF/image upload, video URL) + second tab for CRUD on `faqs`.
- `ContactsManager`: CRUD for contact persons (photo upload, code, name, role, specialization, room, duty hours, WhatsApp, email, availability status, emergency contact toggle).

- [ ] **Step 4: Implement Loans (`/admin/peminjaman`) and Issue Tickets (`/admin/kendala`)**

- `LoansManager`: Status filter tabs (`Semua`, `Menunggu`, `Disetujui`, `Sedang Dipinjam`, `Dikembalikan`, `Ditolak/Batal`), shows full borrower details (`NIM/NPP/Unit`, WhatsApp, private attachment link `/api/admin/uploads/[filename]`), conflict indicator, buttons for `Setujui`, `Tolak`, `Batalkan`, `Tandai Dipinjam`, **Modal Pengembalian** with per-asset `returnCondition` (`prima`/`maintenance`/`rusak`) & `returnNotes` inputs, plus one-click **`Hubungi via WhatsApp`** (`buildWhatsAppUrl` pre-filled with ticket code and status).
- `IssuesManager`: Filter by status/urgency, view private incident photo (`/api/admin/uploads/[filename]`), update status (`open` → `in_progress` → `resolved`) & `resolutionNotes`, optional dropdown to sync linked asset condition (`prima`/`maintenance`/`rusak`) in one save, plus **`Hubungi Pelapor (WA)`** link when reporter contact is a phone number.

- [ ] **Step 5: Run full local verification suite**

Run: `npm run test && npm run typecheck && npm run lint && npm run build`
Expected: ALL unit tests PASS, TypeScript 0 errors, ESLint 0 errors, Next.js standalone production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/components/admin
git commit -m "feat: build authenticated FTC Admin CMS for assets, locations, tutorials, contacts, loans, and issues"
```

---

### Task 10: Deploy to `ssh.haweb.my.id` (Docker + PostgreSQL + Adminer) & Live End-to-End Verification

**Files:**
- Remote Server: `/home/serverhaw/web/ftc-asset/` (synced source + generated `.env` with strong secrets)

**Interfaces:**
- Consumes: `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, and built codebase from Tasks 1–9
- Produces: Live running containers `ftc_asset_web` (`:4031`), `ftc_asset_db` (`127.0.0.1:4032`), `ftc_asset_adminer` (`:4033`) verified end-to-end on `ssh.haweb.my.id`.

- [ ] **Step 1: Pre-flight port check on `ssh.haweb.my.id`**

Verify over SSH that ports `4031`, `4032`, and `4033` are still completely free on `ssh.haweb.my.id` (`ss -tlnp | grep -E ':(4031|4032|4033)\b'` returns empty).

- [ ] **Step 2: Sync project to `/home/serverhaw/web/ftc-asset` and create server `.env`**

Package source via `git archive` (ensuring zero `.env`, `node_modules`, or untracked secrets are uploaded) and extract to `/home/serverhaw/web/ftc-asset`. Generate strong random `POSTGRES_PASSWORD`, `SESSION_SECRET`, and clear initial `ADMIN_EMAIL` / `ADMIN_PASSWORD` inside `/home/serverhaw/web/ftc-asset/.env` (`chmod 600 .env`) with `COOKIE_SECURE=false` and `NEXT_PUBLIC_APP_URL=http://ssh.haweb.my.id:4031`.

- [ ] **Step 3: Build and start Docker Compose stack on `ssh.haweb.my.id`**

Run: `cd /home/serverhaw/web/ftc-asset && docker compose up -d --build`
Verify: `docker compose ps` shows `ftc_asset_db` (`healthy`), `ftc_asset_web` (`Up`), and `ftc_asset_adminer` (`Up`), and `docker compose logs ftc_asset_web` confirms Drizzle push + idempotent seed + Next.js listening on port 3000.

- [ ] **Step 4: End-to-end live verification on `ssh.haweb.my.id`**

Run live verification checks on the server:
1. Database UUID check via `docker exec ftc_asset_db psql`: verify all 12 tables exist and `assets.id` holds valid UUIDs.
2. Public pages HTTP `200` check: `/`, `/denah`, `/peminjaman`, `/tutorial`, `/narahubung`, and `/aset/<seeded-uuid>`.
3. Security & API checks:
   - `GET /api/assets/1` → `400`
   - `GET /api/assets/export` → `200` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
   - `GET /api/assets/<seeded-uuid>/qr` → `200` (`image/png`)
   - `GET /api/admin/dashboard` without cookie → `401`
   - `POST /api/auth/login` with seeded admin → `200` + `Set-Cookie: ftc_admin_session=...; HttpOnly`
   - Authenticated `POST /api/admin/assets` creates new asset with generated UUID, `GET /aset/<new-uuid>` returns `200`, `DELETE /api/admin/assets/<new-uuid>` cleans up test record.
   - `POST /api/loans` with `borrowerIdType: "NIDN"` → `400`; valid `NIM` submission creates ticket `FTC-YYYY-XXXX` (`201`) and overlapping dates return `409`.
4. Adminer HTTP check: `http://127.0.0.1:4033` → `200`.
5. Confirm all previously running containers on `ssh.haweb.my.id` remain `Up` and untouched.

- [ ] **Step 5: Record final deployment summary & Admin credentials handoff**

Present live URLs (`http://ssh.haweb.my.id:4031` for app, `http://ssh.haweb.my.id:4033` for Adminer), Admin CMS login credentials stored in `/home/serverhaw/web/ftc-asset/.env`, and verification evidence to the user.
