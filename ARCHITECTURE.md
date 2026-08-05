# Architecture — AI Packaging Design Platform (PackForge)

## Purpose

PackForge is a browser-based packaging design editor for American Garden–style production workflows: short-run label/layout edits, brand asset placement, and production-ready raster export. This document describes the architecture of the assessment implementation and the intended production system it maps onto.

---

## High-level architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Client (Editor SPA)                          │
│  React + TypeScript + Vite                                           │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ Toolbar /  │  │ DesignCanvas    │  │ Layers + Properties      │  │
│  │ Export UI  │  │ (Konva stage)   │  │ panels                   │  │
│  └─────┬──────┘  └────────┬────────┘  └────────────┬─────────────┘  │
│        │                  │                        │                 │
│        └──────────────────┼────────────────────────┘                 │
│                           ▼                                          │
│                 Zustand document store                               │
│           (layers, selection, undo stack, export opts)               │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ REST / WebSocket (future)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         API layer (BFF)                              │
│  Auth · project CRUD · export jobs · signed asset URLs · AI gateway  │
└───────────┬───────────────────────┬──────────────────┬───────────────┘
            ▼                       ▼                  ▼
   ┌────────────────┐    ┌──────────────────┐   ┌─────────────────────┐
   │ PostgreSQL     │    │ Object storage   │   │ AI workers          │
   │ projects,      │    │ (S3 / GCS)       │   │ (queue: Redis/SQS)  │
   │ revisions,     │    │ originals +      │   │ layout, generate,   │
   │ users, brands  │    │ renders + fonts  │   │ recolor, upscale    │
   └────────────────┘    └──────────────────┘   └─────────────────────┘
```

**Assessment scope (this repo):** full client object model, interactive editing, layer management, and PNG export. Backend/AI pieces are specified below as the production path.

---

## Module mapping

| Module | Implementation |
|--------|----------------|
| **A – Interactive design editing** | Typed layer model; Konva canvas; text / shape / image nodes; property editing; transform + double-click text edit |
| **B – Object & layer management** | z-index ordered stack; select / multi-select; lock / unlock; show / hide; rename; drag reorder; order commands; delete / duplicate; undo/redo |
| **C – Export workflow** | Client-side `stage.toDataURL` at configurable scale; transparent / document / solid backgrounds; 1×–print (~300 DPI) presets; download PNG |
| **D – System architecture** | This document + README technical decisions |

---

## Front end

### Document object model

Each design is a `DesignDocument`:

- `artboard` — pixel dimensions of the packaging face (label panel)
- `layers[]` — ordered list with stable `id`, `zIndex`, visibility, lock, opacity, transforms
- Typed variants: `background` | `shape` | `text` | `image`

This shape is intentionally JSON-serializable so it can live in PostgreSQL (`jsonb`) or a CRDT/doc store later without rewriting the editor.

### Rendering

- **Konva / react-konva** for retained-mode 2D scene graph (selection, transformer, high-DPI raster export).
- Stage is presentation-only; source of truth remains the Zustand store so UI panels and canvas never diverge.
- Export temporarily normalizes stage transform, hides transformer chrome, optionally hides solid backgrounds, then rasterizes the artboard bounds at `pixelRatio = scale`.

### Why not pure SVG or Fabric.js?

| Concern | Decision |
|---------|----------|
| Packaging labels are mostly flat, affine layout | Canvas 2D + scene graph is enough |
| Transform handles + multi-type nodes | Konva Transformer is mature |
| High-res PNG + alpha | Canvas export is efficient and predictable |
| Future print PDF via vector | Keep DOM as structured layers; PDF can rehydrate from the same JSON via a server renderer (PDFKit / headless Chromium / Illustrator scripting bridge) |

### State & history

- Zustand store with explicit `commit` on discrete actions (add, delete, transform end, property change).
- Linear undo/redo stack (capped) storing full document snapshots — correct for assessment scale.
- **Production upgrade:** operational transform / Immer patches + selective snapshots per gesture to cap memory on large artboards.

---

## Back end (production)

Suggested stack:

| Concern | Choice | Reasoning |
|---------|--------|-----------|
| API | NestJS or Fastify (Node) or Go | Strong typing, upload streaming, worker fan-out |
| Auth | OIDC / Auth0 / Cognito + project RBAC | Agency multi-user collaboration |
| Primary DB | PostgreSQL | Projects, brand kits, version history, audit |
| Assets | S3-compatible + CDN | Logos, photo packs, export artifacts |
| Jobs | Redis queue + workers | AI + long PDF/export jobs |
| Realtime (optional) | WebSocket + presence | Multi-user review |

### Core resources

```text
POST   /projects
GET    /projects/:id
PUT    /projects/:id/document          # optimistic concurrency via revision
POST   /assets                         # multipart → object storage
POST   /exports                        # async: { format, dpi, background }
GET    /exports/:jobId
POST   /ai/generate | /ai/edit         # gated AI endpoints
```

---

## AI integration

AI should be a **side-effect service**, not mixed into canvas state:

1. User selects region / layer / prompt.
2. Client → BFF with project context + asset refs + constraints (brand palette, keep dielines).
3. Worker calls model APIs (image gen/edit, OCR, recolor, background remove).
4. Result stored as new asset; optional layer inserted as `image` with provenance metadata:
   ```json
   { "source": "ai", "model": "...", "prompt": "...", "parentLayerId": "..." }
   ```
5. User remains in control: accept → layer stays; reject → discard asset.

**Guardrails:** brand kit palettes/fonts, forbidden claims text, bleed/safe-zone masks, human approval for production export.

---

## Asset management

```text
brand-kit/
  logos/          # SVG preferred, PNG fallback
  fonts/          # licensed subsets
  palettes/
  templates/      # seed DesignDocuments
project/
  working/        # originals
  renders/        # PNG/PDF exports by revision
  ai/             # generated intermediates
```

- Store originals separately from renders.
- Content-addressable hashes for dedupe.
- Virus scan + dimension/mime validation on upload.
- Soft-delete with retention for legal/print recalls.

---

## Export & production formats

### Implemented (assessment)

| Capability | Mechanism |
|------------|-----------|
| PNG | `Konva.Stage#toDataURL` |
| Transparent background | Hide layers named `export-solid-bg` |
| High resolution | `scale` / `pixelRatio` (e.g. 300/72 ≈ 4.17×) |

### Future production formats

| Format | Approach |
|--------|----------|
| **PDF** | Server-side: rehydrate layer JSON → PDFKit or Chromium print with trim/bleed; embed fonts |
| **AI (Illustrator)** | Export intermediate SVG or PDF; optional Illustrator ExtendScript/CEP pipeline for die-lines |
| **TIFF / CMYK** | ImageMagick/Ghostscript post-process from high-res PNG/PDF with ICC profiles |
| **Dieline overlays** | Separate non-exported layer group (`type: 'guide'`) |

Rule of thumb: keep **authoritative data as structured layers**; raster/PDF are **projections**.

---

## Scalability

| Layer | Technique |
|-------|-----------|
| Editor | Virtualize layer lists; chunk undo; off-main-thread export via OffscreenCanvas when large |
| API | Stateless BFF behind load balancer; pre-signed uploads |
| Storage | Lifecycle policies; multi-region CDN for brand assets |
| AI | Queue + rate limits + cost caps per tenant |
| Collaboration | Document CRDT (Yjs) only if multiplayer becomes a requirement |

---

## Maintainability

- **Strict TypeScript** domain types for every layer kind.
- **Single store façade** for mutations (no ad-hoc canvas mutations).
- **Pure factories** for seed documents and layer creation (easy tests).
- **Export isolated** in `src/lib/export.ts` with no React coupling beyond Stage handle.
- **Feature modules** ready to split: `editor/`, `export/`, `ai/`, `projects/`.

Suggested tests in production:

- Unit: reindex / reorder / lock rules
- Integration: export pixel ratio + alpha channel presence
- Visual regression on seed template

---

## Security & compliance notes

- AuthZ on project ownership before asset access.
- Strip EXIF from photos if privacy-sensitive.
- Do not send full brand kits to third-party AI without DPA.
- Audit log: who exported what revision at which DPI.

---

## Assessment → production gap list

1. Persist projects + multi-revision history  
2. Server exports (PDF/CMYK) with ICC  
3. Brand kit library + font licensing  
4. AI worker gateway with approval UX  
5. Dielines / bleed / safe zone guides  
6. Optional multiplayer / comments for agency review  

The current client is designed so each of these attaches without rewriting the object model.
