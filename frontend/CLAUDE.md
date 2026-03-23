# Frontend Agent Guidelines

## Project

React 19 + Vite 6 + Tailwind CSS 3. Runs in Docker (dev: HMR via Vite, prod: nginx:alpine serving static build).

## Commands

- `docker compose up` — start dev stack (frontend at port 3000, proxied through nginx at 8080)
- `docker compose exec frontend npm run build` — production build
- `docker compose exec frontend npx vitest run` — run tests

## Design System — READ BEFORE ANY UI WORK

**`dev-design-notes.md`** is the single source of truth for all visual decisions. Read it before creating or modifying any component. It covers:

- Color tokens (light/dark mode CSS variables) — Section 2
- Typography scale and font rules — Section 3
- Border radius values — Section 4
- Component styles (Card, Button, Badge, Input, Sidebar, etc.) — Section 5
- Spacing conventions — Section 6
- Animation and transitions — Section 7
- Data visualization colors and rules — Section 8

Key rules from the design system:

1. **Always use CSS variables** (`var(--primary)`, `bg-card`, `text-foreground`) — never hardcode hex values.
2. **Dark mode is class-based** (`.dark` on `<html>`) — never use `prefers-color-scheme` media queries.
3. **Extend `src/components/ui.jsx`** for shared components — no one-off styled elements in pages.
4. **Skeleton loaders over spinners** for content loading >300ms.
5. **Max 3 font weights** per view (400, 500, 700).

## File Structure

```
public/
  logo.png           # Aras Integrasi logo — use <img src="/logo.png"> wherever a logo is needed
src/
  main.jsx           # Entry point — StrictMode + root render
  App.jsx            # Router setup — all routes defined here
  index.css          # Tailwind + global styles + CSS variables
  api.js             # Centralised fetch wrapper — all API calls go through this
  pages/             # One file per route (Home.jsx, Dashboard.jsx)
  pages/template/    # Template reference pages — remove before production
  components/        # Shared components (ui.jsx for design system primitives)
  hooks/             # Custom React hooks
  lib/               # Utility functions (no React, no state)
```

## Logo

The Aras Integrasi logo is at `public/logo.png`. Reference it as `<img src="/logo.png">` — Vite serves `public/` files at the root path. Use this logo for navbars, login pages, favicons, and loading screens. Do not replace it with placeholder icons or SVGs.

## Template Pages

`src/pages/template/` contains the design system showcase at `/design-system`. This is a living reference — do not modify it. Build your app in `src/pages/`. Remove the `/design-system` route from `App.jsx` before production.

## Reference Materials (AI-Generated Drafts)

If the project contains AI-generated reference code (e.g. `sample-frontend/` from Google AI Studio, or `frontend/reference/`), treat it as a **rough structural draft**:

- Read it to understand page layout, data model, information hierarchy, and user flows
- Do NOT copy its code, styles, or component structure directly
- Rebuild everything from scratch using `dev-design-notes.md` as the visual authority
- Use CSS variables from `src/index.css` and component classes — never hardcode hex values from the reference
- Improve layout, spacing, typography, and polish wherever you see opportunities
- Reference code is for understanding intent only — rewrite using proper React patterns and shared components

## Rules — ENFORCE CONSISTENTLY

### Visual & UX
- **No emojis** in UI text, labels, headings, or status messages.
- Use `motion` (from `"motion/react"`) for all animations — scroll reveals, page transitions, hover effects, staggered lists. No raw CSS keyframes for interactive motion.
- Transitions must feel fluid: use spring physics (`type: "spring"`) for interactive elements, ease-out for entrances, ease-in for exits.
- Animation durations: 150ms hover states, 250ms element transitions, 300-400ms page-level reveals.

### API calls
- All fetches go through `api.js` — never use raw `fetch()` or `axios` in components.
- API base path is `/api` — Vite proxy (dev) and nginx (prod) handle routing.

### Components
- Keep page components under 300 lines — extract sections into `components/`.
- Props must be destructured in the function signature.
- Use `clsx` or `cn` for conditional class composition — no ternary string concatenation.

### State
- Local state (`useState`) for UI-only state (modals, form inputs, toggles).
- Lift state up when 2+ siblings need the same data — don't reach for global state prematurely.
- Data fetching: `useEffect` + `api.js` (or add React Query/SWR when complexity warrants it).

### Security
1. **Never** store tokens in `localStorage` — use httpOnly cookies (backend sets them).
2. **Never** render user-provided HTML without sanitisation — no `dangerouslySetInnerHTML` with raw input.
3. **Never** hardcode API keys or secrets in frontend code — they ship to the browser.

### Code Style
- Functional components only — no class components.
- Named exports for pages and components.
- Imports: react → third-party → app modules (`@/components`, `@/hooks`), separated by blank lines.
- File naming: PascalCase for components (`UserCard.jsx`), camelCase for utilities (`formatDate.js`).
