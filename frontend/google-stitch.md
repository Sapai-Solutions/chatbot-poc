> **What is this file?** This is a design system prompt for Google Stitch.
> Replace line 1 below with your app description and page list, then paste
> the entire file into Google Stitch to generate a UI mockup that follows
> the Aras design language. See `/design-system` → "From Scratch" for the full workflow.

---

Design a UI mockup for: [YOUR DESIGN IDEA]

---

DESIGN SYSTEM — follow these rules strictly.

VISUAL STYLE
- Aesthetic: calm, professional, data-forward. Warm-neutral, not cold or clinical.
- Never use stark white backgrounds. Use warm off-white / cream tones.
- Whitespace is intentional. The layout should feel uncluttered and breathable.
- The gold/mustard accent is used sparingly — only on primary buttons, active 
  states, and key interactive elements. Not decoratively.

COLORS (light mode default)
- Page background:       #f8f7f2
- Sidebar background:    #eeebe2
- Active nav item:       #e6dfc8
- Card background:       #ffffff
- Panel background:      #fafaf6
- Primary text:          #23272f
- Secondary text:        #717568
- Borders / dividers:    #e0dbd0
- Brand accent (gold):   #b09548
- Brand accent on hover: #a0832e
- Muted fill:            #f0ece1
- Accent fill (hover):   #f3efe6
- Destructive / error:   #c03a3a
- Success / connected:   #22c55e

TYPOGRAPHY
- Font: Geist Sans for all UI text. Geist Mono for code, SQL, or technical strings.
- Page title (H1):       28–32px, weight 700
- Card / section title:  16px, weight 600
- Body copy:             14px, weight 400
- Secondary labels:      12px, weight 400, color #717568
- Large KPI numbers:     24–28px, weight 700
- Button labels:         14px, weight 500
- Max 3 font weights per screen. Hierarchy through size and weight, not color.

COMPONENTS
- Cards: white background, rounded-xl (12px), subtle shadow only (no border color),
  16–24px padding
- Buttons (primary): gold fill (#b09548), white text, rounded-lg (8px), 
  px-3.5 py-2, text-sm font-medium
- Buttons (ghost): transparent, muted text, hover shows light accent fill
- Buttons (outline): transparent, border #e0dbd0, default text color
- Badges: fully rounded (pill), text-xs font-medium, semi-transparent 
  gold fill for default state
- Inputs: border 0.5px #e0dbd0, rounded-lg, px-3.5 py-2, placeholder in #717568,
  gold focus ring
- Sidebar: ~230px wide, no explicit right border, rounded-lg active items
- Notice / clarification boxes: warm amber border (#b09548), pale yellow-cream 
  background (#f3efe6), uppercase heading label text-xs

SPACING
- Base unit: 8px. All spacing should be multiples of 4 or 8.
- Cards gap: 16–20px
- Section padding from page edge: 24–32px
- Content inside cards: 16–24px padding
- Empty states: generous vertical padding (py-16 equivalent)

LAYOUT DENSITY RULES
- Maximum ~8–10 distinct data points above the fold on a dashboard
- Chat / list panels: ~260px wide sidebar, generous gap between items
- Never crowd elements. If something needs to scroll, that is acceptable.
- Visualizations and charts must have breathing room — labels must not overlap

SIDEBAR NAVIGATION PATTERN
- Logo area at the top left with a small rounded icon in gold
- Navigation items: icon (thin stroke, 18px) + label, stacked vertically
- Active item: slightly darker warm background + bold label
- No hard borders between sidebar and content — background contrast only

DARK MODE (only if the design idea calls for it)
- Page background:    #16140f
- Card background:    #1f1c16
- Sidebar:            #1b1914
- Active nav item:    #2d2820
- Primary text:       #e8e4da
- Secondary text:     #8a8476
- Borders:            #2e2a22
- Brand accent:       #c9a84c

OUTPUT EXPECTATIONS
- Show a realistic, high-fidelity mockup — not a wireframe.
- The mockup should look like a production web app.
- Use the sidebar navigation pattern unless the design idea specifically 
  does not require navigation.
- Include realistic placeholder data and labels that match the domain 
  of the design idea.
- Do not use blue, purple, or green as primary UI colors — those are 
  reserved for data visualization only.