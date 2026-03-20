# SaviSanjuCollections - Premium E-Commerce Platform ✨

A luxury, full-stack e-commerce web application built for showcasing and selling premium fashion segments (like Kanjivaram and Banarasi sarees). This project is designed to deliver a high-end visual experience using **Next.js**, **GSAP animations**, **Framer Motion**, and **Tailwind CSS**, backed by a powerful **Supabase** backend.

## 🌟 Features

* **Award-Winning UI/UX**: Dynamic GSAP element transitions, responsive layout grids, and elegant typography matching luxury brands.
* **Color-Adaptive Backgrounds**: Storefront automatically adjusts background tones to match the exact hex-codes of the currently selected product color.
* **Secure Admin Dashboard**: Hidden `/admin` route allows total control over the inventory without needing code changes.
  * **Image Uploading**: Upload multiple image angles directly to a Supabase bucket.
  * **Variant Management**: Easily specify colors, real-time stock status, pricing, and specific product descriptions.
* **Authentic Checkout Flow**: Secure and robust checkout model capturing address and mobile number, logging directly to the database.
* **Database & Auth Integration**: Integrated Supabase Authentication with row-level security policies (RLS).

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
- **Animations**: GSAP, Framer Motion
- **Icons**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage)

## 📦 Getting Started (Local Development)

1. Clone this repository:
```bash
git clone https://github.com/sathya46official-cmd/savisanjucollections.git
cd savisanjucollections
```

2. Install Dependencies:
```bash
npm install
```

3. Set up your `.env.local` containing your Supabase project keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

4. Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to view the storefront, and `http://localhost:3000/admin` to manage inventory.

## 🤝 Contribution & License

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](#) if you want to contribute.

If you found this template helpful, please give it a **⭐ Star** to show your support!

---
*Created by [sathya46official-cmd](https://github.com/sathya46official-cmd)*
