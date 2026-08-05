# PackForge — AI Packaging Design Platform

Technical evaluation submission for **AI Full Stack Software Engineer** (American Garden packaging design tool).

Implements **all four modules** from the assessment:

| Module | Status |
|--------|--------|
| A – Interactive design editing | ✅ Text, logo/image, shapes, colors, transforms |
| B – Object & layer management | ✅ Order, lock, hide, select, delete, rename, drag-reorder |
| C – Export workflow | ✅ PNG, transparent BG, high-res / ~300 DPI scale |
| D – System architecture | ✅ See [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```bash
npm run build    # production build
npm run preview  # serve dist
```

---

## What to try (demo walkthrough)

1. **Seed label** loads with brand logo, title, tagline, shapes, and footer badge.
2. **Click** any object on the canvas to select; **drag** to move; use handles to scale/rotate.
3. **Double-click text** (or use Properties) to edit copy.
4. **Layers panel**: show/hide, lock/unlock, rename, drag to reorder, ↑↓ ordering.
5. **Toolbar**: add Text / Rect / Ellipse / Logo image; undo/redo; zoom.
6. **Export PNG**: choose transparent background and 2× or ~300 DPI; Preview then Download.

Keyboard:

- `Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` redo  
- `Delete` remove selection · `Ctrl/Cmd+D` duplicate  

---

## Technical decisions (brief)

1. **Typed document model first** — Background, shape, text, and image layers share a common transform/visibility contract. Production APIs can store the same JSON.
2. **Zustand + Konva** — Store is the single source of truth; canvas is a pure view. Avoids Fabric-style dual state and scales to property panels cleanly.
3. **zIndex + reindex on reorder** — Simple O(n) layer stack; good enough for packaging artboards (tens to low hundreds of layers).
4. **Client-side export for assessment** — Deterministic PNG with alpha using Konva rasterization. Production would add a server job for PDF/CMYK/ICC (documented in architecture).
5. **History on commits** — Snapshots on discrete mutations (not every dragframe) keep undo reliable without flooding memory.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for frontend/backend/AI/asset/scale/maintenance detail and a mermaid-ready system diagram (ASCII).

---

## Project structure

```text
src/
  components/     # Toolbar, canvas, layers, properties, export dialog
  hooks/          # Image loading cache
  lib/
    store.ts      # Editor state, history, mutations
    factories.ts  # Layer + seed document factories
    export.ts     # PNG export pipeline
  types/          # Design document types
  styles/         # Application chrome
ARCHITECTURE.md   # Module D
```

---

## Production-grade practices demonstrated

- Strict TypeScript domain model  
- Undo/redo with bounded history  
- Locked background safety (no accidental delete)  
- Export path restores stage state after rasterization  
- Filename sanitization and DPI-scale helpers  
- Responsive workspace layout  
- Keyboard accessibility for core edit actions  

---

## Future work (called out for production)

PDF/AI print formats, async export workers, brand kit services, and AI assist workers are scoped in the architecture doc—not stubs that pretend to be shipped.

---

## License

Assessment submission — all rights reserved by the author for evaluation use.
