# SaviSanju Frontend Agent Guidelines

## Repository Structure
This is a Next.js 15 frontend repository for a luxury e-commerce platform. Backend is in separate `savisanju-backend` repo.

## Essential Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Setup Requirements
1. Node.js 18+ required
2. Separate backend repository required (`savisanju-backend`)
3. Docker needed for local PostgreSQL
4. Environment variables required in `.env.local`:
   - NEXT_PUBLIC_API_URL (backend URL, default: http://localhost:5000)
   - Firebase FCM configuration for push notifications

## Testing Notes
- Test suites organized in `/__tests__/` with exploration, integration, and security subdirectories
- Uses Vitest and React Testing Library
- Tests cover security vulnerabilities, UI/UX, business logic, and integration flows
- Environment variables automatically loaded from `.env.local` for tests via vitest.setup.ts

## Development Flow
1. Start backend first (on port 5000) - requires separate `savisanju-backend` repo
2. Start frontend (on port 3000)
3. Access storefront at http://localhost:3000
4. Admin dashboard at http://localhost:3000/admin (requires auth)
5. Auth page at http://localhost:3000/auth

## Key Conventions
- Uses Next.js 15 App Router (pages in `src/app/`)
- Tailwind CSS 4 for styling
- GSAP for animations (HeroCanvas.tsx)
- Zod for input validation
- JWT with httpOnly cookies for authentication (verified via middleware)
- Resend for email service (3,000/month free)
- Firebase FCM for push notifications (100% free)

## Important Files
- `next.config.ts` - Next.js configuration (image optimization, security headers)
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Test setup (loads dotenv)
- `src/app/layout.tsx` - Root layout
- `src/middleware.ts` - Route protection (admin, orders, checkout routes)
- `src/app/admin/` - Admin dashboard (order management)
- `src/app/auth/` - Authentication page
- `src/app/shop/` - Product catalog
- `src/app/orders/` - Order history
- `src/app/checkout/` - Checkout flow

## Route Protection
- `/admin/*` - Requires admin role
- `/orders/*` and `/checkout/*` - Requires authentication
- All other routes are public
- Middleware calls backend `/api/auth/verify` endpoint to validate JWT

## Deployment
- Frontend: Vercel (connect GitHub repo, configure env vars)
- Backend: Separate deployment on Oracle Cloud VPS (see backend repo)