# Campus Copilot - Design System Specification

This document defines the unified frontend design guidelines, layout specs, styling assets, and interaction parameters of the **Campus Copilot** student companion ecosystem.

---

## 🎨 Color Palette & Theming

Campus Copilot features a professional, clean, and highly sophisticated pastel color system designed to replace dark-space themes with a launch-ready academic aesthetic.

| Color Variable | Hex Code | Role / Usage |
| :--- | :--- | :--- |
| **Pale Cream** | `#FFFBF7` | Main viewport backgrounds, core body structures, and cards. |
| **Dusty Rose Pink** | `#FAB1A0` | Top header banners, logo frames, sidebar navigation base panels. |
| **Deep Ocean Teal** | `#2A9D8F` | Primary CTAs, active buttons, highlighted items, active toggles. |
| **Dark Brown-Grey** | `#4A4A4A` | Main headers, body text, form labels, vector outlines. |
| **Crisp White** | `#FFFFFF` | Text inputs, dropdown content fields, text inside action buttons. |

---

## 🔤 Typography & Font Hierarchy

- **Primary Font**: `Inter` (sans-serif) for high-contrast readability, form inputs, body descriptors, and labels.
- **Display Accent Font**: `Space Grotesk` (sans-serif) for professional, tech-oriented headers, hero titles, card headings, and section brand marks.

### Font Styles & Sizes:
* **Hero Title (Display)**: `Space Grotesk`, `48px`, weight `700`, line-height `1.2`.
* **Section Title**: `Space Grotesk`, `32px`, weight `700`.
* **Card Titles / Subheadings**: `Space Grotesk`, `20px` / `16px`, weight `600`/`700`.
* **Body / Descriptors**: `Inter`, `14px` / `15px` / `18px`, weight `400` / `500` / `600`.
* **Form Labels**: `Inter`, `11px`, weight `700`, uppercase, letter-spacing `1px`.

---

## 📦 CSS Core Variables Setup

Define these global design tokens in the root of your stylesheet files (`:root` block):

```css
:root {
  --bg-base: #FFFBF7;          /* Pale Cream base background */
  --sidebar-bg: #FAB1A0;       /* Dusty Rose Pink sidebar panel */
  --card-bg: #FFFFFF;          /* Crisp White card container */
  --card-border: rgba(74, 74, 74, 0.12); /* Subtle outline border */
  --card-hover-border: #2A9D8F; /* Deep Ocean Teal hover outline border */
  --accent-cyan: #4A4A4A;      /* Primary text colour */
  --mint-green: #2A9D8F;       /* Deep Ocean Teal highlighting */
  --text-main: #4A4A4A;        /* Default typography color */
  --text-muted: rgba(74, 74, 74, 0.7); /* Translucent details text */
  --white: #FFFFFF;
}
```

---

## 🏛️ Application Architecture & Page Layouts

### 1. Landing Page (`index.html`)
* **Header**: Apple-style frosted glass (`backdrop-filter: blur(20px) saturate(180%);` with Dusty Rose tint) carrying the logo, pill-shaped menu links (`Dashboard`, `Features`, `Settings`, `About`) in Dark Brown-Grey (`#4A4A4A`) with active indicators, and a Deep Ocean Teal (`#2A9D8F`) Sign Up button.
* **Hero Section**:
  * Left: Large typography title and description.
  * Right: A clean vector graphic depicting a student desk with floating document, calendar, notepad, and secure vault icons.
* **Features Grid**: Three card decks with subtle outlines and Deep Ocean Teal hover triggers.
* **Footer**: Pale Cream area featuring Impact Metrics and a sleek Student Testimonial card.

### 2. Vault Dashboard (`dashboard.html`)
* **Sidebar Panel**: Solid Dusty Rose Pink base with list items that turn into white transparent highlights (`rgba(255,255,255,0.3)`) when selected.
* **Main Area**: Pale Cream viewport containing card components, text input widgets, and action lists.
* **Sync Action Bar**: A sticky footer bar spanning the bottom of the viewport with a Soft Mint Green action trigger.

### 3. Floating Quick-Action Pill (`content.css` / Extension Overlay)
* **Overlay**: Positioned fixed on top of Google Form components.
* **Visuals**: A transparent Pale Cream pill (`rgba(255, 251, 247, 0.85)`) with a `16px` backdrop-filter blur and Soft Mint Green buttons.

---

## ⚡ Animations & Transitions

### 1. Hero floating icons
* Soft bounce/levitate effect to display user options:
```css
@keyframes floatOverlay {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

### 2. Tab switching panel fade-in
* Fast, smooth translation scaling transition for responsive screen tabs:
```css
@keyframes tabFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 3. Settings off-canvas panel slide-in
* Drawer panel sliding from right side:
```css
.drawer-panel {
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-panel.active {
  transform: translateX(0);
}
```

### 4. Floating Extension Overlay Pill
* **Draggable Overlay**: The pill container `#campus-copilot-root` supports grab and drag mechanics with coordinates persistence saved in `localStorage`:
```css
#campus-copilot-root {
  position: fixed;
  z-index: 2147483647;
  touch-action: none;
}
.cc-pill {
  cursor: grab;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.cc-pill.cc-dragging {
  cursor: grabbing;
  transform: scale(1.03);
  box-shadow: 0 20px 45px rgba(74, 74, 74, 0.18);
}
```

### 5. Profile Cards Secure Edit Mode
* **Locked Display**: Inputs are set to `readonly` by default on page load. They feature permanent borders (`1px solid rgba(74,74,74,0.15)`) and flat backgrounds to appear as distinct input boxes at all times, with `8px` rounded corners.
* **Edit Trigger**: Clicking the Pencil icon unlocks target card inputs and triggers a glowing border highlight using Deep Ocean Teal (`#2A9D8F`).
* **Pencil Highlight**: The Pencil button itself toggles active state, scaling by 1.15, changing stroke to Deep Ocean Teal (`#2A9D8F`), and gaining a soft circular background highlight (`rgba(42, 157, 143, 0.1)`) when active.
* **Click-Outside-Lock**: Clicking anywhere outside the active edit card (except on its toggle button) instantly re-locks inputs *without* triggering a save. Updates are only synchronized when the Save Profile button is clicked.
* **Save Confirmation Checkmark**: Clicking the main Save button shows a green checkmark indicator (`#10B981`) and "Saved" label next to the button that fades out after exactly 2 seconds. No additional toast notifications are shown.

### 6. Premium AI Chatbot Assistant (`chatbot.js` / `chatbot.css`)
* **Core Brain**: Powered client-side by Groq's `llama-3.3-70b-versatile` model.
* **Retrieval Model**: Features local indexing over Campus Copilot configurations, installation processes, pricing, and FAQ records.
* **Smart UI**: Glassmorphism chat panel, online pulse dot, bouncing typing indicator, scroll-reveal, horizontal suggestion chips, copy buttons, markdown pre-parsing, and speech recognition.
* **Feedback Logs**: thumbs ratings (👍/👎) log feedback selections directly inside `localStorage`.
* **Support Ticket Escalation**: Initiates a mock ticket submission form (Name, Email, details) if questions cannot be resolved by the model.
