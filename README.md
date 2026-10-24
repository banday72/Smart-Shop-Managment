# Banday Mart

Banday Mart is a production-oriented retail shop management system built with Next.js, TypeScript, Tailwind CSS, Supabase Auth/Postgres, Zod, React Hook Form, and Recharts.

## Current foundation

- Next.js App Router with the Next 16 `proxy.ts` convention
- Supabase SSR browser/server clients and authenticated route protection
- PostgreSQL schema with shops, roles, products, categories, suppliers, customers, sales, purchases, inventory movements, and expenses
- Row Level Security policies scoped to the signed-in user's shop
- Database-backed dashboard metrics with an explicit Supabase setup state
- PKR formatting utilities and responsive management dashboard shell
- Server-validated POS checkout with atomic stock reduction and printable browser receipt support
- Purchase receiving with idempotent status checks and atomic inventory movements
- Reports with gross profit, expenses, estimated net profit, and CSV export
- Expense management and stock adjustment database functions
- Automated stock calculation and negative-stock prevention tests

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local` and add the URL and anon key from a Supabase project.
3. Run `supabase/migrations/0001_initial_schema.sql`, then `supabase/migrations/0002_settings_payments_adjustments.sql` in the Supabase SQL editor.
4. Create a user in Supabase Authentication, then insert its profile and shop:

```sql
insert into public.shops (name) values ('Banday Mart') returning id;
insert into public.profiles (id, shop_id, full_name, role)
values ('AUTH_USER_UUID', 'SHOP_UUID', 'Shop Owner', 'owner');
```

5. Start the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run lint
npm run build
npm test
```

## Routes

- `/dashboard` — live shop metrics and inventory health
- `/products` — validated product CRUD and SKU uniqueness
- `/pos` — product search, cart, discount/tax, payment status, and atomic checkout
- `/purchases` — purchase history and stock receiving
- `/reports` — sales, purchases, gross profit, expenses, and CSV export
- `/expenses` — expense entry and history

All inventory-changing operations must use PostgreSQL functions or equivalent atomic server-side operations; frontend stock calculations are not trusted.
