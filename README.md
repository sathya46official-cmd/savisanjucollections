# SaviSanju Collections — Frontend

Next.js 15 storefront for a luxury Indian saree e-commerce platform. Features GSAP animations, a full shopping cart, order tracking, and an admin dashboard.

**Live**: [savisanjucollections.me](https://savisanjucollections.me)  
**Backend repo**: [github.com/sathya46official-cmd/savisanju-backend](https://github.com/sathya46official-cmd/savisanju-backend)

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, SSR)
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP (72-frame hero sequence)
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library

---

## Features

- GSAP hero animation with color-adaptive backgrounds
- Shopping cart with real-time stock management
- Full checkout flow (address → confirm → order placed)
- Order history with status tracking and cancel
- Admin dashboard — order management, inventory, stock updates
- Email verification flow
- SEO: Product schema, breadcrumbs, sitemap, robots.txt, llms.txt

---

## Local Setup

### Prerequisites

- Node.js 18+
- Backend API running on port 5000 — see [savisanju-backend](https://github.com/sathya46official-cmd/savisanju-backend)

### Install

```bash
git clone https://github.com/sathya46official-cmd/savisanju-frontend.git
cd savisanju-frontend
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_API_HOSTNAME=localhost
NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
NEXT_PUBLIC_GOOGLE_BUSINESS_ID=YOUR_GOOGLE_BUSINESS_ID
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| URL | Description |
|-----|-------------|
| `/` | Homepage with GSAP hero + collection accordion |
| `/shop` | All sarees with filters and sort |
| `/shop/[categoryId]` | Category page |
| `/shop/[categoryId]/[variantId]` | Product detail |
| `/auth` | Login / Register |
| `/checkout` | Checkout (requires login) |
| `/orders` | Order history (requires login) |
| `/admin` | Admin dashboard (requires admin role) |
| `/admin/inventory` | Product and variant management |
| `/verify-email` | Email verification |

---

## Testing

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

---

## Deployment (Vercel)

1. Connect this GitHub repo to [Vercel](https://vercel.com)
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` — your Oracle VPS backend URL
   - `NEXT_PUBLIC_API_HOSTNAME` — your Oracle VPS domain
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` — real business WhatsApp number
   - `NEXT_PUBLIC_GOOGLE_BUSINESS_ID` — Google Business ID
   - `NEXT_PUBLIC_GA_ID` — Google Analytics ID
3. Deploy — Vercel auto-deploys on every push to `main`

After deploying, update `FRONTEND_URL` in the backend `.env` to your Vercel URL and restart the backend.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin dashboard + inventory
│   ├── auth/               # Login / Register
│   ├── checkout/           # Checkout flow
│   ├── orders/             # Order history
│   ├── shop/               # Product catalog + detail
│   ├── verify-email/       # Email verification
│   ├── layout.tsx          # Root layout + SEO metadata
│   ├── page.tsx            # Homepage
│   ├── sitemap.ts          # Dynamic XML sitemap
│   └── robots.ts           # robots.txt
├── components/             # Shared React components
├── lib/
│   └── api/client.ts       # API client (all backend calls)
├── middleware.ts            # Route protection
└── __tests__/              # Test suites
public/
├── assets/                 # Images
├── llms.txt                # AI agent context file
└── firebase-messaging-sw.js
```

---

## License

MIT
