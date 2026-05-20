# Sizzle - Creator Commerce Platform

A full-featured creator commerce platform built with Next.js 15, tRPC, Prisma, and Stripe.

## Features

- **Creator Storefronts**: Custom storefronts at `/{handle}` (e.g., `/johndoe`)
- **Digital Products**: Sell courses, digital downloads, and freebies
- **Stripe Integration**: Full payment processing with webhooks
- **Email Marketing**: Built-in subscriber management and campaigns
- **Analytics Dashboard**: Track revenue, orders, and engagement
- **AI Tools**: Content generation powered by Claude

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma
- **Auth**: NextAuth v5
- **API**: tRPC v11
- **Payments**: Stripe
- **Email**: Resend + React Email
- **Styling**: Tailwind CSS + shadcn/ui

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account
- Resend account (for email)

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd project
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - `http://localhost:3000`
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - Resend API key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 4. Seed Database (Optional)

```bash
npx prisma db seed
```

This creates a demo workspace with sample products and orders.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/pricing` | Pricing page |
| `/explore` | Discover creators |
| `/@{handle}` | Creator storefront |
| `/@{handle}/{slug}` | Product detail page |
| `/checkout/{productId}` | Checkout page |
| `/checkout/success` | Order confirmation |
| `/download/{token}` | Download access |
| `/enroll/{token}` | Course enrollment |
| `/unsubscribe/{token}` | Email unsubscribe |

### Auth Routes
| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/signup` | Create account |
| `/onboarding` | New creator setup |

### Dashboard Routes
| Route | Description |
|-------|-------------|
| `/dashboard` | Overview & stats |
| `/dashboard/products` | Manage products |
| `/dashboard/orders` | View orders |
| `/dashboard/analytics` | Analytics & charts |
| `/dashboard/billing` | Subscription management |
| `/dashboard/courses` | Course builder |
| `/dashboard/campaigns` | Email campaigns |
| `/dashboard/subscribers` | Subscriber management |

### Admin Routes
| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/stores` | Workspace management |
| `/admin/orders` | All orders |

## Webhook Testing

### Stripe Webhooks

Use the Stripe CLI to forward webhooks locally:

```bash
# Install Stripe CLI if you haven't
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret output by the command and set it as `STRIPE_WEBHOOK_SECRET`.

### Testing Checkout Flow

1. Start the dev server: `npm run dev`
2. Create a product with Stripe Connect enabled
3. Visit the product page and click "Buy"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Check the order in dashboard and webhook logs

### Mux Webhooks (Video)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/mux
```

Note: Mux webhooks require additional configuration for video processing.

## API Routes

### tRPC (Client-side)

All API operations use tRPC. Available routers:

- `auth` - Authentication & user management
- `creator` - Creator profiles & dashboard
- `product` - Product CRUD operations
- `checkout` - Stripe checkout sessions
- `order` - Order management
- `download` - Download token validation
- `analytics` - Dashboard analytics
- `billing` - Subscription management
- `subscriber` - Email subscribers
- `campaign` - Email campaigns
- `discountCode` - Discount codes

### API Routes (Server-side)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/trpc/[trpc]` | * | tRPC API endpoint |
| `/api/webhooks/stripe` | POST | Stripe payment events |
| `/api/webhooks/mux` | POST | Video processing events |
| `/api/webhooks/cal` | POST | Cal.com booking events |
| `/api/access/{token}` | GET | Secure file delivery |
| `/api/ai/generate` | POST | AI content generation |

## Pricing Configuration

The pricing system supports two modes (configured via `PRICING_MODE` env):

### Single Plan (Default - Phase 1)
- $5/month flat rate
- Everything included
- No transaction fees

### Tiered Plans (Future)
- Starter: $29/month
- Creator: $79/month
- Pro: $149/month

Toggle between modes:
```bash
PRICING_MODE=single  # Default
PRICING_MODE=tiered   # For future phases
```

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (creator)/          # Creator storefront pages
│   ├── (dashboard)/        # Dashboard pages
│   ├── admin/              # Admin pages
│   ├── api/                # API routes
│   ├── checkout/           # Checkout flow
│   ├── download/           # Download access
│   └── *.tsx               # Marketing pages
├── components/             # React components
│   ├── charts/            # Dashboard charts
│   ├── course-builder/     # Course editor
│   ├── design-editor/      # Theme editor
│   └── editor/             # Rich text editor
├── config/                 # App configuration
│   ├── pricing.ts          # Pricing settings
│   └── route-map.ts       # Route constants
├── emails/                 # React Email templates
├── lib/                    # Utilities & integrations
│   ├── auth.ts             # NextAuth config
│   ├── db.ts               # Prisma client
│   ├── stripe.ts           # Stripe client
│   ├── email.ts            # Email sender
│   └── r2.ts               # R2 storage helper
├── server/
│   ├── api/
│   │   ├── routers/        # tRPC routers
│   │   ├── root.ts         # API root
│   │   └── trpc.ts         # tRPC setup
│   └── auth.ts             # Auth export
├── trpc/                   # tRPC React client
└── types/                  # TypeScript types
```

## Architecture

### API Design

All API operations go through tRPC with procedures categorized by auth level:

- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires user session
- `creatorProcedure` - Requires workspace ownership/admin
- `adminProcedure` - Requires admin role

### Data Flow

1. **Public Routes**: Fetch data directly from Prisma in Server Components
2. **Dashboard**: Use tRPC with React Query for client-side data
3. **Webhooks**: Standalone API routes for Stripe/Mux/Cal events

### Middleware

The middleware handles:
- `@handle` URL rewriting to `/store/[handle]`
- Reserved handle protection
- Handle format validation

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

### Database Commands

```bash
# Push schema changes
npx prisma db push

# Generate migration
npx prisma migrate dev

# Studio (GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

## Known Issues

1. **Stripe Connect**: Full Stripe Connect OAuth flow is not yet implemented
2. **Video Processing**: Mux integration is in placeholder state
3. **Course Builder**: Module/Lesson CRUD is stubbed
4. **Email Templates**: Some templates need styling polish

## License

Private - All rights reserved