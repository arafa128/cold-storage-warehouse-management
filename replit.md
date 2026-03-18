# Cold Storage Warehouse Inventory Management System

## Overview

This is a web-based internal inventory management system (MVP) for agricultural cold storage facilities handling Potato and Corn. The system manages the full lifecycle of cold storage operations: inbound truck arrivals, lot-based inventory tracking, cold room management, outbound shipments, loss recording, and environmental sensor monitoring.

Key operational scale targets:
- ~250 trucks received per day
- ~20 warehouse locations with ~40 cold rooms each
- Lot-based traceability (not just product-level)
- Partial outbound shipments supported
- 25 concurrent users optimized

The app is a full-stack TypeScript monorepo with a React SPA frontend served by an Express backend.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: `wouter` (lightweight client-side router)
- **State & Data Fetching**: TanStack React Query v5 — all server state is managed through custom hooks (`use-batches.ts`, `use-trucks.ts`, etc.) that wrap React Query calls
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming; supports light/dark mode toggled via `localStorage`
- **Charts**: Recharts for dashboard KPI visualizations
- **Forms**: React Hook Form with `@hookform/resolvers` and Zod for validation
- **Animations**: Framer Motion (listed as a requirement)
- **Font stack**: DM Sans (sans), Google Fonts loaded via `<link>` in `index.html`

**Pages:**
| Route | Purpose |
|---|---|
| `/` | Dashboard with KPIs, charts, utilization |
| `/inbound` | Truck arrivals & lot creation |
| `/inventory` | Lot-based inventory browser |
| `/outbound` | Shipment recording |
| `/losses` | Loss events (rot, damage, shrinkage) |
| `/warehouses` | Warehouse & cold room management |
| `/suppliers` | Supplier & farm management |
| `/sensors` | Environmental sensor readings & alerts |
| `/reports` | CSV report downloads |
| `/settings` | Admin configuration |

**Path aliases:**
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx` in dev, bundled with `esbuild` for production
- **API style**: RESTful JSON API under `/api/*`
- **Session management**: `express-session` with `connect-pg-simple` storing sessions in PostgreSQL `sessions` table
- **Authentication**: Replit OpenID Connect (OIDC) via `openid-client` + `passport` + `passport-local`; handled in `server/replit_integrations/auth/`
- **Storage layer**: `server/storage.ts` defines an `IStorage` interface with a concrete class backed by Drizzle ORM queries — all DB operations go through this layer
- **Route registration**: `server/routes.ts` registers all API routes; auth routes are registered separately via `registerAuthRoutes`

**Build process** (`script/build.ts`):
1. Vite builds the React client → `dist/public/`
2. esbuild bundles the Express server → `dist/index.cjs`
3. Common server deps (drizzle-orm, express, pg, etc.) are bundled in; UI/dev packages are externalized

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (`drizzle-orm/node-postgres`) with Drizzle Kit for migrations
- **Schema location**: `shared/schema.ts` (imports auth models from `shared/models/auth.ts`)
- **Migrations**: Output to `./migrations/` via `drizzle-kit push`

**Core tables:**
| Table | Purpose |
|---|---|
| `users` | User accounts with role & optional warehouse assignment |
| `sessions` | Express session store (required by Replit Auth) |
| `warehouses` | Warehouse locations |
| `rooms` | Cold rooms linked to warehouses; tracks capacity, sensor thresholds |
| `suppliers` | Supplier records with max accepted quantity quota |
| `farms` | Farm sources linked to suppliers |
| `trucks` | Inbound truck arrivals; two-weight system (first + second weigh) |
| `batches` | Inventory lots (LOT-YYYY-XXXXX); tracks remaining quantity & status |
| `shipments` | Outbound shipments (SHP-YYYY-XXXXX); supports partial shipments |
| `losses` | Loss events against a batch (Rot, Damage, Shrinkage) |
| `roomSensors` | Environmental sensor readings per room (temp, humidity, CO2) |

**Room sensor thresholds** are stored on the `rooms` table (`maxTempC`, `maxHumidityPct`, `maxCo2Ppm`) and are compared against live readings to generate alerts.

### Authentication & Authorization

- **Provider**: Replit Auth (OIDC) — mandatory integration; users are upserted on login
- **Roles**: `Admin`, `Manager`, `Data Entry`, `Viewer`
- **Warehouse scoping**: Users can optionally be restricted to a single warehouse via `warehouseId` on the user record
- **Session**: Stored in PostgreSQL `sessions` table via `connect-pg-simple`; 7-day TTL; secure HTTP-only cookies
- **Frontend guard**: `useAuth()` hook queries `/api/auth/user`; unauthenticated users are redirected to `/api/login`

### Shared Code

The `shared/` directory is consumed by both frontend and backend:
- `shared/schema.ts` — Drizzle table definitions + Zod insert schemas + TypeScript response types
- `shared/routes.ts` — Typed API route definitions (method, path, input schema, response schema); used by both server route registration and client hooks to stay in sync
- `shared/models/auth.ts` — Auth-specific table definitions (`users`, `sessions`)

This shared contract eliminates API drift between client and server.

---

## External Dependencies

### Replit Platform Integrations
- **Replit Auth (OIDC)**: Primary authentication; requires `REPL_ID` and `ISSUER_URL` env vars
- **`@replit/vite-plugin-runtime-error-modal`**: Dev overlay for runtime errors
- **`@replit/vite-plugin-cartographer`**: Dev-mode source mapping tool
- **`@replit/vite-plugin-dev-banner`**: Dev environment banner

### Database
- **PostgreSQL**: Requires `DATABASE_URL` environment variable
- **`connect-pg-simple`**: PostgreSQL session store adapter

### Required Environment Variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret |
| `REPL_ID` | Replit app ID for OIDC |
| `ISSUER_URL` | OIDC issuer (defaults to `https://replit.com/oidc`) |

### Key NPM Dependencies
| Package | Purpose |
|---|---|
| `drizzle-orm` + `drizzle-kit` | ORM + migration tooling |
| `drizzle-zod` | Auto-generate Zod schemas from Drizzle tables |
| `@tanstack/react-query` | Server state management |
| `wouter` | Client-side routing |
| `recharts` | Dashboard charts |
| `date-fns` | Date formatting |
| `framer-motion` | Animations (listed in requirements) |
| `passport` + `openid-client` | Auth strategy |
| `express-session` | Session middleware |
| `zod` | Schema validation (shared between client & server) |
| `nanoid` | Short ID generation |