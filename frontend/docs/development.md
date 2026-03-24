# Frontend — Developer Guide

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 18 | UI library |
| Vite | 5 | Build tool & dev server |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Utility-first styling |
| shadcn/ui | latest | Component primitives |
| React Router | 6 | Client-side routing |
| Axios | latest | HTTP client with interceptors |

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 (or bun)

---

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev       # http://localhost:5173
```

---

## Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `VITE_API_URL` | ✓ | Base URL of the Express backend |

> **Vite exposes only variables prefixed with `VITE_`** to the browser bundle. Never put secrets here.

---

## Folder Structure

```
frontend/src/
├── main.tsx              # React entry point
├── App.tsx               # Router + route definitions
├── index.css             # Global CSS design tokens
├── App.css               # App-level resets
│
├── assets/               # Static assets (images, icons)
│   └── hero-farm.jpg
│
├── components/           # Shared layout & UI components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Layout.tsx
│   ├── NavLink.tsx
│   ├── ProtectedRoute.tsx
│   └── ui/               # shadcn/ui primitives
│
├── contexts/             # React context providers
│   └── AuthContext.tsx   # User state, login/logout actions
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Consume AuthContext
│   └── useLocalStorage.ts
│
├── lib/                  # Utility modules
│   └── api.ts            # Axios instance with JWT interceptor
│
└── pages/                # Route-level page components
    ├── Landing.tsx
    ├── AuthPage.tsx       # Login + Register tabs
    ├── AnalyzeForm.tsx    # Soil input form
    ├── Results.tsx        # Recommendation output
    ├── AdminDashboard.tsx # Admin-only stats & tables
    └── NotFound.tsx       # 404
```

---

## Routing

| Path | Component | Auth Required | Role |
|------|-----------|:---:|------|
| `/` | `Landing` | — | — |
| `/auth` | `AuthPage` | — | — |
| `/analyze` | `AnalyzeForm` | ✓ | any |
| `/results/:id` | `Results` | ✓ | any |
| `/admin` | `AdminDashboard` | ✓ | admin |
| `*` | `NotFound` | — | — |

`ProtectedRoute` wraps authenticated routes; unauthenticated users are redirected to `/auth`.

---

## API Client

`src/lib/api.ts` exports an Axios instance pre-configured with:

- **Base URL** from `VITE_API_URL`
- **Request interceptor** — injects `Authorization: Bearer <token>` from `localStorage`
- **Response interceptor** — on `401`, clears token and redirects to `/auth`

```typescript
import api from '@/lib/api';

// Example usage
const res = await api.post('/api/analyze', payload);
```

---

## Auth Flow

```
1. User submits AuthPage login form
2. POST /api/auth/login via api.ts
3. On success → store accessToken + refreshToken in localStorage
4. AuthContext updates user state → triggers re-render
5. React Router redirects to /analyze
6. On any 401 → interceptor clears storage → redirect to /auth
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across `src/` |

---

## Vite Proxy (Dev Only)

`vite.config.ts` proxies `/api` requests to avoid CORS issues in development:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

In production, configure your reverse proxy (Nginx / Caddy) to forward `/api` instead.

---

## Adding a New Page

1. Create `src/pages/MyPage.tsx`
2. Add a route in `App.tsx`:
   ```tsx
   <Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
   ```
3. Add a nav link in `Header.tsx` if needed

---

## Adding a shadcn/ui Component

```bash
npx shadcn-ui@latest add <component-name>
```

Components are added to `src/components/ui/` and can be imported directly:

```typescript
import { Button } from '@/components/ui/button';
```
