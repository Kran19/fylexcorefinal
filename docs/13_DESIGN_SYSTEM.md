# 13 — DESIGN SYSTEM & UI/UX

## Brand Identity

Brand Name: FYLEX
Brand Tone: Premium luxury watchmaking — minimal, editorial, dark

### Official Brand Palette (globals.css)
--fyl-color-kokushoku: #161413   — Primary Black (brand primary)
--fyl-color-walrus:    #999B98   — Neutral Muted Gray
--fyl-color-fatback:   #FFF6ED   — Secondary Light Cream
--fyl-color-bronze:    #82694A   — Secondary Dark Gold/Bronze
--fyl-color-champagne: #C79A67   — Primary Champagne Gold
--fyl-color-black:     #000000   — Pure Black
--fyl-color-white:     #FFFFFF   — Pure White

Background (customer storefront body): #F9F9F7 (off-white/cream)
Background (admin dark pages): #09090b (near-black, used in discover page)
Text: #111111 (near-black on light bg)

### Admin Panel Dark Theme (discover/page.jsx inline styles)
Background: #09090b
Cards: #18181b
Borders: #27272a
Text: #ffffff, #a1a1aa
Accent: #c4a35a (gold)

---

## Typography

Loaded via CDN in app/layout.tsx:

Monument Extended:
  Source: https://fonts.cdnfonts.com/css/monument-extended
  Usage: h1, .hero-title, .brand-display — main headline display font
  Weight: Varies (Extra Bold for hero)

Futura PT:
  Source: https://fonts.cdnfonts.com/css/futura-pt
  Usage: h2-h6, .title, .sub-heading, .hd-v2, .section-title
  Weight: Medium/Regular

Inter:
  Source: https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700
  Usage: body text — all paragraph and UI text
  Default weight: 300 (light)

Font Awesome 6.4.0:
  Source: CDN (loaded in layout.tsx <head>)
  Usage: Icons throughout admin panel and customer UI

---

## CSS Custom Properties (Design Tokens)

Managed by two systems:

### 1. Static Brand Tokens (globals.css — set at build time)
:root {
  --fyl-color-kokushoku, --fyl-color-walrus, --fyl-color-fatback, ...
  --fyl-deep-blue, --fyl-black, --fyl-silver, --fyl-gold, --fyl-white
  --gold, --gold-light, --gold-dim, --cream, --dark, --navy
  --curve: 72px, --curve-sm: 40px, --header-h: 70px
}

### 2. Dynamic Design System (DesignSystemContext.jsx — runtime from DB)
:root {
  --ds-brand-primary: <from DB>
  --ds-brand-secondary: <from DB>
  --ds-brand-accent: <from DB>
  --ds-brand-black: <from DB>
  --ds-brand-white: <from DB>
  --ds-brand-silver: <from DB>
  --ds-brand-cream: <from DB>
  --ds-btn-primary-bg: <from DB>
  --ds-btn-primary-text: <from DB>
  --ds-btn-radius: <from DB>
  --ds-radius-global: <from DB>
}

Also injected: legacy variable aliases
  --fyl-deep-blue: var(--ds-brand-primary)
  --fyl-gold: var(--ds-brand-secondary)
  etc.

---

## Component Utility Classes (globals.css)

### .label
  Small uppercase section label with leading line
  font-size: 0.6rem, letter-spacing: 0.35em
  Has ::before pseudo-element: 28px horizontal line

### .divider
  48px wide, 1px tall horizontal rule
  color: var(--gold), centered, opacity: 0.7

### .lbl-v2
  Version 2 label: 11px, letter-spacing: 0.38em, uppercase

### .hd-v2
  Large heading: Avenir/Inter font, clamp(36px, 5.5vw, 82px)
  font-weight: 400, line-height: 1.08

### .cta-v1 (Primary Button)
  10px uppercase text, 0.15em letter-spacing
  Background: var(--ds-btn-primary-bg, #1a1a1a)
  Color: var(--ds-btn-primary-text, #ffffff)
  Border-radius: var(--ds-btn-radius, 999px) — pill shape
  Hover: inverts background and color, translateY(-2px)
  Border: 1px solid matching background

### .btn-glass (Glass Button)
  Same as .cta-v1 with flex display and gap: 8px for icons
  Identical hover behaviour to .cta-v1

---

## Animation System

### GSAP (v3.14.2)
Used for: scroll-triggered sequences, page transitions, product reveal animations
Integration: @gsap/react v2.1.2 provides React hooks

ScrollSequence.jsx:
  Likely uses GSAP ScrollTrigger
  Creates pinned sections where animation plays on scroll
  Used in: home page hero, configure page belt selection section

Belt configurator scroll:
  .cfg-belts-pinned-section — GSAP-controlled pinned horizontal scroll
  .cfg-belts-track-row — the scrolling container
  Mobile override: forces overflow-x: auto with scroll-snap (no GSAP on mobile)

### Lenis (v1.3.20)
Smooth scroll library — replaces native browser scroll
SmoothScroll.jsx wraps the app with Lenis scroll context
globals.css: Lenis-specific CSS (.lenis-smooth, .lenis-stopped, etc.)
scroll-behavior: auto !important — overrides browser smooth scroll for Lenis

---

## Responsive Design

Media queries observed in globals.css:
  @media (max-width: 768px) — Mobile overrides for belt selector
    .cfg-belts-pinned-section: min-height: auto, padding: 40px 0
    .cfg-belts-track-row: overflow-x: auto, scroll-snap-type: x mandatory

No full responsive grid system documented in inspected CSS.
Tailwind CSS v4 is included — utility classes used directly in JSX components.
Responsive prefixes (sm:, md:, lg:) likely used throughout components.

---

## Customer UI Design Language

Based on inspected discover/page.jsx and globals.css:

Color philosophy:
  Light theme: cream (#F9F9F7) background, dark text (#111111)
  Dark theme: near-black (#09090b/#18181b) with white text
  Both themes co-exist — home page is light, configure/discover can be dark

Cards:
  Dark: background #18181b, border-radius: 20px, border: 1px solid #27272a
  Padding: 24px
  Shadow: subtle

Buttons:
  Primary: pill-shaped (border-radius: 999px), dark fill, light text
  Secondary: dark fill, uppercase, small text (12px), weight 800

Typography hierarchy on pages:
  Label: 11px uppercase, 0.25em letter-spacing, gold color
  Heading: Monument Extended (h1), Futura (h2+), large size (36-82px)
  Body: Inter, 300 weight, 15px

Spacing:
  Section padding: 60-80px vertical
  Card gaps: 32px grid
  Content max-width: 1280px, centered, 24px horizontal padding

---

## Admin UI Design Language

Based on admin component inspection:

Color scheme: Light mode admin (despite being for a dark luxury brand)
  Background: white/light gray (#f9f9fa likely)
  Sidebar: dark sidebar
  Text: #111111 / dark

Component design:
  AdminLayout: sidebar (fixed) + header (sticky) + main content area
  Cards: white with subtle shadow
  Tables: striped or bordered rows
  Buttons: standard rounded rectangle (not pill-shaped like storefront)

Status badges:
  StatusBadge.jsx provides color-coded order status indicators
  pending: yellow, confirmed: blue, processing: orange, shipped: purple, delivered: green, cancelled: red

Admin typography:
  Uses Inter (same as storefront) via global.css

---

## Scrollbar

Globally hidden: ::-webkit-scrollbar { display: none; }
(from globals.css)
Lenis provides the scrolling experience instead of native scrollbar.

---

## Touch / Mobile UX

touch-action: pan-y on body — allows vertical scrolling on touch, prevents horizontal interference
Mobile: Lenis smooth scroll active (SmoothScroll.jsx wraps all)
Configure page belts: scroll-snap on mobile for belt carousel

---

## Icons

Font Awesome 6.4.0 — loaded via CDN in <head>
  Usage: All utility icons (cart, user, heart, arrow, etc.)
Lucide React v1.7.0 — React-native icon library
  Usage: Admin UI icons, inline SVG icons in components
React Icons v5.6.0 — Comprehensive icon library
  Usage: Mixed usage in components

---

## Per-Product Theming

Each product can have custom colors:
  products.bgColor, accentColor, textColor, gradient, mistColor
  products.theme (JSON) — full theme override object

PageTheme records:
  productId + pageName + themeJson
  Allows: product 5's /configure page has different colors than product 5's /explore page

These theme values are:
  - Applied when customer is on a specific product page
  - Can be previewed in admin via postMessage to iframe
  - Stored and served from DB

---

## Images and Media Display

Image URL format: /uploads/{hex-filename}.{ext}
No Next.js Image component (no next/image found in inspected pages)
Standard <img> tags — no lazy loading, no blur placeholder
formatImageUrl() utility:
  - Strips localhost from URLs
  - Ensures leading slash
  - Returns relative URL for same-server images

Fallback: /uploads/placeholder.png

---

*Document 13 of 20 — FYLEX Enterprise Documentation Suite*
