# ⌚ FYLEX — Enterprise Luxury Timepieces & Customizer Platform

**FYLEX** is a high-performance, full-stack luxury timepiece platform featuring an interactive 360° watch configurator, curated collection showcases, an administrative theme & product management studio, and end-to-end e-commerce order workflows.

---

## 🌟 Key Features

### 🛍️ Customer Experience & Storefront (`next_`)
- **Parallax Hero Storytelling & Featured Showcase:** GSAP ScrollTrigger animations, smooth scroll via Lenis, and dynamic Swiper carousels for curated luxury timepieces.
- **Interactive 360° Watch Configurator:** Real-time customization of watch cases, dials, straps, bezels, custom leather belts, and presentation boxes.
- **Dynamic Theme Palette Engine:** Real-time color token rendering tailored per product for background gradients, text accents, and page themes.
- **Streamlined Cart & Checkout Drawer:** Instant slide-over cart, coupon validation, dynamic shipping fee calculations, and Razorpay payment gateway integration.
- **Order Confirmation & Invoicing:** Automated PDF invoice generation and instant order tracking.

### 🛡️ Admin Management Dashboard (`next_/app/admin`)
- **Multi-Step Product Studio (`/admin/products/edit/[id]`):** 5-step product creation & editing workflow including Section 1 Color Palette tokens and Section 2 Explore Showcase Photo uploads (Hero, Story, Specs).
- **Relational Integrity & Auto-Sanitization:** Automated database foreign key sanitization preventing orphaned category, tag, specification, or media IDs.
- **Inventory & Order Management:** Live order status tracking, stock management, customer account controls, and sales analytics.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19, JavaScript / TypeScript |
| **Styling & Animations** | Vanilla CSS (Design Tokens), GSAP (ScrollTrigger), Lenis Smooth Scroll, Swiper.js |
| **Backend API** | NestJS (Node.js framework), TypeScript |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Authentication** | JWT (JSON Web Tokens), Passport.js, Bcrypt |
| **Payments & Services** | Razorpay Node SDK, PDFKit (Invoices), Nodemailer, Sharp (Image Processing) |
| **DevOps & Containerization** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 📁 Repository Structure

```
Fylex-final/
├── nest_/                       # Backend REST API (NestJS + Prisma)
│   ├── prisma/                  # Database schema & seed scripts
│   │   ├── schema.prisma        # PostgreSQL database schema definition
│   │   └── seed_admin_only.js   # Production clean seed script (Admin only)
│   ├── src/                     # NestJS application modules
│   │   ├── modules/product/     # Product, variant & theme service logic
│   │   ├── modules/orders/      # Order management & checkout workflows
│   │   └── modules/cms/         # CMS banner & section controllers
│   ├── uploads/                 # Local uploaded product & media files
│   └── Dockerfile               # Backend Docker build specification
│
├── next_/                       # Frontend Application (Next.js 15)
│   ├── app/                     # App Router pages & administrative routes
│   │   ├── (customer)/          # Public storefront & watch configurator
│   │   ├── admin/               # Admin management portal
│   │   └── page.tsx             # Main homepage with hero parallax & swiper
│   ├── data/                    # Local product fallback data
│   ├── lib/                     # API client utilities & helper functions
│   └── Dockerfile               # Frontend Docker build specification
│
└── docker-compose.yml           # Unified multi-container orchestration
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database running locally (or via Docker)

### 1. Backend Setup (`nest_`)

```bash
# Navigate to backend directory
cd nest_

# Install dependencies
npm install

# Configure environment variables in nest_/.env
# Example: DATABASE_URL="postgresql://fylex_user:fylex_password@localhost:5432/fylex_db?schema=public"

# Run database migrations
npx prisma db push

# Start NestJS dev server
npm run start:dev
```
*Backend API will run at:* `http://localhost:3001` (or port `5000` via proxy).

### 2. Frontend Setup (`next_`)

```bash
# Navigate to frontend directory
cd next_

# Install dependencies
npm install

# Start Next.js dev server
npm run dev
```
*Frontend Application will run at:* `http://localhost:3002`

---

## 🧹 Database Reset & Clean Seed Commands

To wipe the database clean and seed only the initial administrative accounts without demo products:

### Clean Admin Seed (Local)
```bash
cd nest_
node prisma/seed_admin_only.js
```

### Initial Admin Credentials
- **Admin 1:** `admin@fylex.com` | Password: `fylex@123`
- **Admin 2:** `admin@gmail.com` | Password: `fylex@123`

---

## 🐳 Production Deployment (VPS)

The platform is containerized using Docker Compose for simple deployment to live production servers.

### Live Server Information
- **Production Server IP:** `187.127.131.26`

### Standard Update & Redeploy Command
```bash
cd /root/fylex && git pull origin main && docker compose up -d --build
```

### Full Server & Uploads Reset Command
To wipe all database storage, clear `/uploads`, and restart fresh with clean admin credentials:
```bash
cd /root/fylex && git pull origin main && rm -rf nest_/uploads/* && docker compose down -v && docker compose up -d --build
```

---

## 📄 License

This repository is proprietary software. All rights reserved.
