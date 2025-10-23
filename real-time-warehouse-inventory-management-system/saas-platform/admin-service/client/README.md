# CNH Distributors Admin Portal

A professional admin dashboard for managing your SaaS platform built with React, Vite, and Tailwind CSS.

## 🚀 Features

- **Dashboard Overview** - Key metrics and system health monitoring
- **Tenant Management** - Create, update, and manage tenant accounts
- **System Admin Management** - Manage administrative users and permissions
- **Billing Management** - Handle payments and subscription tracking
- **CORS Origins** - Configure cross-origin resource sharing
- **SSL Certificates** - Manage security certificates
- **Environment Variables** - Secure configuration management
- **Analytics & Logs** - System monitoring and activity tracking

## 🎨 Design System

The admin portal uses a professional color scheme:

- **Primary Teal**: `#0fb493` - Main brand color
- **Dark Teal**: `#036c57` - Secondary actions
- **Blue**: `#0d8ed6` - Information and accents
- **White**: `#ffffff` - Clean backgrounds

## 🛠️ Tech Stack

- **React 19** - Modern React with latest features
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Elegant notifications
- **Heroicons** - Beautiful SVG icons

## 📦 Installation

1. **Navigate to the admin client directory:**

   ```bash
   cd admin-service/client
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🔧 API Integration

The admin portal connects to the admin-service backend API. Make sure your backend server is running on the configured port (default: 3001).

## 🔐 Authentication

The admin portal uses JWT-based authentication with automatic token refresh and secure storage.

## 📱 Responsive Design

The admin portal is fully responsive and works across desktop, tablet, and mobile devices.

## 🚀 Development

```bash
npm run dev
```

Access the admin portal at `http://localhost:5173`

---

**CNH Distributors Admin Portal** - Professional SaaS Management Dashboard+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
