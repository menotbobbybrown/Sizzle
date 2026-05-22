# Sizzle - Creator Commerce Platform

A full-featured creator commerce platform built with Next.js 15, tRPC, Prisma, and Stripe.

## Features

- **Creator Storefronts**: Custom storefronts at `/{handle}` (e.g., `/johndoe`)
- **Digital Products**: Sell courses, digital downloads, and freebies
- **Coaching Products**: Cal.com integration for booking sessions
- **Membership Products**: Recurring subscriptions with Stripe
- **Pay-What-You-Want**: Flexible pricing with minimum and suggested amounts
- **Stripe Integration**: Full payment processing with webhooks
- **Email Marketing**: Built-in subscriber management and campaigns
- **Analytics Dashboard**: Track revenue, orders, and engagement
- **AI Tools**: Content generation powered by Claude
- **Affiliate Program**: Track referrals and commission
- **Social Media Integration**: TikTok, YouTube, Instagram
- **Course Certificates**: PDF generation on completion
- **Video Pipeline**: Mux integration for video hosting
- **Background Jobs**: Inngest for async processing
- **Rate Limiting**: Upstash Redis rate limiting

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma
- **Auth**: NextAuth v5
- **API**: tRPC v11
- **Payments**: Stripe
- **Email**: Resend + React Email
- **Styling**: Tailwind CSS + shadcn/ui
- **Background Jobs**: Inngest
- **Rate Limiting**: Upstash Redis
- **Video**: Mux
- **Storage**: Cloudflare R2

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account
- Resend account (for email)
- Upstash Redis (for rate limiting)
- Inngest account (for background jobs)

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

Optional variables for Part 2 features:
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Rate limiting
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` - Background jobs
- `CALCOM_WEBHOOK_SECRET` - Booking webhooks
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` - TikTok OAuth
- `YOUTUBE_API_KEY` - YouTube stats
- `ENCRYPTION_KEY` - OAuth token encryption

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

### 6. Inngest Dev Server (Background Jobs)

For local development with Inngest background jobs:

```bash
# Install Inngest CLI
npm install -g inngest

# Run Inngest alongside Next.js
npx inngest dev
```

This will forward Inngest events to `http://localhost:4000` by default.

### 7. Webhook Forwarding

Use tools like ngrok or Cloudflare Tunnels for local webhook testing:

```bash
# Stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Mux
ngrok http 3000 --subdomain my-app
# Then configure Mux webhook to point to your ngrok URL
```

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
| `/dashboard/settings` | Settings & integrations |

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

### Cal.com Webhooks

1. Go to Cal.com → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/cal`
3. Set secret: `CALCOM_WEBHOOK_SECRET`
4. Subscribe to events:
   - `BOOKING_CREATED`
   - `BOOKING_CANCELLED`
   - `BOOKING_COMPLETED`
   - `BOOKING_RESCHEDULED`

### Mux Webhooks

1. Go to Mux → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/mux`
3. Set signing secret: `MUX_TOKEN_SECRET`
4. Subscribe to events:
   - `video.asset.ready`
   - `video.asset.errored`
   - `video.upload.asset_created`

### Testing Checkout Flow

1. Start the dev server: `npm run dev`
2. Create a product with Stripe Connect enabled
3. Visit the product page and click "Buy"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Check the order in dashboard and webhook logs

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
- `affiliate` - Affiliate link management

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
| `/api/inngest` | * | Inngest webhook handler |
| `/api/integrations/tiktok` | GET | TikTok OAuth start |
| `/api/integrations/tiktok/callback` | GET | TikTok OAuth callback |
| `/api/integrations/youtube` | GET | YouTube stats |

## Pricing Configuration

### Product Pricing Types

The platform supports multiple pricing models:

- **Fixed** (default) - Set price for all customers
- **PWYW (Pay-What-You-Want)** - Customers choose amount
  - `minPrice` - Minimum acceptable amount
  - `suggestedPrice` - Suggested price shown to customers
- **Free** - No payment required

### Subscription Products

Membership products with recurring billing:
- Daily, weekly, monthly, or yearly intervals
- Automatic renewal handling via Stripe
- Failed payment notifications

## Affiliate Program

### Creating Affiliate Links

1. Go to Dashboard → Settings → Affiliates
2. Create new link with custom code and commission rate
3. Share link: `https://your-store.com?ref=CODE`

### Tracking Attribution

- Clicks are tracked via URL parameter
- Conversions attributed when order is placed
- Commission calculated on order amount

## Social Media Integration

### TikTok

1. Go to Dashboard → Settings → Social
2. Click "Connect TikTok"
3. Authorize in TikTok OAuth flow
4. Stats displayed on storefront

### YouTube

1. Go to Dashboard → Settings → Social
2. Enter your YouTube channel ID
3. Stats fetched via YouTube Data API

### Instagram

**Note**: Instagram Graph API requires app review. See `docs/instagram-setup.md` for details.

Instagram integration is planned for future release after app review approval.

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (creator)/          # Creator storefront pages
│   ├── (dashboard)/        # Dashboard pages
│   ├── admin/              # Admin pages
│   ├── api/                # API routes
│   │   ├── integrations/   # OAuth integrations
│   │   ├── inngest/        # Background jobs
│   │   ├── storefront/     # Public storefront APIs
│   │   └── webhooks/       # Webhook handlers
│   ├── checkout/           # Checkout flow
│   ├── download/           # Download access
│   └── *.tsx               # Marketing pages
├── components/             # React components
│   ├── charts/            # Dashboard charts
│   ├── course-builder/     # Course editor
│   ├── design-editor/      # Theme editor
│   └── storefront/         # Storefront components
├── emails/                 # React Email templates
├── inngest/                # Background job functions
│   └── functions/          # Inngest event handlers
├── lib/                    # Utilities & integrations
│   ├── auth.ts             # NextAuth config
│   ├── db.ts               # Prisma client
│   ├── stripe.ts           # Stripe client
│   ├── email.ts            # Email sender
│   ├── r2.ts               # R2 storage helper
│   ├── mux.ts              # Mux video client
│   ├── pusher.ts           # Real-time notifications
│   ├── inngest.ts          # Inngest client
│   ├── ratelimit.ts        # Rate limiting
│   ├── encryption.ts       # Token encryption
│   └── certificates.ts     # PDF certificate generation
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
4. **Background Jobs**: Heavy work offloaded to Inngest functions

### Background Job Flow

Post-purchase events flow through Inngest for:
- Email delivery (with retries)
- Analytics updates
- Subscriber upserts
- Real-time notifications
- Social proof updates

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

### Running Tests

```bash
npm test
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

## License

Private - All rights reserved