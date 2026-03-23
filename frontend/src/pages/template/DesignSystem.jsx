/**
 * DesignSystem.jsx — Living design system reference.
 *
 * This is a TEMPLATE PAGE. Do not modify — use as a visual reference.
 * Visit /design-system to view. Remove route before production.
 *
 * Rebuilt from sample.html into React + motion + Tailwind CSS 3.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, stagger, useAnimate } from 'motion/react'

// ── Data ────────────────────────────────────────────────────────────────────────

const PALETTE_GROUPS = [
  {
    name: 'Light Mode -- Surfaces',
    swatches: [
      { color: '#f8f7f2', token: '--background' },
      { color: '#ffffff', token: '--card' },
      { color: '#fafaf6', token: '--panel' },
      { color: '#eeebe2', token: '--sidebar' },
      { color: '#f0ece1', token: '--muted' },
    ],
  },
  {
    name: 'Light Mode -- Text & Borders',
    swatches: [
      { color: '#23272f', token: '--foreground' },
      { color: '#3d3f36', token: '--secondary-fg' },
      { color: '#717568', token: '--muted-fg' },
      { color: '#e0dbd0', token: '--border' },
      { color: '#e8e3d5', token: '--secondary' },
    ],
  },
  {
    name: 'Brand Accent -- Gold',
    swatches: [
      { color: '#b09548', token: '--primary' },
      { color: '#c9a84c', token: '--primary (dark)' },
      { color: '#f3efe6', token: '--accent' },
      { color: '#e6dfc8', token: '--sidebar-active' },
      { color: '#ffffff', token: '--primary-fg' },
    ],
  },
  {
    name: 'Dark Mode -- Surfaces',
    swatches: [
      { color: '#16140f', token: '--background' },
      { color: '#1f1c16', token: '--card' },
      { color: '#1b1914', token: '--sidebar' },
      { color: '#2d2820', token: '--sidebar-active' },
      { color: '#2e2a22', token: '--border' },
    ],
  },
  {
    name: 'Status Colors',
    swatches: [
      { color: '#22c55e', token: 'success' },
      { color: '#b09548', token: 'warning' },
      { color: '#c03a3a', token: 'destructive' },
      { color: '#e05252', token: 'destructive (dark)' },
      { color: '#e8e3d5', token: 'neutral' },
    ],
  },
  {
    name: 'Data Visualization',
    swatches: [
      { color: '#C47C5A', token: 'Order' },
      { color: '#5B7FA6', token: 'Review' },
      { color: '#8B7D3A', token: 'Transaction' },
      { color: '#6B7A3A', token: 'Customer' },
      { color: '#7A9A4A', token: 'Item' },
    ],
  },
]

const TYPE_SCALE = [
  { label: 'Page Title - H1', specs: '32px - weight 700', specimen: 'Dashboard', className: 'text-3xl font-bold tracking-tight' },
  { label: 'Section Title - H2', specs: '18px - weight 600', specimen: 'Entity Types Overview', className: 'text-lg font-semibold' },
  { label: 'Sub Label - H3', specs: '14px - weight 500', specimen: 'PostgreSQL - Connected', className: 'text-sm font-medium' },
  { label: 'Body Copy', specs: '14px - weight 400 - lh 1.6', specimen: 'Interactive visualization of entities and their relationships. Click nodes to expand.', className: 'text-sm' },
  { label: 'Secondary Label', specs: '12px - weight 400 - muted', specimen: 'Tables - Total rows - Last updated', className: 'text-xs', muted: true },
  { label: 'KPI / Stat Number', specs: '28px - weight 700 - tabular', specimen: '417', className: 'text-3xl font-bold', style: { fontVariantNumeric: 'tabular-nums' } },
  { label: 'Monospace - Code', specs: 'JetBrains Mono - 13px', specimen: 'SELECT * FROM customers LIMIT 500', className: 'font-mono text-sm', mono: true },
]

const SIDEBAR_ITEMS = ['Dashboard', 'Projects', 'Chat', 'Knowledge Graph', 'Import CSV']

const SCRATCH_STEPS = [
  {
    step: 'A',
    title: 'Define your product with AI',
    body: 'Open Claude, ChatGPT, or any AI assistant. Describe your product idea conversationally — what it does, who uses it, and what problems it solves. Ask it to produce a PRD (Product Requirements Document) covering both frontend and backend.',
    code: `Product: AI Deploy — GPU Training Calendar

Overview:
A monitoring dashboard for ML engineers to schedule,
track, and manage AI training jobs across GPU clusters.

Core Features:
- Monthly calendar view of training job schedules
- Real-time GPU cluster health and utilization
- Training job lifecycle (schedule/start/stop/logs)
- Model registry with version tracking

Pages:
1. Deployment Calendar — KPIs + monthly calendar
2. Model Registry — models, versions, status
3. GPU Clusters — health, utilization, nodes
4. Settings — notifications, cluster config

Backend:
- REST API: CRUD for jobs, clusters, models
- WebSocket: real-time job status updates
- Celery: job scheduling, periodic health checks
- PostgreSQL + Redis

(Truncated — a full PRD includes user stories,
 acceptance criteria, and edge cases)`,
    codeLabel: 'Example PRD (truncated)',
  },
  {
    step: 'B',
    title: 'Distill into a design prompt',
    body: 'Ask the AI: "Based on this PRD, give me a one-line app description and a numbered page list I can use as a UI design prompt." This becomes the input for Google Stitch.',
    code: `A deployment calendar app for monitoring AI training
jobs across GPU clusters.

Pages:
1. Deployment Calendar — monthly view with scheduled
   training jobs, KPI summary cards (active deployments,
   total count, success rate)
2. Model Registry — trained models with version tracking
3. GPU Clusters — health monitoring, utilization metrics
4. Settings — notifications and cluster configuration`,
    codeLabel: 'Expected output — paste this into google-stitch.md line 1',
  },
  {
    step: 'C',
    title: 'Generate mockup with Google Stitch',
    body: 'Open google-stitch.md from the template. Replace the first line ("[YOUR DESIGN IDEA]") with the description and page list from the previous step. Paste the entire file into Google Stitch — the design system rules are already embedded.',
    images: ['/guide/stitch-mockup.png'],
    imageCaption: 'Google Stitch generates a high-fidelity mockup using the embedded design system rules',
    tip: 'google-stitch.md includes all Aras color tokens, typography, component specs, and spacing rules. The AI generates a mockup that already follows the brand language.',
  },
  {
    step: 'D',
    title: 'Export to Google AI Studio',
    body: 'From Google Stitch, click Export and select "Build with AI Studio". This sends your mockup to Google AI Studio (Gemini), which generates a working codebase from the design. The code will be rough — that is expected.',
    images: ['/guide/ai-studio-export-1.png', '/guide/ai-studio-export-2.png'],
    imageCaption: 'Export from Stitch → AI Studio, then prompt Gemini to build the app',
  },
  {
    step: 'E',
    title: 'Export and load reference code',
    body: 'Download the generated code from AI Studio (it exports as a zip). Unzip and place the folder in your project root — e.g. sample-frontend/. There are no screenshots in the export; the code itself is your structural reference.',
    images: ['/guide/rough-reference.png'],
    imageCaption: 'The AI-generated app — functional but rough. This is your structural reference.',
    code: `calendar-ai/                   # Your bootstrapped project
  sample-frontend/             # Unzipped AI Studio export
    src/
      App.tsx                  # The generated UI code
      index.css                # Generated styles
    package.json
  frontend/                    # The real frontend (template)
    src/
      pages/                   # You build here
      components/              # Shared components here
    dev-design-notes.md        # Design authority`,
    codeLabel: 'Place the AI Studio export alongside your real frontend',
  },
  {
    step: 'F',
    title: 'Build the real frontend with Claude',
    body: 'Open Claude Code in your project directory and give it a prompt like the one below. Claude reads the sample code to understand structure, then rebuilds everything properly using the design system. The CLAUDE.md in frontend/ already tells Claude to treat reference code as rough drafts.',
    images: ['/guide/final.png'],
    imageCaption: 'The finished product — rebuilt from scratch with the Aras design system, not copied from AI Studio output',
    checklist: [
      'The sample code is a structural reference — Claude does not copy it',
      'dev-design-notes.md is the design authority, not the AI Studio output',
      'Claude builds with proper React components from ui.jsx',
      'Each page stays under 300 lines — shared parts go to components/',
      'All data mocked inline for now, fetches structured through api.js',
    ],
    code: `Build the frontend for this project.

Read these first:
- sample-frontend/src/App.tsx — AI-generated prototype.
  Understand the layout, data model, and user flows.
  Do NOT copy its code or styles. This is a rough draft.
- frontend/dev-design-notes.md — Design system spec.
  This is the visual authority for ALL decisions.
- frontend/CLAUDE.md — All coding rules and conventions.
- frontend/src/index.css — CSS tokens and component classes.

The sample code is a starting point, not a target. Rebuild
the UI from scratch following dev-design-notes.md — improve
spacing, typography hierarchy, color usage, component
polish, and overall visual quality beyond what the AI
prototype produced. Make it feel like a real product.

Pages to create in frontend/src/pages/:
1. Dashboard.jsx — main view: summary cards, monthly
   calendar with deployment events, cluster status table
2. Models.jsx — model registry table
3. Clusters.jsx — GPU cluster cards with utilization
4. Settings.jsx — notification and config forms

Shared components in frontend/src/components/:
- Layout.jsx — sidebar navigation + content area
- SummaryCard.jsx — reusable KPI card
- Calendar.jsx — interactive monthly calendar
- ClusterTable.jsx — status table with utilization bars

Wire up routes in App.jsx. Mock all data inline but
structure fetches through api.js. Use motion from
"motion/react" for page transitions and hover effects.`,
    codeLabel: 'Example prompt for Claude Code',
  },
  {
    step: 'G',
    title: 'Build the backend and connect everything',
    body: 'Once the frontend is working with mock data, give Claude your original PRD and ask it to build the backend API. The backend/CLAUDE.md already defines the architecture — routers, services, models, schemas. Claude will create the database models, write an Alembic migration, seed initial data, and wire the frontend fetches to real endpoints.',
    code: `Based on this PRD, build the backend API and connect
it to the frontend.

Read these first:
- backend/CLAUDE.md — Architecture and coding rules.
- frontend/src/api.js — The fetch functions already
  defined (these tell you what endpoints to create).
- frontend/src/pages/ — See what data each page needs.

Steps:
1. Create ORM models in backend/app/models.py
2. Create Pydantic schemas in backend/app/schemas.py
3. Write services in backend/app/services/
4. Write routers in backend/app/routers/
5. Register routers in backend/app/main.py
6. Write an Alembic migration for the new tables
7. Add a seed script (backend/app/seed.py) so the app
   has data on first launch
8. Update entrypoint.sh to run migrations + seed on
   startup so docker compose up just works

The frontend already has api.js functions pointing at
/api/... endpoints. Match those routes exactly.`,
    codeLabel: 'Example prompt for backend',
    checklist: [
      'Models, schemas, services, routers — follow the layered structure in backend/CLAUDE.md',
      'Match the endpoint paths already defined in frontend/src/api.js',
      'Write a manual Alembic migration — do not rely on autogenerate inside Docker',
      'Seed script should be idempotent (skip if data already exists)',
      'entrypoint.sh runs alembic upgrade head + seed before starting the server',
      'docker compose up should give you a fully working app with real data',
    ],
  },
  {
    step: '!',
    title: 'Disclaimer: this is a starting point',
    body: 'The workflow above gets you from zero to a working full-stack app in the shortest time possible. But the first pass is never perfect — expect to iterate. Review the UI, tighten the layout, adjust API responses, add validation, handle edge cases. Use Claude to refine specific pages or fix issues as you go. The goal of this workflow is to eliminate the blank-page problem and give you a solid foundation to build on.',
  },
]

const DEV_STEPS = [
  {
    step: '01',
    title: 'Set up your color tokens',
    body: 'Copy the :root and .dark variable blocks from dev-design-notes.md into your index.css. Never hardcode hex values in components.',
    code: `/* index.css */\n:root {\n  --background: #f8f7f2;\n  --primary:    #b09548;\n  --card:       #ffffff;\n  --border:     #e0dbd0;\n  /* ... full token list in spec */\n}\n.dark {\n  --background: #16140f;\n  --primary:    #c9a84c;\n  /* ... */\n}`,
  },
  {
    step: '02',
    title: 'Load fonts via Google Fonts',
    body: 'Add Inter and JetBrains Mono via <link> tags in index.html. Define font families in tailwind.config.js. Never import fonts via JavaScript.',
    code: `<!-- index.html -->\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`,
  },
  {
    step: '03',
    title: 'Configure dark mode',
    body: 'Dark mode is class-based. Toggle the .dark class on <html> via a React context or custom useTheme() hook. Never use prefers-color-scheme in components.',
    code: `// hooks/useTheme.js\nexport function useTheme() {\n  const [theme, setTheme] = useState(\n    () => localStorage.getItem('theme') || 'system'\n  )\n  useEffect(() => {\n    const root = document.documentElement\n    const isDark = theme === 'dark' ||\n      (theme === 'system' && matchMedia('(prefers-color-scheme:dark)').matches)\n    root.classList.toggle('dark', isDark)\n    localStorage.setItem('theme', theme)\n  }, [theme])\n  return { theme, setTheme }\n}`,
  },
  {
    step: '04',
    title: 'Build with shared components',
    body: 'Extend src/components/ui.jsx for all shared components. Define variant maps as plain objects and compose with clsx.',
    checklist: [
      'Cards use rounded-xl border border-border bg-card p-4 shadow-sm',
      'Buttons use rounded-lg px-3.5 py-2 text-sm font-medium',
      'Badges are always rounded-full text-xs font-medium',
      'Inputs use border-input focus:ring-ring',
      'Use skeleton loaders for content >300ms, not spinners',
    ],
  },
  {
    step: '05',
    title: 'Respect layout density rules',
    body: 'Never crowd the screen. Use these limits as your calibration guide.',
    density: [
      { title: 'Dashboard', items: ['Max 3 cards per row', '8-10 data points above fold', '24-32px page padding'] },
      { title: 'Chat / Lists', items: ['~260px list sidebar', 'gap-6+ between messages', 'Chips on own row'] },
      { title: 'Graphs / Viz', items: ['Full viewport height', '20-50 nodes default zoom', 'Labels must not overlap'] },
    ],
  },
]

// ── Styles (inline to keep this self-contained) ─────────────────────────────

const s = {
  page: { background: '#f8f7f2', color: '#23272f', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: '#eeebe2', borderBottom: '1px solid #e0dbd0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 52 },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14 },
  navIcon: { width: 28, height: 28, borderRadius: 7 },
  navLinks: { display: 'flex', gap: 4 },
  navLink: { fontSize: 13, fontWeight: 500, color: '#717568', textDecoration: 'none', padding: '5px 12px', borderRadius: 6, transition: 'background 0.15s, color 0.15s' },
  navLinkActive: { fontSize: 13, fontWeight: 600, color: '#23272f', textDecoration: 'none', padding: '5px 12px', borderRadius: 6, background: '#e6dfc8' },
  section: { maxWidth: 1100, margin: '0 auto', padding: '64px 40px' },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b09548', marginBottom: 8 },
  sectionTitle: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 },
  sectionSub: { fontSize: 14, color: '#717568', marginBottom: 40, maxWidth: 560, lineHeight: 1.6 },
  card: { background: '#ffffff', border: '1px solid #e0dbd0', borderRadius: 16, padding: 24 },
  code: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: '#f0ece1', border: '1px solid #e0dbd0', borderRadius: 8, padding: '14px 16px', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#23272f' },
  token: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: '#f0ece1', color: '#717568', borderRadius: 4, padding: '2px 7px' },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  primary: '#b09548',
  muted: '#717568',
  border: '#e0dbd0',
  accent: '#f3efe6',
}

// ── Animation variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', duration: 0.5, bounce: 0.2 } },
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Nav() {
  const [active, setActive] = useState('colors')
  const links = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'components', label: 'Components' },
    { id: 'steps', label: 'Dev Guide' },
    { id: 'scratch', label: 'From Scratch' },
  ]

  return (
    <nav style={s.nav}>
      <div style={s.navLogo}>
        <img src="/logo.png" alt="Aras Integrasi" style={s.navIcon} />
        Aras Integrasi -- Design System
      </div>
      <div style={s.navLinks}>
        {links.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            style={active === id ? s.navLinkActive : s.navLink}
            onClick={() => setActive(id)}
            onMouseEnter={(e) => { if (active !== id) e.target.style.background = s.accent }}
            onMouseLeave={(e) => { if (active !== id) e.target.style.background = 'transparent' }}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <motion.div
      style={{ padding: '80px 40px 64px', maxWidth: 1100, margin: '0 auto' }}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div
        variants={staggerItem}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: s.primary, background: s.accent,
          border: `1px solid ${s.border}`, borderRadius: 999,
          padding: '4px 12px', marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 8 }}>&#9679;</span> Version 1.1 -- Living Document
      </motion.div>

      <motion.h1
        variants={staggerItem}
        style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 700, marginBottom: 20 }}
      >
        Build products that feel like <span style={{ color: s.primary }}>Aras</span>.
      </motion.h1>

      <motion.p
        variants={staggerItem}
        style={{ fontSize: 16, color: s.muted, maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}
      >
        A visual reference of our color palette, typography, and components — followed by a step-by-step guide for developers building new Aras products.
      </motion.p>

      <motion.div variants={staggerItem} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <motion.a
          href="#steps"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 500, borderRadius: 8, padding: '10px 20px',
            background: s.primary, color: 'white', textDecoration: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Start Building
        </motion.a>
        <motion.a
          href="#colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 500, borderRadius: 8, padding: '10px 20px',
            background: 'transparent', color: '#23272f', textDecoration: 'none',
            border: `1px solid ${s.border}`, cursor: 'pointer',
          }}
        >
          Explore Design
        </motion.a>
      </motion.div>
    </motion.div>
  )
}

function SectionHeader({ label, title, sub }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeInUp}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.2 }}
    >
      <div style={s.sectionLabel}>{label}</div>
      <h2 style={s.sectionTitle}>{title}</h2>
      {sub && <p style={s.sectionSub}>{sub}</p>}
    </motion.div>
  )
}

function PaletteCard({ group, index }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={staggerItem}
      style={s.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{group.name}</p>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        {group.swatches.map(({ color, token }, i) => (
          <motion.div
            key={token}
            title={token}
            animate={{ marginRight: hovered ? 4 : -12 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.3 }}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: color, border: '3px solid #ffffff',
              flexShrink: 0, zIndex: group.swatches.length - i,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {group.swatches.map(({ token }) => (
          <span key={token} style={s.token}>{token}</span>
        ))}
      </div>
    </motion.div>
  )
}

function ColorsSection() {
  return (
    <section style={{ ...s.section, borderTop: `1px solid ${s.border}` }} id="colors">
      <SectionHeader
        label="01 -- Colors"
        title="Brand Palette"
        sub="All values are defined as CSS custom properties in index.css. Never hardcode hex values — always reference variables."
      />
      <motion.div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {PALETTE_GROUPS.map((group, i) => (
          <PaletteCard key={group.name} group={group} index={i} />
        ))}
      </motion.div>
    </section>
  )
}

function TypographySection() {
  return (
    <section style={{ ...s.section, borderTop: `1px solid ${s.border}` }} id="typography">
      <SectionHeader
        label="02 -- Typography"
        title="Type System"
        sub="Font: Inter for UI, JetBrains Mono for code. Max 3 weights per screen."
      />
      <motion.div
        style={{ display: 'grid', gap: 16 }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {TYPE_SCALE.map(({ label, specs, specimen, className, muted: isMuted, mono, style: extraStyle }) => (
          <motion.div
            key={label}
            variants={staggerItem}
            style={{
              ...s.card, padding: '20px 24px',
              display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: s.primary, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: s.muted, ...s.mono }}>{specs}</div>
            </div>
            <div>
              {mono ? (
                <span style={{ ...s.mono, fontSize: 13, color: s.muted, background: '#f0ece1', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>
                  {specimen}
                </span>
              ) : (
                <span className={className} style={{ color: isMuted ? s.muted : '#23272f', ...extraStyle }}>
                  {specimen}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function ComponentsSection() {
  return (
    <section style={{ ...s.section, borderTop: `1px solid ${s.border}` }} id="components">
      <SectionHeader
        label="03 -- Components"
        title="UI Components"
        sub="Sourced from src/components/ui.jsx. Extend this file for new shared components — do not create one-off styles in page files."
      />
      <motion.div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {/* Buttons */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, background: '#fafaf6', borderBottom: `1px solid ${s.border}` }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: s.primary, color: 'white', fontWeight: 500, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Primary</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'transparent', color: '#23272f', fontWeight: 500, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: `1px solid ${s.border}`, cursor: 'pointer', fontFamily: 'inherit' }}>Outline</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'transparent', color: s.muted, fontWeight: 500, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Ghost</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'rgba(192,58,58,0.08)', color: '#c03a3a', fontWeight: 500, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(192,58,58,0.2)', cursor: 'pointer', fontFamily: 'inherit' }}>Danger</motion.button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Button</h4>
            <p style={{ fontSize: 12, color: s.muted }}>rounded-lg -- px-3.5 py-2 -- text-sm font-medium -- 4 variants</p>
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8, background: '#fafaf6', borderBottom: `1px solid ${s.border}`, paddingLeft: 32 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: 'rgba(176,149,72,0.12)', color: s.primary, border: '1px solid rgba(176,149,72,0.2)' }}>Active</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>Connected</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#f0ece1', color: s.muted, border: `1px solid ${s.border}` }}>Draft</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: 'rgba(192,58,58,0.08)', color: '#c03a3a', border: '1px solid rgba(192,58,58,0.2)' }}>Error</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: 'rgba(91,127,166,0.12)', color: '#5B7FA6', border: '1px solid rgba(91,127,166,0.2)' }}>Review</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: 'rgba(196,124,90,0.12)', color: '#C47C5A', border: '1px solid rgba(196,124,90,0.2)' }}>Order</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: 'rgba(107,122,58,0.12)', color: '#6B7A3A', border: '1px solid rgba(107,122,58,0.2)' }}>Customer</span>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Badge</h4>
            <p style={{ fontSize: 12, color: s.muted }}>rounded-full -- text-xs font-medium -- entity-type and status variants</p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf6', borderBottom: `1px solid ${s.border}` }}>
            <motion.div
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              style={{ background: 'white', border: `1px solid ${s.border}`, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', width: 220 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>PostgreSQL</span>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 0 rgba(34,197,94,0.4)', animation: 'pulse-dot 2s ease-in-out infinite' }} title="Connected" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>417</div>
              <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>Total rows across 5 tables</div>
            </motion.div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Card</h4>
            <p style={{ fontSize: 12, color: s.muted }}>rounded-xl -- border-border -- bg-card -- p-4 -- shadow-sm</p>
          </div>
        </motion.div>

        {/* Input */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf6', borderBottom: `1px solid ${s.border}` }}>
            <input
              readOnly
              placeholder="Ask a question about your data..."
              style={{
                background: 'white', border: `0.5px solid ${s.border}`, borderRadius: 8,
                padding: '9px 14px', fontSize: 14, color: s.muted, fontFamily: 'inherit',
                width: 220, outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = s.primary; e.target.style.boxShadow = `0 0 0 2px rgba(176,149,72,0.15)` }}
              onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Input</h4>
            <p style={{ fontSize: 12, color: s.muted }}>rounded-lg -- border-input -- px-3.5 py-2 -- gold focus ring</p>
          </div>
        </motion.div>

        {/* Notice */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf6', borderBottom: `1px solid ${s.border}` }}>
            <div style={{ background: s.accent, border: `1px solid ${s.primary}`, borderRadius: 12, padding: '14px 16px', width: 240 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.primary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                Clarification Needed
              </div>
              <div style={{ fontSize: 12, color: s.muted }}>What metric should I use?</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {['Revenue', 'Volume', 'Rating'].map(chip => (
                  <motion.span
                    key={chip}
                    whileHover={{ borderColor: s.primary, background: s.accent }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${s.border}`, background: 'white', color: '#23272f', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {chip}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Notice / Clarification Box</h4>
            <p style={{ fontSize: 12, color: s.muted }}>accent bg -- ring border -- uppercase label -- outline chips</p>
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={staggerItem} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf6', borderBottom: `1px solid ${s.border}` }}>
            <div style={{ background: '#eeebe2', borderRadius: 12, padding: 12, width: 180 }}>
              {SIDEBAR_ITEMS.map((item, i) => (
                <motion.div
                  key={item}
                  whileHover={{ background: i === 0 ? '#e6dfc8' : '#e6dfc8' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 7,
                    fontSize: 13, fontWeight: i === 0 ? 600 : 500,
                    color: i === 0 ? '#23272f' : s.muted,
                    background: i === 0 ? '#e6dfc8' : 'transparent',
                    marginBottom: 2, cursor: 'default',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === 0 ? s.primary : 'currentColor',
                    opacity: i === 0 ? 1 : 0.4, flexShrink: 0,
                  }} />
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Sidebar Navigation</h4>
            <p style={{ fontSize: 12, color: s.muted }}>~230px -- sidebar-active bg -- rounded-lg items -- no hard border</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

function StepCard({ step, title, body, code, checklist, density, wide }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
      style={{
        ...s.card, padding: 28, position: 'relative', overflow: 'hidden',
        ...(wide ? { gridColumn: '1 / -1' } : {}),
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: s.primary, background: s.accent, border: `1px solid ${s.border}`,
        borderRadius: 999, padding: '3px 10px', display: 'inline-block', marginBottom: 16,
      }}>
        Step {step}
      </span>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ fontSize: 13, color: s.muted, lineHeight: 1.7, marginBottom: 16 }}>{body}</p>

      {code && <pre style={s.code}>{code}</pre>}

      {checklist && (
        <ul style={{ listStyle: 'none', marginTop: 12 }}>
          {checklist.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: s.muted, padding: '5px 0', paddingLeft: 20, position: 'relative', lineHeight: 1.5 }}>
              <span style={{ position: 'absolute', left: 0, color: s.primary, fontWeight: 700 }}>&#10003;</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      {density && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {density.map(({ title: dTitle, items }) => (
            <div key={dTitle} style={{ background: '#fafaf6', border: `1px solid ${s.border}`, borderRadius: 10, padding: 14 }}>
              <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{dTitle}</h5>
              <ul style={{ listStyle: 'none' }}>
                {items.map((item, i) => (
                  <li key={i} style={{ fontSize: 11, color: s.muted, padding: '2px 0', paddingLeft: 14, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 4, color: s.primary }}>&#183;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function DevGuideSection() {
  return (
    <section style={{ background: '#eeebe2', padding: '80px 40px', borderTop: `1px solid ${s.border}` }} id="steps">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader
          label="04 -- Developer Guide"
          title="How to build an Aras product"
          sub="Follow these steps for every new frontend. The goal is consistency across products — users should feel at home switching between any Aras tool."
        />
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
        >
          {DEV_STEPS.map((stepData) => (
            <StepCard key={stepData.step} {...stepData} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function WorkflowStep({ step, title, body, code, codeLabel, images, imageCaption, tip, checklist }) {
  return (
    <motion.div
      variants={staggerItem}
      style={{ ...s.card, padding: 0, overflow: 'hidden' }}
    >
      {/* Image area */}
      {images && (
        <div style={{ background: '#fafaf6', borderBottom: `1px solid ${s.border}`, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                style={{
                  flex: images.length > 1 ? '1 1 calc(50% - 6px)' : '1 1 100%',
                  minWidth: 200,
                  borderRadius: 10,
                  border: `1px solid ${s.border}`,
                  objectFit: 'cover',
                }}
              />
            ))}
          </div>
          {imageCaption && (
            <p style={{ fontSize: 11, color: s.muted, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
              {imageCaption}
            </p>
          )}
        </div>
      )}

      {/* Content area */}
      <div style={{ padding: 28 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: s.primary, background: s.accent, border: `1px solid ${s.border}`,
          borderRadius: 999, padding: '3px 10px', display: 'inline-block', marginBottom: 16,
        }}>
          Step {step}
        </span>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ fontSize: 13, color: s.muted, lineHeight: 1.7, marginBottom: 16 }}>{body}</p>

        {tip && (
          <div style={{
            background: s.accent, border: `1px solid ${s.primary}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#3d3f36', lineHeight: 1.6,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.primary, marginRight: 8 }}>
              Tip
            </span>
            {tip}
          </div>
        )}

        {checklist && (
          <ul style={{ listStyle: 'none', marginBottom: 16 }}>
            {checklist.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: s.muted, padding: '5px 0', paddingLeft: 20, position: 'relative', lineHeight: 1.5 }}>
                <span style={{ position: 'absolute', left: 0, color: s.primary, fontWeight: 700 }}>&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {code && (
          <div>
            {codeLabel && (
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: s.muted, marginBottom: 6 }}>
                {codeLabel}
              </div>
            )}
            <pre style={s.code}>{code}</pre>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function FromScratchSection() {
  return (
    <section style={{ ...s.section, borderTop: `1px solid ${s.border}` }} id="scratch">
      <SectionHeader
        label="05 -- From Scratch"
        title="Zero to production frontend"
        sub="Use AI tools to go from a product idea to a designed, working frontend — in six steps. This workflow uses Google Stitch for design, AI Studio for rough code generation, and Claude for the real build."
      />

      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 40,
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {/* Phase 1: Design */}
        <motion.div variants={staggerItem} style={{
          ...s.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: s.accent,
            border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            A-C
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Design phase</div>
            <div style={{ fontSize: 12, color: s.muted }}>Idea → PRD → Google Stitch mockup</div>
          </div>
        </motion.div>

        {/* Phase 2: Build */}
        <motion.div variants={staggerItem} style={{
          ...s.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: s.accent,
            border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            D-F
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Build phase</div>
            <div style={{ fontSize: 12, color: s.muted }}>AI Studio code → Claude rebuilds with design system</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={staggerContainer}
      >
        {SCRATCH_STEPS.map((stepData) => (
          <WorkflowStep key={stepData.step} {...stepData} />
        ))}
      </motion.div>
    </section>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DesignSystem() {
  return (
    <div style={s.page}>
      <Nav />
      <Hero />
      <ColorsSection />
      <TypographySection />
      <ComponentsSection />
      <DevGuideSection />
      <FromScratchSection />

      <footer style={{ textAlign: 'center', padding: 32, fontSize: 12, color: s.muted, borderTop: `1px solid ${s.border}` }}>
        <strong style={{ color: s.primary }}>Aras Integrasi</strong> -- Frontend Design System v1.1 -- For internal use
        <span style={{ margin: '0 12px', opacity: 0.4 }}>|</span>
        <Link to="/" style={{ color: s.muted, textDecoration: 'underline' }}>Back to app</Link>
      </footer>
    </div>
  )
}
