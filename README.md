# Oshus Freights — Logistics Management System

A full-stack cloud-based Logistics Management System (LMS) built with Next.js 16, TypeScript, PostgreSQL, Prisma, and NextAuth.

## Features

- **Shipment Management** — Create, track, and manage shipments through their full lifecycle
- **Real-Time Tracking** — Public tracking page with shipment timeline and GPS updates
- **Inventory Management** — Stock levels, low-stock alerts, warehouse transfers
- **Warehouse Operations** — Multi-warehouse support with zone/rack/shelf/bin hierarchy
- **Fleet Management** — Vehicle tracking, driver assignments, utilization metrics
- **Invoicing & Billing** — Invoice generation, payment tracking, outstanding balances
- **Customer Portal** — Shipment creation, tracking, invoice history, support tickets
- **Support Management** — Ticket system with categories and assignment
- **Role-Based Access Control** — 6 user roles with UI, API, and permission enforcement
- **Audit Logs** — Track all system actions and status changes
- **Dashboards** — Role-specific dashboards with KPIs and analytics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| State | TanStack Query, React Hook Form, Zod |
| Backend | Next.js API Routes, Node.js |
| Database | PostgreSQL, Prisma ORM |
| Auth | NextAuth v5 (Credentials) |
| UI | Framer Motion, Lucide Icons, Sonner |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

All accounts use password: `password123`

| Role | Email |
|------|-------|
| Admin | admin@oshus.com |
| Customer | customer@acme.com |
| Dispatcher | dispatcher@oshus.com |
| Warehouse Staff | warehouse@oshus.com |
| Driver | driver@oshus.com |
| Finance Officer | finance@oshus.com |

**Demo tracking number:** `OSH-M2K9F8-A3B7`

## Project Structure

```
src/
├── app/
│   ├── api/           # REST API routes
│   ├── dashboard/     # Role-based dashboards & modules
│   ├── login/         # Authentication
│   └── track/         # Public shipment tracking
├── components/        # UI components
├── lib/               # Auth, RBAC, DB, validations
└── middleware.ts      # Route protection
prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Demo data seeder
```

## API Standards

All endpoints follow the convention:

```
GET    /api/shipments
POST   /api/shipments
PATCH  /api/shipments/:id
DELETE /api/shipments/:id
```

Response format:
```json
{ "success": true, "data": {} }
{ "success": false, "message": "Error message" }
```

## User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access, user management, audit logs |
| **Customer** | Create/track shipments, view invoices, support tickets |
| **Warehouse Staff** | Inventory management, warehouse operations |
| **Driver** | View assigned deliveries, update shipment status |
| **Dispatcher** | Assign drivers, schedule pickups, monitor fleet |
| **Finance Officer** | Generate invoices, track payments, financial reports |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
```

## License

Private — Oshus Freights © 2026
