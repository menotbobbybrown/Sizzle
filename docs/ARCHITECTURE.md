# Sizzle Architecture

## Overview

Sizzle is a creator commerce platform that enables creators to sell digital products, courses, and services directly to their audience.

## Core Concepts

### Workspaces (Creator Accounts)

Each creator has a **Workspace** that represents their storefront. Workspaces contain:

- Products (courses, digital downloads, freebies)
- Orders and customer data
- Email subscribers and campaigns
- Analytics data
- Theme configuration

### Handle System

Creators choose a **handle** (e.g., `alexrivera`) that becomes their storefront URL (`/@alexrivera`). Handles must:

- Be lowercase alphanumeric with optional hyphens
- Not conflict with reserved routes
- Be unique across the platform

The middleware rewrites `@handle` URLs to `/store/[handle]` internally.

### Products

Products can be:
- **COURSE**: Structured content with modules and lessons
- **DIGITAL**: Files for download (PDF, templates, etc.)
- **FREEBIE**: Free products for lead generation

### Orders & Fulfillment

Orders are created via Stripe checkout. After payment:
1. Order record is created
2. Access token is generated (hashed in DB)
3. Enrollment created for courses
4. Email sent with download/enrollment link

## Data Model

```
User
  └── WorkspaceMember (creator account)
        └── Workspace
              ├── Product[] (digital goods)
              ├── Order[] (transactions)
              ├── Subscriber[] (email list)
              └── Campaign[] (email campaigns)
              └── AnalyticsDaily[] (aggregated stats)

Order
  ├── OrderItem[] (line items)
  ├── Payment[] (payment records)
  └── AccessToken[] (fulfillment tokens)
```

## API Design

### tRPC Routers

- **auth**: User authentication, handle reservation, onboarding
- **creator**: Creator profiles, Stripe Connect, dashboard overview
- **product**: Product CRUD, upload URLs, stats
- **checkout**: Stripe session creation, discount validation
- **order**: Order management, CSV export, resend delivery
- **download**: Token validation, download tracking
- **analytics**: Dashboard metrics, revenue charts
- **billing**: Subscription management
- **subscriber**: Email list management
- **campaign**: Email campaign management
- **notification**: User notifications
- **ai**: Content generation

### Procedure Types

- `publicProcedure`: No auth required
- `protectedProcedure`: Requires user session
- `creatorProcedure`: Requires workspace ownership
- `adminProcedure`: Requires admin role

## Webhook Processing

### Stripe Webhook

Handles:
- `checkout.session.completed`: Create order, generate access token
- `checkout.session.expired`: Mark order as failed
- `charge.refunded`: Process refund, revoke access

All events are idempotent via `WebhookEvent` tracking.

### Mux Webhook

Handles video processing events (placeholder).

### Cal.com Webhook

Handles booking events (placeholder).

## File Storage

Cloudflare R2 is used for file storage:
- Product images
- Downloadable files
- Course video content

Presigned URLs are generated for secure uploads/downloads.

## Email System

Resend powers transactional emails:
- Purchase confirmation
- Download delivery
- Course enrollment
- Booking confirmations

Email templates are built with React Email.

## Authentication

NextAuth v5 handles authentication with:
- GitHub OAuth
- Google OAuth
- Email magic links (via Resend)

Sessions include user ID and role for authorization.

## Pricing Model

Phase 1: Single flat rate ($5/month)
- Everything included
- No transaction fees

Future: Tiered pricing ($29/$79/$149)
- Configurable via `PRICING_MODE` env var

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection
- `NEXTAUTH_SECRET`: Auth session secret
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `RESEND_API_KEY`: Email API key

Optional:
- `R2_*`: Cloudflare R2 for file storage
- `MUX_*`: Video processing
- `ANTHROPIC_API_KEY`: AI features
- `PUSHER_*`: Real-time notifications