# Design System Inspired by Discord

## 1. Visual Theme & Atmosphere

Discord's interface is a communication-first dark environment built around real-time chat, voice, and community. The design philosophy is "organized chaos made comfortable" — a layered, multi-panel layout (`#1e1f22`, `#2b2d31`, `#313338`) where servers, channels, and conversations coexist without overwhelming the user. The interface resembles a cockpit: information-dense yet navigable, with every panel serving a distinct function.

The typography uses **gg sans** — a custom-designed geometric sans-serif typeface introduced in late 2022 to replace Whitney. gg sans was built specifically for Discord's needs: highly legible at small sizes for dense chat, with a friendly warmth that avoids the coldness of purely geometric fonts. The fallback stack includes Noto Sans for international script support. Weights range from 400 (normal) to 800 (extra bold), with 500 (medium) and 600 (semibold) doing most of the UI work.

What distinguishes Discord is its **Blurple identity** (`#5865F2`) — a blue-purple hybrid that serves as the singular brand accent across buttons, links, mentions, and interactive states. Combined with a **three-column dark layout** (server list → channel sidebar → main content), **rounded rectangles** (3px–16px radius, never fully pill-shaped), and **hover-reveal interactions** (icons, buttons, and controls that appear only on hover), the result is a tool that feels simultaneously playful and powerful — like a gaming headset for your screen.

**Key Characteristics:**
- Three-tier dark background system (`#1e1f22` → `#2b2d31` → `#313338`) — depth through panel layering
- Blurple (`#5865F2`) as singular brand accent — buttons, links, mentions, active states
- gg sans custom font family — geometric yet warm, optimized for chat readability
- Rounded rectangle geometry (3px–16px) — never pill-shaped, never sharp
- Hover-reveal pattern — controls and actions appear on hover to reduce visual noise
- Status colors as first-class citizens: green online, yellow idle, red DND, gray offline
- Server icons as 48px circles with hover-to-rounded-rectangle animation (pill morph)
- Dense, information-rich layout — chat app, not a marketing site

## 2. Color Palette & Roles

### Primary Brand
- **Blurple** (`#5865F2`): Primary brand color — buttons, links, mentions, active indicators
- **Dark Blurple** (`#4752C4`): Hover state for blurple elements
- **Light Blurple** (`#7289DA`): Legacy blurple, still used in some contexts
- **White** (`#ffffff`): Primary text on dark backgrounds
- **Off-White** (`#f2f3f5`): Light theme backgrounds

### Dark Theme Surfaces
- **Dark Tertiary** (`#1e1f22`): Deepest layer — server sidebar, status bar
- **Dark Secondary** (`#2b2d31`): Mid layer — channel sidebar, member list
- **Dark Primary** (`#313338`): Main content area — chat background
- **Dark Elevated** (`#383a40`): Elevated surfaces — input backgrounds, hoverstates
- **Dark Floating** (`#111214`): Popouts, modals, context menus overlay
- **Dark Modifier Hover** (`#2e3035`): Subtle hover backgrounds on messages
- **Dark Modifier Active** (`#393c41`): Active/pressed state on interactive elements

### Text
- **Header Primary** (`#f2f3f5`): Primary headings, usernames
- **Header Secondary** (`#b5bac1`): Secondary text, timestamps, channel descriptions
- **Text Normal** (`#dbdee1`): Chat message body text
- **Text Muted** (`#949ba4`): Placeholder text, hints, muted info
- **Text Link** (`#00a8fc`): Clickable links in chat
- **Interactive Normal** (`#b5bac1`): Default icon/text color in nav
- **Interactive Hover** (`#dbdee1`): Hovered icon/text
- **Interactive Active** (`#ffffff`): Active/selected icon/text
- **Interactive Muted** (`#4e5058`): Disabled or inactive elements

### Status Colors
- **Online Green** (`#23a55a`): Online status, success states, positive actions
- **Idle Yellow** (`#f0b232`): Idle/away status, warning states
- **DND Red** (`#f23f43`): Do Not Disturb, error states, destructive actions
- **Offline Gray** (`#80848e`): Offline status, invisible
- **Streaming Purple** (`#593695`): Streaming status indicator

### Semantic
- **Brand Green** (`#248046`): Success buttons, positive actions (darker variant)
- **Brand Red** (`#da373c`): Danger buttons, destructive action backgrounds
- **Info Blue** (`#00a8fc`): Links, informational highlights
- **Premium Gold** (`#f0b132`): Nitro, boost, premium features
- **Fuchsia** (`#eb459e`): Special accents, reactions, playful highlights
- **Mention Background** (`rgba(88, 101, 242, 0.3)`): Highlighted mentions in chat
- **Mention Text** (`#e0e1ff`): Mention text color

### Shadows
- **Low** (`0 1px 5px rgba(0, 0, 0, 0.3)`): Cards, minor elevation
- **Medium** (`0 4px 12px rgba(0, 0, 0, 0.4)`): Dropdowns, tooltips
- **High** (`0 8px 24px rgba(0, 0, 0, 0.6)`): Modals, popouts, context menus
- **Elevation Stroke** (`0 0 0 1px rgba(255, 255, 255, 0.06)`): Subtle border glow on dark surfaces

## 3. Typography Rules

### Font Families
- **Primary**: `gg sans`, `Noto Sans`, `Helvetica Neue`, Helvetica, Arial, sans-serif
- **Code**: `Consolas`, `Andale Mono WT`, `Andale Mono`, `Lucida Console`, `Lucida Sans Typewriter`, `DejaVu Sans Mono`, `Bitstream Vera Sans Mono`, `Liberation Mono`, `Nimbus Mono L`, Monaco, `Courier New`, Courier, monospace
- **Display**: `Ginto Nord`, `gg sans` (marketing, large headings)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Page Title | gg sans | 24px (1.50rem) | 700 | 30px | normal | Modal titles, settings headers |
| Section Title | gg sans | 20px (1.25rem) | 600 | 24px | normal | Category headings |
| Channel Title | gg sans | 16px (1.00rem) | 600 | 20px | normal | Active channel name, headers |
| Body | gg sans | 16px (1.00rem) | 400 | 22px (1.375rem) | normal | Chat messages |
| Body Semibold | gg sans | 16px (1.00rem) | 600 | 22px | normal | Usernames in chat |
| UI Label | gg sans | 14px (0.875rem) | 500 | 18px | normal | Buttons, navigation items |
| Small | gg sans | 12px (0.75rem) | 500 | 16px | normal | Timestamps, status text |
| Category Header | gg sans | 12px (0.75rem) | 700 | 16px | 0.02em | `text-transform: uppercase` |
| Tiny | gg sans | 10px (0.625rem) | 600 | 12px | 0.04em | Badges, unread counts |
| Code Block | Consolas | 14px (0.875rem) | 400 | 18px | normal | `background: #2b2d31` |
| Code Inline | Consolas | 85% of parent | 400 | inherit | normal | `background: #383a40`, `padding: 0 4px`, `border-radius: 3px` |

### Principles
- **Weight hierarchy**: 400 (body) → 500 (labels) → 600 (emphasis) → 700 (titles) — gradual weight progression for clear hierarchy.
- **Compact line heights**: Chat-optimized — 1.375 line-height for messages enables dense conversation scanning without cramping.
- **Uppercase category headers**: Channel categories use uppercase + letter-spacing for a systematic, structural voice that separates navigation from content.
- **Code as first-class**: Discord treats code blocks with care — dedicated mono font, distinct background color, syntax highlighting support.

## 4. Component Stylings

### Buttons

**Primary (Blurple)**
- Background: `#5865F2`
- Text: `#ffffff`
- Padding: 2px 16px
- Height: 38px (medium), 32px (small), 44px (large)
- Radius: 3px
- Hover: `#4752C4`
- Active: `#3c45a5`
- Font: 14px weight 500
- Use: Primary CTAs, confirmations

**Secondary (Gray)**
- Background: `#4e5058`
- Text: `#ffffff`
- Padding: 2px 16px
- Height: 38px
- Radius: 3px
- Hover: `#6d6f78`
- Use: Cancel buttons, secondary actions

**Success (Green)**
- Background: `#248046`
- Text: `#ffffff`
- Radius: 3px
- Use: Confirm actions, invite acceptance

**Danger (Red)**
- Background: `#da373c`
- Text: `#ffffff`
- Radius: 3px
- Hover: `#a12d31`
- Use: Delete, ban, kick, destructive actions

**Link Button**
- Background: transparent
- Text: `#00a8fc`
- Padding: 2px 16px
- Use: Tertiary actions, navigation shortcuts

**Outline**
- Background: transparent
- Border: `1px solid #4e5058`
- Text: `#ffffff`
- Radius: 3px
- Use: Toggle buttons, filter options

### Cards & Containers
- Background: `#2b2d31` or `#232428`
- Radius: 8px
- Border: `1px solid rgba(255, 255, 255, 0.06)` (subtle)
- Hover: `background: #232428` (slightly darker)
- Use: Embed cards, server discovery cards, settings panels

### Message Bubbles (Chat)
- Background: transparent (messages live on `#313338` chat bg)
- Hover background: `#2e3035` (full-width highlight)
- Padding: 2px 48px 2px 72px (avatar-aware)
- Username: 16px weight 600, role-colored
- Timestamp: 12px weight 500, `#949ba4`
- Content: 16px weight 400, `#dbdee1`, line-height 1.375

### Inputs
- Background: `#1e1f22`
- Text: `#dbdee1`
- Placeholder: `#87898c`
- Radius: 8px
- Padding: 11px 16px
- Border: none (focus: `1px solid #5865F2` or focus ring)
- Use: Chat input, search, settings fields

### Message Compose Box
- Background: `#383a40`
- Radius: 8px
- Padding: 11px 16px
- Placeholder text: `#6d6f78`
- Min height: 44px
- Buttons: attachment, gif, sticker, emoji icons at 20px, `#b5bac1`

### Tooltips
- Background: `#111214`
- Text: `#dbdee1`
- Padding: 8px 12px
- Radius: 4px
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.6)`
- Font: 14px weight 500
- Arrow: 5px CSS triangle

### Context Menus
- Background: `#111214`
- Radius: 4px
- Padding: 6px 8px
- Item padding: 6px 8px
- Item hover: `#5865F2` background, `#ffffff` text
- Separator: `1px solid #2e3035`
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.6)`

### Modals / Dialogs
- Background: `#313338`
- Radius: 4px (top corners for sheets)
- Header: 24px weight 700, `#f2f3f5`
- Overlay: `rgba(0, 0, 0, 0.85)`
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.6)`
- Max width: 440px (standard), 600px (wide)

### Server Icons
- Size: 48px diameter
- Shape: circle (default) → rounded rect (hover, 16px radius)
- Selected: rounded rect with `3px solid #ffffff` left indicator bar
- Unread: `8px` white dot indicator
- Transition: `border-radius 200ms ease`
- Background: `#313338` for text-based server icons

### Badges & Pills
- Unread count: 16px min-width pill, `#f23f43` background, `#ffffff` text, 8px radius
- Mention badge: `#f23f43` background, 10px font weight 700
- Nitro badge: gradient or `#f0b132` gold
- Bot tag: `#5865F2` background, `#ffffff` text, `0.6rem` font, 3px radius

### Scrollbars
- Track: transparent
- Thumb: `#1a1b1e` (dark rounded bar)
- Thumb hover: `#232428`
- Width: 8px
- Radius: 4px (full round)

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

### Grid & Container
- **Server list** (left bar): 72px wide, `#1e1f22` background
- **Channel sidebar**: 240px wide, `#2b2d31` background
- **Main content area**: flexible, `#313338` background
- **Member list** (right panel): 240px wide, `#2b2d31` background
- **Header bar**: 48px height, `#313338` background with bottom divider
- **Message input area**: auto height (min 44px), `#383a40` compose box

### Three-Column Architecture
```
[Server List | Channel Sidebar | Chat / Content Area | Member List]
   72px           240px            flexible               240px
  #1e1f22        #2b2d31           #313338              #2b2d31
```

### Whitespace Philosophy
- **Dense but breathable**: Discord packs enormous amounts of information (servers, channels, users, messages) into a single view, but uses background color differentiation between panels rather than borders or large gaps.
- **Panel separation through color**: Each column has a distinct background shade — no visible dividers needed.
- **Compact vertical rhythm**: Messages use 2px–4px gap between consecutive same-author messages ("compact group"), 16px gap for new author groups.

### Border Radius Scale
- Micro (2px): Inline code, small badges
- Small (3px): Buttons, bot tags
- Standard (4px): Context menus, tooltips, modals
- Medium (8px): Cards, inputs, compose box, embeds
- Large (16px): Server icon hover state, large cards
- Circle (50%): Server icons default, avatars, status indicators

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (Level 0) | `#1e1f22` background | Server list, deepest surfaces |
| Sunken (Level -1) | `#1a1b1e` | Inputs nested within panels |
| Surface (Level 1) | `#2b2d31` | Channel sidebar, member list |
| Primary (Level 2) | `#313338` | Main chat area, settings pages |
| Elevated (Level 3) | `#383a40` + subtle border | Compose box, hover states, dropdowns |
| Floating (Level 4) | `#111214` + `0 8px 24px rgba(0,0,0,0.6)` | Modals, context menus, popouts, tooltips |
| Overlay | `rgba(0, 0, 0, 0.85)` | Modal backdrop, image viewer |

**Elevation Philosophy**: Discord uses a "darker = deeper" model where elevation is communicated primarily through background shade rather than shadow. Shadows are reserved for floating elements (modals, popouts, context menus) that genuinely break the layout plane. This is the opposite of Material Design's shadow-heavy approach — Discord's depth comes from color, not shadow.

## 7. Do's and Don'ts

### Do
- Use the three-tier dark surface system (`#1e1f22` → `#2b2d31` → `#313338`) — depth through shade
- Apply Blurple (`#5865F2`) for primary actions, links, mentions, and active indicators
- Use rounded rectangles (3px–8px radius) for interactive elements — never pills, never sharp
- Implement hover-reveal patterns — hide secondary controls until hover to reduce visual clutter
- Use server-icon morphing (circle → rounded square) for selection state
- Keep messages dense — 2px gap for same-author groups, 16px for new authors
- Use status colors consistently: green=online, yellow=idle, red=DND, gray=offline
- Apply uppercase + letter-spacing for channel category headers
- Use `#111214` for all floating UI (tooltips, context menus, popouts)

### Don't
- Don't use Blurple as a background fill for large surfaces — it's for accents and CTAs only
- Don't use pill-shaped buttons — Discord uses 3px radius, not rounded pills
- Don't add visible borders between panels — color differentiation handles separation
- Don't use light backgrounds for the primary interface (dark mode is core identity)
- Don't make messages "bubble"-shaped — messages are full-width with hover highlights
- Don't use drop shadows on non-floating elements — Discord uses color for depth, not shadow
- Don't exceed 16px border radius except for circular avatars and server icons
- Don't make UI elements bright or colorful — the interface is muted, content provides color
- Don't use heavy font weights (800+) in the chat UI — 600 is the heaviest for usernames

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <768px | Single-column, swipe navigation |
| Tablet | 768–1024px | Two-column, collapsible sidebar |
| Desktop Small | 1024–1280px | Three-column, member list may hide |
| Desktop | 1280–1440px | Full layout, all panels visible |
| Large Desktop | >1440px | Expanded chat, wider sidebars possible |

### Collapsing Strategy
- **Server list**: Always visible (72px), collapses to icon-only on mobile (swipe to reveal)
- **Channel sidebar**: Full → hidden (toggle via hamburger), slides in on mobile
- **Member list**: Visible → hidden (toggle button in header bar)
- **Chat area**: Always present, fills available space
- **Message input**: Maintained at all sizes, full width of chat area
- **Voice panel**: Bottom of channel sidebar, collapses to mini-player overlay on mobile

## 9. Special Discord Patterns

### Mention Highlighting
- Background: `rgba(88, 101, 242, 0.3)` on the entire message row
- Mention text: `#e0e1ff` with hover underline
- Left border: `2px solid #5865F2` on the message

### Embed Cards
- Background: `#2b2d31`
- Left accent border: `4px solid {embed_color}` (author-defined)
- Radius: 4px
- Padding: 8px 16px 16px 12px
- Max width: 520px
- Images: radius 4px, max-width 400px

### Code Blocks
- Background: `#2b2d31`
- Border: `1px solid #232428`
- Radius: 4px
- Padding: 8px (inline: 0 4px)
- Font: Consolas, 14px, weight 400
- Syntax highlighting with language-specific colors

### Reactions
- Background: `#2b2d31`
- Border: `1px solid transparent` (selected: `1px solid #5865F2`)
- Radius: 8px
- Padding: 2px 6px
- Count: 14px weight 500, `#b5bac1`
- Hover: border color brightens

### Server Discovery Cards
- Background: `#2b2d31`
- Radius: 8px
- Banner image: top, radius 8px 8px 0 0
- Server icon: 48px circle, overlapping banner/content boundary
- Shadow: `0 1px 5px rgba(0, 0, 0, 0.3)`

### Thread Indicators
- Left border: `2px solid #4e5058`
- Collapsed: shows reply count + preview
- Arrow icon: `#b5bac1`

## 10. Agent Prompt Guide

### Quick Color Reference
- Background: Dark Tertiary (`#1e1f22`)
- Surface: Dark Secondary (`#2b2d31`)
- Main Content: Dark Primary (`#313338`)
- Elevated: (`#383a40`)
- Text: (`#dbdee1`)
- Secondary text: (`#b5bac1`)
- Muted text: (`#949ba4`)
- Accent: Blurple (`#5865F2`)
- Success: Green (`#23a55a`)
- Danger: Red (`#f23f43`)
- Links: Blue (`#00a8fc`)
- Floating UI: (`#111214`)

### Example Component Prompts
- "Create a Discord message row: transparent background, hover #2e3035. Avatar 40px circle left. Username 16px gg sans weight 600 + role color. Timestamp 12px weight 500, #949ba4. Content 16px weight 400, #dbdee1, line-height 1.375."
- "Design a blurple button: #5865F2 background, white text, 3px radius, 38px height, 14px gg sans weight 500. Hover: #4752C4."
- "Build a channel sidebar: #2b2d31 background, 240px wide. Category headers: 12px weight 700, uppercase, #949ba4, 0.02em letter-spacing. Channel names: 16px weight 500, #949ba4 (inactive) → #f2f3f5 (active)."
- "Create a context menu: #111214 background, 4px radius. Items 14px weight 500, #dbdee1. Hover: #5865F2 background, #ffffff text. Shadow: 0 8px 24px rgba(0,0,0,0.6)."
- "Design a server icon: 48px circle, #313338 background for text icons. Hover → 16px border-radius with 200ms ease transition. Selected: left indicator bar 3px wide, white, 40px tall."
- "Build a Discord embed: #2b2d31 background, 4px left border in accent color, 4px radius, max-width 520px. Author: 14px weight 600. Title: 16px weight 600, #00a8fc link color. Description: 14px weight 400, #dbdee1."

### Iteration Guide
1. Start with the three-column dark layout — server list, channel sidebar, main content
2. Blurple for interactive accents only (buttons, links, mentions, active states)
3. Round everything with 3px–8px radius — never pill, never sharp corners
4. Hover-reveal secondary actions — keep the resting state minimal
5. Status colors are sacred: green=online, yellow=idle, red=DND, gray=offline
6. Floating UI (#111214) with heavy shadows — everything else uses color for depth
7. Dense chat: 2px gap same-author, 16px new-author, full-width hover highlight
