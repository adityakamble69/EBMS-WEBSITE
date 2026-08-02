# design.md — Visual Design System

Theme: **dark glassmorphism**, "Obsidian & Charcoal" palette with a cool silver-blue accent. All tokens live as CSS custom properties in `style.css` (`:root`) — always reference the variable, never hardcode a hex value in new markup/CSS.

---

## 1. Color palette

### Base surfaces (darkest → lightest)
| Variable | Hex | Use |
|---|---|---|
| `--bg-base` | `#0C0C0E` | Deepest black — page edges |
| `--bg-layer1` | `#111114` | Main body background |
| `--bg-layer2` | `#18181C` | Card background |
| `--bg-layer3` | `#1E1E24` | Elevated surfaces (modals, dropdown panels) |
| `--bg-layer4` | `#252530` | Inputs, dropdowns |

### Glass surfaces
| Variable | Value | Use |
|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.04)` | Translucent panel fill |
| `--glass-border` | `rgba(255,255,255,0.08)` | Default glass edge |
| `--glass-border-hi` | `rgba(255,255,255,0.14)` | Emphasized/hover edge |
| `--glass-hover` | `rgba(255,255,255,0.07)` | Hover state fill |

### Accent (primary brand — cool silver-blue)
| Variable | Hex/Value | Use |
|---|---|---|
| `--accent` | `#6C8EFF` | Primary CTA / active states |
| `--accent-dim` | `rgba(108,142,255,0.15)` | Subtle accent backgrounds (badges, chips) |
| `--accent-glow` | `rgba(108,142,255,0.30)` | Glow/shadow accents |
| `--accent-hi` | `#8FAEFF` | Links, highlighted text |

### Status colors
| Variable | Hex | Meaning |
|---|---|---|
| `--success` / `--success-dim` | `#34D399` / `rgba(52,211,153,0.12)` | Approved, active, positive |
| `--warning` / `--warning-dim` | `#FBBF24` / `rgba(251,191,36,0.12)` | Pending, caution |
| `--danger` / `--danger-dim` | `#F87171` / `rgba(248,113,113,0.12)` | Rejected, error, destructive |

### Text
| Variable | Hex | Use |
|---|---|---|
| `--text-primary` | `#F0F0F5` | Headings, primary content |
| `--text-secondary` | `#A0A0B0` | Body/secondary content |
| `--text-muted` | `#606070` | Placeholders, disabled |
| `--text-dim` | `#404050` | Faintest labels/dividers |

### Borders
| Variable | Value |
|---|---|
| `--border` | `rgba(255,255,255,0.06)` |
| `--border2` | `rgba(255,255,255,0.10)` |
| `--border-focus` | `rgba(108,142,255,0.50)` |

---

## 2. Typography

| Font | Weights loaded | Use |
|---|---|---|
| **Inter** | 300, 400, 500, 600, 700 | Body text, UI labels, forms — default `body { font-family }` |
| **Space Grotesk** | 500, 600, 700 | Headings, page titles, welcome text, salary-slip figures — anything that should feel like a "display" font |
| **JetBrains Mono** (fallback: Fira Code) | — | Numeric/code-like values: IDs, salary figures, `.font-mono` utility class |

Loaded via Google Fonts in both `style.css` (`@import`) and `index.html` (`<link>` preconnect + stylesheet) — keep both in sync if the font set ever changes.

**Usage pattern:**
```css
body { font-family: 'Inter', -apple-system, sans-serif; }
h1, h2, .display-heading { font-family: 'Space Grotesk', sans-serif; font-weight: 600/700; }
.font-mono, .id-badge, .amount { font-family: 'JetBrains Mono', monospace; }
```

---

## 3. Shape & elevation

| Variable | Value | Use |
|---|---|---|
| `--radius-xs` | 6px | Small chips, tags |
| `--radius-sm` | 8px | Buttons, inputs |
| `--radius` | 12px | Default card radius |
| `--radius-lg` | 16px | Larger panels, modals |
| `--radius-xl` | 20px | Hero/feature cards |

| Variable | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.5)` | Cards |
| `--shadow-lg` | `0 20px 48px rgba(0,0,0,0.6)` | Modals, popovers |
| `--shadow-glow` | `0 0 20px rgba(108,142,255,0.20)` | Accent glow (active/focused elements) |

---

## 4. Layout

- `--sidebar-w: 240px` — fixed sidebar width on admin pages, hidden below 768px (`sidebar-spacer` collapses).
- `.app-shell { display: flex; min-height: 100vh; }` — standard two-column shell (sidebar + `.main-workspace`) used across every admin page.
- Scrollbars are custom-styled thin (5px) to match the dark theme — don't override per-page.

---

## 5. Component conventions

- **Global page loader:** full-screen overlay (`#ebmsPageLoader`), `rgba(8,8,9,0.72)` background + `blur(8px)` backdrop-filter, spinner ring in `#D4D9E6`. Triggered by cross-page navigation and `fetchWithLoader()` in `app.js` — reuse this rather than building a new loader per page.
- **Status badges:** use the `--success-dim` / `--warning-dim` / `--danger-dim` background + solid text color pairing (e.g. pending leave = warning, approved = success, rejected = danger).
- **Glass cards:** `background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius);` — the base recipe for any new panel/card.
- **Buttons:** primary CTA uses `--accent` background with `--shadow-glow` on hover/focus; secondary/ghost buttons use `--glass-bg` + `--glass-border`.

---

## 6. Adding new UI — checklist

1. Reuse existing CSS variables — don't add new hex colors unless the palette genuinely needs extending (and if so, add the variable to `:root` in `style.css`, don't inline it).
2. Reuse `Inter` for body copy, `Space Grotesk` for headings/display numbers, `JetBrains Mono` for IDs/amounts.
3. New page? Copy the `.app-shell` + `sidebar.html` include pattern from an existing admin page rather than rebuilding layout from scratch.
4. Any async data load on page entry → wrap in `fetchWithLoader()` for a consistent loading state.
