# Yuding V2 — Frontend Design System

This document specifies the design tokens, reusable components, and architectural conventions for the Yuding V2 modern web client located in `frontend/web/`.

---

## 1. Overview & Principles

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript.
- **Styling Authority:** Tailwind CSS v3 configured with Yuding brand design tokens, working in harmony with legacy global CSS variables.
- **Visual Parity:** Phase 14 strictly maintains the visual identity, colors, typography, and UX migrated in Phase 13 without introducing arbitrary redesigns.
- **Legacy Preservation:** `frontend/reservation/` remains untouched as the visual and UX reference point.
- **Authoritative Backend:** All UI pricing displays are estimates; server APIs via Gateway (`http://localhost:8888`) remain the single source of truth for booking and authentication.

---

## 2. Design Tokens

Design tokens are defined in both `tailwind.config.js` and `src/styles/tokens.ts`.

### 2.1 Colors

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `yuding-primary` | `#01796F` | Main brand color, primary buttons (`btn-booking`), headings |
| `yuding-primary-dark` | `#005951` | Hover state for primary actions |
| `yuding-secondary` | `#02E0D5` | Bright cyan/turquoise accent, highlights, dark mode contrast |
| `yuding-accent` | `#218A87` | Deep turquoise supporting color |
| `yuding-dark` | `#001B1A` | Obsidian deep teal for hero overlays and dark text |
| `yuding-surface` | `#1A1F2E` | Admin & dark mode surface background |
| `yuding-card` | `#121c1c` | Dark mode card background |
| `yuding-glow` | `#00D4AA` | Vibrant green-cyan accent for admin highlights |
| `success` | `#10B981` | Emerald green for verified badges and success toasts |
| `warning` | `#F59E0B` | Amber for warnings and pending statuses |
| `danger` | `#EF4444` | Crimson red for destructive actions and errors |

### 2.2 Typography

- **Primary Font (Body & General UI):** `'Poppins', sans-serif`
- **Secondary / Display Font (Headings & Badges):** `'Montserrat', sans-serif`
- **Weight Scale:** `400` (normal), `500` (medium), `600` (semibold), `700` (bold), `800` (extrabold)

### 2.3 Border Radius

- **Inputs & Standard Buttons:** `6px` / `rounded-md`
- **Cards & Dialogs:** `12px` / `rounded-xl`
- **Pills & Filter Tabs:** `30px` / `rounded-full`

### 2.4 Shadows

- `yuding-sm`: `0 2px 8px rgba(0, 0, 0, 0.04)`
- `yuding`: `0 4px 15px rgba(0, 0, 0, 0.08)`
- `yuding-card`: `0 6px 20px rgba(0, 0, 0, 0.08)`
- `yuding-strong`: `0 10px 30px rgba(0, 0, 0, 0.15)`
- `yuding-glow`: `0 0 20px rgba(2, 224, 213, 0.3)`

---

## 3. Dark Mode Architecture

The design system supports dark mode seamlessly:
- Configured in `tailwind.config.js`:
  ```javascript
  darkMode: ['class', '[data-theme="dark"]'],
  ```
- Triggered by `src/components/common/DarkModeToggle.tsx`, which toggles the `.dark` class and `data-theme="dark"` attribute on the `<html>` root element.
- Tailwind dark variants (`dark:bg-[#1A1F2E]`, `dark:text-white`, `dark:border-white/10`) immediately adapt across all components.

---

## 4. Reusable Component Catalog

All components are fully typed in TypeScript and located in `src/components/`.

### 4.1 UI Primitives (`src/components/ui/`)

1. **`Button`** (`Button.tsx`):
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
   - Sizes: `sm`, `md`, `lg`.
   - States: `isLoading` (renders spinner), `disabled`, `fullWidth`.
   - Slots: `icon`, `iconRight`.

2. **`Input`** (`Input.tsx`):
   - Supports text, email, password, date, number types.
   - Built-in `label`, `helperText`, and `error` validation message.
   - Leading (`icon`) and trailing (`iconRight`) icon adornments.

3. **`Select`** (`Select.tsx`):
   - Accessible dropdown select matching `Input` styling with custom chevron icon.

4. **`Card`** (`Card.tsx`):
   - Container component with subcomponents: `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`.
   - Props: `variant` (`default`, `elevated`, `bordered`, `stat`), `hoverable`.

5. **`Modal`** (`Modal.tsx`):
   - Accessible dialog overlay with backdrop blur, title, close button, ESC key handler, and body overflow lock.
   - Sizes: `sm`, `md`, `lg`, `xl`.

6. **`Toast`** (`Toast.tsx`):
   - Feedback alerts supporting `success`, `error`, `warning`, `info`.
   - Includes semantic icon, message, and optional dismiss button.

7. **`LoadingSkeleton`** (`LoadingSkeleton.tsx`):
   - Shimmer pulse placeholders supporting `card`, `text`, `circle`, and `table-row` variants with a customizable `count`.

8. **`ErrorState`** (`ErrorState.tsx`):
   - Friendly error display with icon, error message, and optional `onRetry` action button.

9. **`EmptyState`** (`EmptyState.tsx`):
   - Empty view container with customizable icon, title, description, and action button slot.

### 4.2 Travel Domain Components (`src/components/travel/`)

10. **`HotelCard`** (`HotelCard.tsx`):
    - Renders accommodation offers with image zoom hover, star ratings, city/country tag, nightly price, and direct booking CTA.

11. **`FlightCard`** (`FlightCard.tsx`):
    - Renders airline flights with departure/arrival times, route visual arrow, available seat counters, price, and booking CTA.

12. **`OfferCard`** (`OfferCard.tsx`):
    - Flexible card for popular destinations, holiday houses, and activities.

13. **`SearchForm`** (`SearchForm.tsx`):
    - Responsive search container with input slots and loading button.

### 4.3 Layout Components (`src/components/layout/`)

14. **`Header`** (`Header.tsx`):
    - Main navigation with logo, responsive nav links, authentication actions, and dark mode toggle.

15. **`Footer`** (`Footer.tsx`):
    - 4-column footer containing brand description, navigation links, top destinations, and security certifications.

16. **`Sidebar`** (`Sidebar.tsx`):
    - Collapsible admin sidebar with active path highlighting, brand header, and site return link.

---

## 5. Usage & Extension Guidelines

1. **Importing Primitives:**
   Import components directly from the barrel export:
   ```typescript
   import { Button, Input, Card, Modal, Toast, LoadingSkeleton, EmptyState } from '@/components/ui';
   import { HotelCard, FlightCard, OfferCard } from '@/components/travel';
   ```

2. **Custom Overrides:**
   All components accept standard HTML attributes and a `className` prop for contextual margin, grid placement, or width adjustments:
   ```tsx
   <Button variant="primary" size="md" className="shadow-lg">
     Réserver Maintenant
   </Button>
   ```

3. **Form Validation:**
   Use the `error` prop on `Input` and `Select` components to automatically render accessible error styling:
   ```tsx
   <Input
     label="Adresse email"
     type="email"
     error={errors.email}
     value={email}
     onChange={(e) => setEmail(e.target.value)}
   />
   ```
