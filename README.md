# SaviSanju Collections - Premium E-Commerce Platform ✨

A luxury, full-stack e-commerce web application for showcasing and selling premium Kanjivaram and Banarasi sarees. Built with **Next.js 15**, **GSAP animations**, **Tailwind CSS**, and powered by a secure **Express.js backend** with **PostgreSQL**.

---

## 🌟 Features

### 🎨 Award-Winning UI/UX
- **Dynamic GSAP Animations**: Smooth hero sequence with 72-frame animation
- **Color-Adaptive Backgrounds**: Automatically adjusts to match product color hex codes
- **Luxury Brand Aesthetic**: Elegant typography, torn paper dividers, premium feel
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### 🛒 Complete E-Commerce Features
- **Multi-Item Shopping Cart**: Add multiple products, update quantities, persistent cart
- **Real-Time Stock Management**: Live stock indicators, "Only X left" urgency messaging
- **Order Workflow**: Complete order lifecycle (pending → confirmed → processing → shipped → delivered)
- **Order History**: Track past orders with visual status indicators
- **Stock Notifications**: "Notify Me" when out-of-stock items are back

### 🔐 Enterprise-Grade Security
- **JWT Authentication**: httpOnly cookies, 24-hour expiration
- **bcrypt Password Hashing**: 10 salt rounds for secure password storage
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Whitelist frontend domain

### 📧 Automated Notifications
- **Email Notifications**: Order confirmations, stock alerts (Resend - 3,000/month free)
- **Push Notifications**: Real-time admin alerts for new orders (Firebase FCM - 100% FREE)
- **Sound Alerts**: Audio notification for admin dashboard

### 💼 Consultation-Based Sales Model
- **No Online Payment**: COD/UPI after admin verification
- **Price Negotiation**: Personalized service with admin contact
- **WhatsApp Integration**: Customer-initiated contact (privacy-protected)
- **"Pay After Satisfaction"**: Trust-based business model

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP, Framer Motion
- **Icons**: Lucide React
- **State Management**: React hooks
- **Testing**: Vitest, React Testing Library

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 16 (Docker locally, Oracle Cloud production)
- **Authentication**: JWT with httpOnly cookies
- **Validation**: Zod schemas
- **Email**: Resend (3,000 emails/month free)
- **Push Notifications**: Firebase Cloud Messaging (FCM)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Oracle Cloud Free Tier
- **Database**: PostgreSQL on Oracle server
- **CDN**: Vercel Edge Network

---

## 📦 Getting Started (Local Development)

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **Docker Desktop** (for PostgreSQL)
- **Git**

### Step 1: Clone Repositories

```bash
# Clone frontend
git clone https://github.com/sathya46official-cmd/savisanju-frontend.git

# Clone backend (separate repository)
git clone https://github.com/sathya46official-cmd/savisanju-backend.git
```

### Step 2: Install Dependencies

#### Frontend
```bash
cd savisanju-frontend
npm install
```

#### Backend
```bash
cd ../savisanju-backend
npm install
```

### Step 3: Environment Setup

#### Frontend `.env.local`

Create `.env.local` in the root directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Cloud Messaging (FCM) - for push notifications
NEXT_PUBLIC_FCM_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FCM_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FCM_PROJECT_ID=your-project-id
NEXT_PUBLIC_FCM_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FCM_APP_ID=your-app-id
NEXT_PUBLIC_FCM_VAPID_KEY=your-vapid-key
```

#### Backend `.env`

Create `.env` in the `savisanju-backend/` directory (separate repository):

```env
# Server
NODE_ENV=development
PORT=5000

# Database (Docker PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/savisanju

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-random-256-bit-secret-here

# Admin Password (generate hash with bcrypt)
ADMIN_PASSWORD_HASH=$2b$10$your-bcrypt-hashed-password-here

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@savisanju.com
RESEND_ADMIN_EMAIL=admin@savisanju.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### Step 4: Generate Secrets

#### Generate JWT Secret
```bash
openssl rand -base64 32
```

#### Generate Admin Password Hash
```bash
cd savisanju-backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourAdminPassword123', 10, (err, hash) => console.log(hash));"
```

Copy the generated hash to `ADMIN_PASSWORD_HASH` in `savisanju-backend/.env`

### Step 5: Start PostgreSQL (Docker)

```bash
cd savisanju-backend
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432` with:
- **Database**: `savisanju`
- **Username**: `postgres`
- **Password**: `postgres`

Verify PostgreSQL is running:
```bash
docker ps
```

### Step 6: Run Database Migrations

```bash
cd savisanju-backend

# Connect to PostgreSQL and run migrations
psql postgresql://postgres:postgres@localhost:5432/savisanju -f migrations/001_initial_schema.sql
psql postgresql://postgres:postgres@localhost:5432/savisanju -f migrations/002_security_architecture_overhaul.sql
```

### Step 7: Start Development Servers

#### Terminal 1: Start Backend
```bash
cd savisanju-backend
npm run dev
```

Backend API runs on **http://localhost:5000**

#### Terminal 2: Start Frontend
```bash
cd savisanju-frontend
npm run dev
```

Frontend runs on **http://localhost:3000**

### Step 8: Access Application

- **Storefront**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Test Suites

- **Exploration Tests**: Security vulnerabilities, missing features (Phase 1)
- **Preservation Tests**: UI/UX, business model, database schema (Phase 1)
- **Integration Tests**: Complete user flows (Phase 3)
- **Security Audit**: Credential exposure, input validation (Phase 3)

---

## 📁 Project Structure

```
savisanju-frontend/                # Frontend Repository
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/                # Admin dashboard
│   │   ├── auth/                 # Authentication page
│   │   ├── checkout/             # Checkout flow
│   │   ├── orders/               # Order history
│   │   ├── shop/                 # Product catalog
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Homepage
│   ├── components/               # React components
│   │   ├── AdminDashboard.tsx    # Admin order management
│   │   ├── ShoppingCart.tsx      # Cart slide-in panel
│   │   ├── MobileNav.tsx         # Mobile hamburger menu
│   │   ├── ProductCard.tsx       # Product card with stock
│   │   ├── HeroCanvas.tsx        # GSAP hero animation
│   │   ├── HowItWorks.tsx        # Consultation model explainer
│   │   ├── TrustTransparency.tsx # Privacy messaging
│   │   └── Footer.tsx            # Footer with contact
│   ├── lib/
│   │   └── notifications/        # FCM utilities
│   ├── middleware.ts             # Route protection
│   └── __tests__/                # Test suites
│       ├── exploration/          # Bug condition tests
│       ├── integration/          # Integration tests
│       └── security/             # Security audit tests
├── public/
│   ├── assets/                   # Images, icons
│   ├── firebase-messaging-sw.js  # FCM service worker
│   └── notification.mp3          # Admin alert sound
├── .kiro/specs/                  # Spec-driven development docs
├── package.json
└── README.md                     # This file

savisanju-backend/                 # Backend Repository (Separate)
├── src/
│   ├── routes/                   # API routes
│   ├── controllers/              # Business logic
│   ├── middleware/               # Auth, rate limiting
│   ├── services/                 # Email, notifications
│   ├── utils/                    # JWT, bcrypt, validation
│   └── server.ts                 # Express app
├── migrations/                   # Database migrations
├── docker-compose.yml            # PostgreSQL setup
└── README.md                     # Backend documentation
```

---

## 🎯 Key Features Walkthrough

### 1. Shopping Cart

- **Add to Cart**: Click "Add to Cart" on any product
- **View Cart**: Click cart icon in header
- **Update Quantity**: Use +/- buttons (respects stock limits)
- **Remove Items**: Click trash icon
- **Proceed to Checkout**: Click "Proceed to Checkout" button

### 2. Checkout Flow

1. **Login/Register**: Forced authentication before checkout
2. **Review Cart**: See all items with quantities
3. **Enter Address**: Auto-fills from profile if available
4. **Place Order**: Atomic stock reservation (prevents overselling)
5. **Confirmation**: Order ID displayed, email sent

### 3. Order Tracking

- **View Orders**: Navigate to "My Orders" page
- **Status Tracking**: Visual progress indicator
- **Cancel Order**: Available before shipping
- **Social Sharing**: Share delivered orders (subtle, bottom placement)

### 4. Admin Dashboard

- **Real-Time Updates**: Polls every 10 seconds for new orders
- **Browser Notifications**: Push notifications for new orders
- **Sound Alerts**: Audio notification when orders arrive
- **Order Management**: Update status, add notes, confirm pricing
- **Stock Management**: Update quantities, trigger stock notifications
- **WhatsApp Integration**: Click phone number to open WhatsApp

### 5. Stock Notifications

- **Request Notification**: Click "Notify Me" on out-of-stock products
- **Automatic Emails**: Sent when admin restocks item
- **Guest Support**: No login required to request notifications

---

## 🌐 Production Deployment

### Frontend (Vercel)

1. **Connect GitHub Repository** to Vercel
2. **Configure Environment Variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://api.savisanju.com
   NEXT_PUBLIC_FCM_API_KEY=...
   NEXT_PUBLIC_FCM_PROJECT_ID=...
   (all FCM variables)
   ```
3. **Deploy**: Automatic deployment on git push

### Backend (Oracle Cloud VPS)

The backend is now in a separate repository. See the backend repository's README for detailed deployment instructions:
- Setup Oracle Cloud VPS
- Install Node.js, PostgreSQL, Nginx
- Configure SSL with Let's Encrypt
- Run with PM2 process manager

**Backend Repository**: `savisanju-backend/` (separate Git repository)

---

## 🔒 Security Best Practices

### Implemented Security Measures

✅ **No Client-Side Credentials**: All sensitive keys are server-side only  
✅ **httpOnly Cookies**: JWT tokens not accessible via JavaScript  
✅ **bcrypt Password Hashing**: 10 salt rounds, never store plaintext  
✅ **Rate Limiting**: Prevents brute force attacks (100 req/15min)  
✅ **Input Validation**: Zod schemas validate all API inputs  
✅ **SQL Injection Prevention**: Parameterized queries only  
✅ **CORS Protection**: Whitelist frontend domain  
✅ **Helmet.js**: Security headers (XSS, clickjacking protection)  
✅ **Database Transactions**: Atomic stock management  
✅ **Row-Level Locking**: Prevents race conditions  

### Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT secret (256-bit)
- [ ] Configure CORS for production domain
- [ ] Enable SSL/TLS in production
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Monitor error logs
- [ ] Set up uptime monitoring

---

## 📊 Performance Optimization

### Implemented Optimizations

- **Lazy Loading**: Images load on scroll (improves mobile performance)
- **GSAP Optimization**: Reduced animation complexity on low-end devices
- **Database Connection Pooling**: Prevents connection exhaustion
- **Efficient Polling**: 10-second interval balances real-time updates with server load
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic with Next.js App Router

### Performance Targets

- **Lighthouse Score**: >80 (mobile and desktop)
- **First Contentful Paint**: <2s
- **Time to Interactive**: <3s
- **API Response Time**: <500ms

---

## ♿ Accessibility (WCAG AA Compliance)

### Implemented Features

- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Color Contrast**: 4.5:1 for text, 3:1 for UI components
- **ARIA Labels**: Screen reader support for all interactive elements
- **Keyboard Navigation**: All features accessible via keyboard
- **Focus Indicators**: Visible focus states for all interactive elements

### Testing

- **Screen Readers**: VoiceOver (iOS), TalkBack (Android)
- **Keyboard Navigation**: Tab, Enter, Escape keys
- **Color Contrast**: WCAG AA standards verified

---

## 📧 Email Service (Resend)

### Setup Resend

1. **Sign up** at [resend.com](https://resend.com)
2. **Get API Key** from dashboard
3. **Add to `.env`**: `RESEND_API_KEY=re_...`
4. **Configure Domain** (optional): Add SPF, DKIM records for custom domain

### Email Templates

- **Order Confirmation**: Sent to customer after order placement
- **Admin Notification**: Sent to admin when new order arrives
- **Email Verification**: Sent after user registration
- **Stock Notification**: Sent when out-of-stock item is restocked

### Free Tier Limits

- **3,000 emails/month**
- **100 emails/day**
- Sufficient for small to medium e-commerce operations

---

## 🔔 Push Notifications (Firebase FCM)

### Setup Firebase

1. **Create Firebase Project** at [console.firebase.google.com](https://console.firebase.google.com)
2. **Enable Cloud Messaging**
3. **Get Configuration**:
   - Project Settings → General → Your apps → Web app
   - Copy config values to `.env.local`
4. **Generate VAPID Key**:
   - Project Settings → Cloud Messaging → Web Push certificates
   - Generate key pair, copy to `NEXT_PUBLIC_FCM_VAPID_KEY`

### Features

- **Background Notifications**: Service worker handles notifications when tab is closed
- **Foreground Notifications**: In-app notifications when dashboard is open
- **Sound Alerts**: Audio notification for admin dashboard
- **100% FREE**: Unlimited push notifications

---

## 🆘 Troubleshooting

### Frontend Issues

#### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### API Connection Failed
```bash
# Check backend is running
curl http://localhost:5000/health

# Check NEXT_PUBLIC_API_URL in .env.local
echo $NEXT_PUBLIC_API_URL
```

### Backend Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps

# Test connection
psql postgresql://postgres:postgres@localhost:5432/savisanju

# Restart PostgreSQL
cd savisanju-backend
docker-compose restart
```

#### Migration Errors
```bash
# Check current schema
psql postgresql://postgres:postgres@localhost:5432/savisanju -c "\dt"

# Re-run migrations
cd savisanju-backend
psql postgresql://postgres:postgres@localhost:5432/savisanju -f migrations/001_initial_schema.sql
psql postgresql://postgres:postgres@localhost:5432/savisanju -f migrations/002_security_architecture_overhaul.sql
```

### Common Issues

#### "Cannot find module" Error
```bash
# Frontend: Clear node_modules and reinstall
cd savisanju-frontend
rm -rf node_modules package-lock.json
npm install

# Backend: Clear node_modules and reinstall
cd ../savisanju-backend
rm -rf node_modules package-lock.json
npm install
```

#### GSAP Animation Not Working
```bash
# Check GSAP is installed
npm list gsap

# Reinstall if needed
npm install gsap @gsap/react
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Support

For issues or questions:
- **Email**: support@savisanju.com
- **GitHub Issues**: [Create Issue](https://github.com/sathya46official-cmd/savisanjucollections/issues)

---

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing framework
- **GSAP**: For smooth animations
- **Resend**: For reliable email service
- **Firebase**: For free push notifications
- **Oracle Cloud**: For free tier hosting

---

**Built with ❤️ for SaviSanju Collections**

*Created by [sathya46official-cmd](https://github.com/sathya46official-cmd)*
