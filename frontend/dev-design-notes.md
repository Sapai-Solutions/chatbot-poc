# Aras Integrasi — Frontend Design System Specification
> **Version:** 1.1  
> **Status:** Draft  
> **Source:** Extracted from Spyder Platform (`index.css`, `ui.tsx`, `App.jsx`)  
> **Purpose:** This document defines the visual language for all Aras Integrasi frontend products. It covers color, typography, spacing, and component styling. Layout references are included only to illustrate acceptable density and clutter tolerance — they are **not** prescriptive page templates.

---

## 1. Design Philosophy

Our products should feel **calm, professional, and data-forward**. The aesthetic leans warm-neutral rather than cold/clinical. Whitespace is intentional — screens should never feel cluttered. Data visualizations should breathe; nodes, charts, and tables must be legible without zooming or hunting.

Key principles:
- **Low clutter.** Prefer generous spacing over dense information packing. If something needs to be hidden behind a scroll or a toggle, that's fine — don't force everything onto one screen.
- **Warm neutrals, not stark white.** Backgrounds are cream/off-white, not pure `#FFFFFF`. This reduces eye strain and gives the product a distinct, premium feel.
- **Golden accent, used sparingly.** The mustard/gold tone is our primary brand accent. It should appear on active states, primary buttons, and key interactive affordances — not decoratively.
- **Typography does the heavy lifting.** Hierarchy is achieved through weight and size, not color. Avoid using too many different colors for text.

---

## 2. Color Tokens

These are the **canonical CSS custom properties** defined in `src/index.css`. All products should use these variable names. Never hardcode hex values in components.

### 2.1 Light Mode (`:root`)

| CSS Variable | Role | Value |
|---|---|---|
| `--background` | Main page background | `#f8f7f2` |
| `--foreground` | Primary text | `#23272f` |
| `--card` | Card / panel background | `#ffffff` |
| `--card-foreground` | Text inside cards | `#23272f` |
| `--border` | Borders and dividers | `#e0dbd0` |
| `--input` | Input field border | `#e0dbd0` |
| `--ring` | Focus ring color | `#b09548` |
| `--muted` | Muted background (subtle fills) | `#f0ece1` |
| `--muted-foreground` | Secondary / placeholder text | `#717568` |
| `--primary` | Brand accent — buttons, active states | `#b09548` |
| `--primary-foreground` | Text on primary backgrounds | `#ffffff` |
| `--secondary` | Secondary button / chip background | `#e8e3d5` |
| `--secondary-foreground` | Text on secondary backgrounds | `#3d3f36` |
| `--accent` | Hover fills, subtle highlights | `#f3efe6` |
| `--accent-foreground` | Text on accent backgrounds | `#3d3f36` |
| `--destructive` | Error, danger, delete actions | `#c03a3a` |
| `--sidebar` | Sidebar background | `#eeebe2` |
| `--sidebar-foreground` | Sidebar text | `#3d3f36` |
| `--sidebar-active` | Active nav item background | `#e6dfc8` |
| `--panel` | Secondary panel background | `#fafaf6` |

### 2.2 Dark Mode (`.dark`)

| CSS Variable | Role | Value |
|---|---|---|
| `--background` | Main page background | `#16140f` |
| `--foreground` | Primary text | `#e8e4da` |
| `--card` | Card / panel background | `#1f1c16` |
| `--card-foreground` | Text inside cards | `#e8e4da` |
| `--border` | Borders and dividers | `#2e2a22` |
| `--input` | Input field border | `#2e2a22` |
| `--ring` | Focus ring color | `#c9a84c` |
| `--muted` | Muted background | `#231f18` |
| `--muted-foreground` | Secondary / placeholder text | `#8a8476` |
| `--primary` | Brand accent — buttons, active states | `#c9a84c` |
| `--primary-foreground` | Text on primary backgrounds | `#16140f` |
| `--secondary` | Secondary button / chip background | `#2a2620` |
| `--secondary-foreground` | Text on secondary backgrounds | `#ccc6b8` |
| `--accent` | Hover fills, subtle highlights | `#252118` |
| `--accent-foreground` | Text on accent backgrounds | `#ccc6b8` |
| `--destructive` | Error, danger, delete actions | `#e05252` |
| `--sidebar` | Sidebar background | `#1b1914` |
| `--sidebar-foreground` | Sidebar text | `#c0b9aa` |
| `--sidebar-active` | Active nav item background | `#2d2820` |
| `--panel` | Secondary panel background | `#1f1c16` |

> **Dark mode is class-based.** The `.dark` class is toggled on the root `<html>` element (e.g. via a React context/hook). Default theme can follow system preference. Never use `prefers-color-scheme` media queries directly in component styles — always use the `.dark` class overrides in `index.css`.

### 2.3 Data Visualization Colors

Used for charts, knowledge graph nodes, and entity type indicators. These should be **consistent across light and dark modes**.

| Entity / Series | Role | Hex |
|---|---|---|
| `--color-viz-order` | Order entities / Series 1 | `#C47C5A` |
| `--color-viz-review` | Review entities / Series 2 | `#5B7FA6` |
| `--color-viz-transaction` | Transaction entities / Series 3 | `#8B7D3A` |
| `--color-viz-customer` | Customer entities / Series 4 | `#6B7A3A` |
| `--color-viz-item` | Item entities / Series 5 | `#7A9A4A` |
| `--color-viz-chart-primary` | Default chart bar/line (dark mode) | `#7B7FE8` |

> These earthy, desaturated tones are intentional. Avoid neon or highly saturated chart colors — they conflict with the warm-neutral brand palette. In dark mode, the blue-purple `#7B7FE8` is preferred for single-series charts as earthy tones read poorly on very dark backgrounds.

---

## 3. Typography

### 3.1 Font Families

```css
/* Defined in tailwind.config.js and loaded via <link> in index.html */
fontFamily.sans: "Inter", ui-sans-serif, system-ui, sans-serif
fontFamily.mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace

/* Applied in index.css */
body { font-family: theme('fontFamily.sans'); }
```

| Role | Font | Notes |
|---|---|---|
| All UI text | **Inter** | Loaded via Google Fonts `<link>` in `index.html`. Clean, modern, excellent at small sizes. |
| Code, SQL, Cypher queries | **JetBrains Mono** | Used for any monospace content — query displays, code blocks, session IDs. |

### 3.2 Type Scale

These map directly to Tailwind utility classes used in `ui.tsx` and components.

| Usage | Tailwind Class | Approx Size | Weight | Color Variable |
|---|---|---|---|---|
| Page title (H1) | `text-2xl font-bold` | 24–32px | 700 | `--foreground` |
| Section / card title | `text-base font-semibold` | 16px | 600 | `--foreground` |
| Sub-section label | `text-sm font-medium` | 14px | 500 | `--foreground` |
| Body copy | `text-sm` | 14px | 400 | `--foreground` |
| Secondary / metadata | `text-xs` | 12px | 400 | `--muted-foreground` |
| Large KPI / stat number | `text-2xl font-bold` | 24–28px | 700 | `--foreground` |
| Button label | `text-sm font-medium` | 14px | 500 | `--primary-foreground` |
| Badge / chip text | `text-xs font-medium` | 12px | 500 | varies by variant |
| Nav item | `text-sm font-medium` | 14px | 500 (active: 600) | `--sidebar-foreground` |
| Code / SQL | `font-mono text-xs` | 12px | 400 | `--muted-foreground` |

### 3.3 Rules

- Use no more than **3 type weights** in a single view (400, 500, 700 is a safe set).
- **Do not use color to create hierarchy** — use size and weight differences instead.
- Entity type sub-labels in graphs (e.g. "Customer", "Order") use `--primary` color at `text-xs` size.
- All code, SQL, and query output must use `font-mono` (JetBrains Mono), never a proportional font.
- Line height: `1.5` for body, `1.2–1.3` for headings, `1.2` for dense data labels.

---

## 4. Border Radius

Use Tailwind `rounded-*` utilities. Do not define custom radius values unless there is a clear need.

| Value | Tailwind Class | Usage |
|---|---|---|
| 4px | `rounded-sm` | Tight elements — small chips, inline tags |
| 6px | `rounded-md` | Inputs, small buttons |
| 8px | `rounded-lg` | Buttons (standard), dropdowns |
| 12px | `rounded-xl` | Cards, panels ← most common |
| 16px | `rounded-2xl` | Large modals, prominent containers |
| 9999px | `rounded-full` | Badges, status dots, avatar circles |

---

## 5. Component Styles

Sourced directly from `src/components/ui.tsx`. These are the canonical implementations — replicate these patterns, do not invent new ones without updating the shared file.

### 5.1 Card

```
rounded-xl border border-border bg-card p-4 shadow-sm
```
Cards should feel floating but subtle. Avoid heavy shadows or colored borders — `shadow-sm` is the maximum.

### 5.2 Button

Base: `inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all cursor-pointer`

| Variant | Background | Text | Border |
|---|---|---|---|
| `primary` | `bg-primary` | `text-primary-foreground` | none, `shadow-sm` |
| `ghost` | transparent | `text-muted-foreground` | none, hover: `bg-accent` |
| `outline` | transparent | `text-foreground` | `border border-border` |
| `danger` | `bg-destructive/10` | `text-destructive` | `border border-destructive/20` |

### 5.3 Badge

Base: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight`

| Variant | Background | Text | Border |
|---|---|---|---|
| `default` | `bg-primary/12` | `text-primary` | `border border-primary/20` |
| `success` | `bg-emerald-50` | `text-emerald-700` | `border border-emerald-200` |

Badges are always `rounded-full`. Use for status labels, entity type tags, and counts.

### 5.4 Empty State

```
Wrapper:     flex flex-col items-center justify-center py-16 text-center text-muted-foreground
Title:       font-medium text-foreground
Description: text-sm text-muted-foreground
```

Empty states must always have generous vertical padding (`py-16` minimum). Never show a blank area without an empty state message.

### 5.5 Sidebar Navigation

```
Background:         var(--sidebar)
Text:               var(--sidebar-foreground)
Active item bg:     var(--sidebar-active)
Width:              ~230px
Item padding:       py-2 px-4
Item border-radius: rounded-lg
Active text weight: font-semibold
Icon size:          18px, thin stroke (1.5px)
```

The sidebar has no explicit right border — the background color difference from the page creates separation naturally.

### 5.6 Clarification / Notice Box

```
Background:    var(--accent)
Border:        1px solid var(--ring)
Border-radius: rounded-xl
Padding:       p-4
Heading:       text-xs uppercase tracking-wider font-semibold text-muted-foreground
Icon:          warning icon, text-primary, inline with heading
```

Option buttons within clarification boxes use the `outline` button variant.

### 5.7 Input Fields

```
Background:    var(--card) or transparent
Border:        0.5px solid var(--input)
Border-radius: rounded-lg
Padding:       px-3.5 py-2
Font-size:     text-sm
Placeholder:   text-muted-foreground
Focus:         border-color: var(--ring), box-shadow: 0 0 0 2px rgba(ring, 0.15) — flush with border, no offset
```

### 5.8 Focus Ring (Global)

```css
/* Already defined in index.css — do not override per-component */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

`--ring` is the gold accent (`#b09548` light / `#c9a84c` dark). All interactive elements automatically get a consistent, branded focus indicator.

### 5.9 Spinner

```
animate-spin h-5 w-5 text-primary
```

Reserved for small inline loading indicators only. For page-level or content-area loading, use **skeleton loaders** instead (see Section 7.2).

---

## 6. Spacing

No custom spacing tokens are defined — use standard **Tailwind spacing utilities** throughout. The effective base unit is `4px`.

| Tailwind | Value | Common Usage |
|---|---|---|
| `p-1` / `gap-1` | 4px | Icon-to-label tight gaps |
| `p-2` / `gap-2` | 8px | Compact padding, small gaps |
| `p-3` / `gap-3` | 12px | Default inline padding |
| `p-4` / `gap-4` | 16px | Card padding (default) |
| `p-6` / `gap-6` | 24px | Section gaps, page content padding |
| `p-8` / `gap-8` | 32px | Large section spacing |
| `py-16` | 64px | Empty state vertical centering |

**Rule of thumb:** when in doubt, round up to the next spacing step. Tighter is rarely better.

---

## 7. Animation & Transitions

### 7.1 Default Transitions

```
Duration:  150ms
Easing:    cubic-bezier(0.4, 0, 0.2, 1)
```

All interactive elements (buttons, nav items, inputs) use `transition-all` or `transition-colors` with the default 150ms. Do not use longer durations for hover or focus state changes.

### 7.2 Custom Animations (defined in `index.css`)

| Class | Duration | Use Case |
|---|---|---|
| `.animate-message-in` | 0.28s cubic-bezier | Incoming chat message (left side) |
| `.animate-message-in-right` | 0.28s cubic-bezier | Outgoing chat message (right side) |
| `.animate-fade-in-up` | 0.22s | Panel / card entrance |
| `skeleton-shimmer` | 2s | Loading skeleton shimmer |
| `skeleton-bar-grow` | 1.6s | Chart skeleton bar grow |
| `skeleton-label-pulse` | 1.6s | Label skeleton pulse |

Use **skeleton loaders** (not spinners) for content that takes >300ms to load. The Spinner component is for small inline indicators only.

---

## 8. Data Visualization Guidelines

### 8.1 General Principles

- **Breathing room is non-negotiable.** Charts and graphs must have enough whitespace that elements are individually legible. Do not pack nodes or bars together.
- **Labels must not collide.** Tune layout engines so node labels do not overlap at typical data loads.
- **No extra backgrounds on charts.** Charts live inside cards — the card background is sufficient. Do not add another fill to the chart container.

### 8.2 Knowledge Graph / Node Visualizations

- Use **force-directed layout with strong repulsion** so nodes are naturally spaced.
- Node sizes should reflect entity weight (more relationships = larger node).
- Node colors must map to entity types using the `--color-viz-*` tokens in Section 2.3.
- Edge lines: `1–1.5px` stroke, `0.3–0.5` opacity, warm neutral gray. They guide the eye — they should not dominate.
- Entity type sub-label (e.g. "Item", "Customer") sits below the node name, colored `--primary`, `text-xs`.
- **Do not render all nodes at maximum zoom by default.** Start at a zoom level where ~20–40 nodes are visible without crowding. Provide a type filter to reduce visible node types.

### 8.3 Bar / Line Charts

- Default single-series color: `#7B7FE8` (reads well on both light and dark).
- Grid lines: horizontal only, thin, low opacity (`0.15`).
- Axis labels: `text-xs`, `--muted-foreground`.
- Chart title: `text-sm font-semibold`, above the chart, left-aligned.
- Clean, unbordered chart containers — the card boundary is the frame.

---

## 9. Layout Density Reference

> These are **not prescribed layouts**. They illustrate the maximum acceptable information density per screen — use them as a calibration guide.

**Dashboard:**
- Max 3 data source cards in a row at full width
- 1 chart + 1 summary panel side by side below
- No more than ~8–10 distinct data points above the fold

**Chat interface:**
- Conversation list panel (~260px) + main chat area
- `gap-6` or more between messages — do not stack tightly
- Clarification/action chips are block-level rows, not inline-wrapped

**Graph / visualization:**
- Canvas occupies full remaining viewport height
- Node labels legible at default zoom without overlap
- Provide a type filter dropdown to reduce node types on demand
- Comfortable default zoom: ~20–50 nodes visible

---

## 10. Implementation Notes for Developers

### Using tokens
- **Always reference CSS variables**, never hardcode hex values in components.
- In Tailwind, use semantic utility classes: `bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, etc.
- `bg-primary/12` Tailwind opacity modifier syntax is acceptable for tinted backgrounds.

### Theme switching
- Dark mode is toggled by adding/removing the `.dark` class on the root `<html>` element.
- Implement via a React context or a custom `useTheme()` hook that reads from `localStorage` and applies the class.
- Optionally detect system preference on first load with `window.matchMedia('(prefers-color-scheme: dark)')`.
- All `.dark { }` overrides live in `index.css`. No component-level dark mode conditionals.

### Fonts
- Load `Inter` and `JetBrains Mono` via Google Fonts `<link>` tags in `index.html`.
- Font families are defined in `tailwind.config.js` under `theme.extend.fontFamily`.
- `index.css` applies the sans font to `body` via `theme('fontFamily.sans')`.
- Do not import fonts via JavaScript — use `<link>` preloading for best performance.

### Component patterns
- Extend `src/components/ui.tsx` for all new shared components. Do not create one-off styled elements in page files.
- Match the existing pattern: define variant maps (`BTN_VARIANTS`, `BADGE_VARIANTS`) as plain objects and compose with `clsx` / `cn`.
- Skeleton loaders are preferred over spinners for page-level content loading.
- When adding a new component, document it in this file under Section 5 with its Tailwind classes.