import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { DesignDocument, DesignLayer, ExportOptions } from '@/types/document'
import { DEFAULT_EXPORT } from '@/types/document'
import {
  createImage,
  createSeedDocument,
  createShape,
  createText,
  reindexLayers,
  sortedLayers,
} from '@/lib/factories'

const MAX_HISTORY = 50

interface HistorySlice {
  past: DesignDocument[]
  future: DesignDocument[]
}

interface EditorState {
  document: DesignDocument
  selectedIds: string[]
  history: HistorySlice
  exportOptions: ExportOptions
  isExporting: boolean
  stageScale: number

  select: (ids: string[], additive?: boolean) => void
  clearSelection: () => void
  setStageScale: (scale: number) => void

  updateLayer: (id: string, patch: Partial<DesignLayer>, commit?: boolean) => void
  commit: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  addText: () => void
  addShape: (shape?: 'rect' | 'ellipse') => void
  addImageFromFile: (file: File) => Promise<void>
  deleteSelected: () => void
  duplicateSelected: () => void

  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  renameLayer: (id: string, name: string) => void
  reorderLayer: (fromIndex: number, toIndex: number) => void

  setArtboardBackground: (color: string) => void
  setDocumentName: (name: string) => void
  setExportOptions: (patch: Partial<ExportOptions>) => void
  setIsExporting: (value: boolean) => void
  resetDocument: () => void
}

function cloneDoc(doc: DesignDocument): DesignDocument {
  return structuredClone(doc)
}

function pushHistory(
  history: HistorySlice,
  current: DesignDocument,
): HistorySlice {
  const past = [...history.past, cloneDoc(current)]
  if (past.length > MAX_HISTORY) past.shift()
  return { past, future: [] }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      })
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: createSeedDocument(),
  selectedIds: [],
  history: { past: [], future: [] },
  exportOptions: { ...DEFAULT_EXPORT },
  isExporting: false,
  stageScale: 0.72,

  select: (ids, additive = false) => {
    if (!additive) {
      set({ selectedIds: ids })
      return
    }
    const current = new Set(get().selectedIds)
    for (const id of ids) {
      if (current.has(id)) current.delete(id)
      else current.add(id)
    }
    set({ selectedIds: [...current] })
  },

  clearSelection: () => set({ selectedIds: [] }),

  setStageScale: (stageScale) => set({ stageScale }),

  updateLayer: (id, patch, commit = false) => {
    set((state) => {
      const layers = state.document.layers.map((layer) => {
        if (layer.id !== id) return layer
        // Type-safe shallow merge scoped to the concrete layer.
        return { ...layer, ...patch, type: layer.type, id: layer.id } as DesignLayer
      })
      const document = {
        ...state.document,
        layers,
        updatedAt: Date.now(),
      }
      if (!commit) return { document }

      return {
        document,
        history: pushHistory(state.history, state.document),
      }
    })
  },

  commit: () => {
    // Snapshot after a gesture ends when needed; updateLayer(..., true) is preferred.
    set((state) => ({
      history: pushHistory(state.history, state.document),
    }))
  },

  undo: () => {
    const { history, document } = get()
    if (history.past.length === 0) return
    const previous = history.past[history.past.length - 1]
    const past = history.past.slice(0, -1)
    set({
      document: previous,
      selectedIds: [],
      history: {
        past,
        future: [cloneDoc(document), ...history.future],
      },
    })
  },

  redo: () => {
    const { history, document } = get()
    if (history.future.length === 0) return
    const [next, ...rest] = history.future
    set({
      document: next,
      selectedIds: [],
      history: {
        past: [...history.past, cloneDoc(document)],
        future: rest,
      },
    })
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  addText: () => {
    set((state) => {
      const layer = createText(state.document.layers)
      return {
        history: pushHistory(state.history, state.document),
        selectedIds: [layer.id],
        document: {
          ...state.document,
          layers: [...state.document.layers, layer],
          updatedAt: Date.now(),
        },
      }
    })
  },

  addShape: (shape = 'rect') => {
    set((state) => {
      const layer = createShape(state.document.layers, {
        shape,
        name: shape === 'ellipse' ? 'Ellipse' : 'Rectangle',
      })
      return {
        history: pushHistory(state.history, state.document),
        selectedIds: [layer.id],
        document: {
          ...state.document,
          layers: [...state.document.layers, layer],
          updatedAt: Date.now(),
        },
      }
    })
  },

  addImageFromFile: async (file) => {
    const src = await readFileAsDataUrl(file)
    const { width, height } = await loadImageSize(src)
    const maxEdge = 280
    const ratio = Math.min(maxEdge / width, maxEdge / height, 1)
    const displayW = Math.round(width * ratio)
    const displayH = Math.round(height * ratio)

    set((state) => {
      const artboard = state.document.artboard
      const layer = createImage(state.document.layers, src, displayW, displayH, {
        name: file.name.replace(/\.[^.]+$/, '') || 'Image',
        x: Math.round((artboard.width - displayW) / 2),
        y: Math.round((artboard.height - displayH) / 3),
      })
      return {
        history: pushHistory(state.history, state.document),
        selectedIds: [layer.id],
        document: {
          ...state.document,
          layers: [...state.document.layers, layer],
          updatedAt: Date.now(),
        },
      }
    })
  },

  deleteSelected: () => {
    const { selectedIds, document } = get()
    if (selectedIds.length === 0) return
    const removable = new Set(
      document.layers
        .filter((l) => selectedIds.includes(l.id) && !l.locked && l.type !== 'background')
        .map((l) => l.id),
    )
    if (removable.size === 0) return

    set((state) => ({
      history: pushHistory(state.history, state.document),
      selectedIds: [],
      document: {
        ...state.document,
        layers: reindexLayers(
          state.document.layers.filter((l) => !removable.has(l.id)),
        ),
        updatedAt: Date.now(),
      },
    }))
  },

  duplicateSelected: () => {
    const { selectedIds, document } = get()
    if (selectedIds.length === 0) return

    set((state) => {
      const clones: DesignLayer[] = []
      let maxZ = Math.max(...state.document.layers.map((l) => l.zIndex), 0)
      for (const layer of sortedLayers(state.document.layers)) {
        if (!selectedIds.includes(layer.id) || layer.type === 'background') continue
        maxZ += 1
        clones.push({
          ...structuredClone(layer),
          id: uuid(),
          name: `${layer.name} copy`,
          x: layer.x + 24,
          y: layer.y + 24,
          zIndex: maxZ,
          locked: false,
        })
      }
      if (clones.length === 0) return state
      return {
        history: pushHistory(state.history, state.document),
        selectedIds: clones.map((c) => c.id),
        document: {
          ...document,
          layers: [...state.document.layers, ...clones],
          updatedAt: Date.now(),
        },
      }
    })
  },

  toggleVisibility: (id) => {
    set((state) => {
      const target = state.document.layers.find((l) => l.id === id)
      if (!target) return state
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: state.document.layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l,
          ),
          updatedAt: Date.now(),
        },
      }
    })
  },

  toggleLock: (id) => {
    set((state) => {
      const target = state.document.layers.find((l) => l.id === id)
      if (!target || target.type === 'background') return state
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: state.document.layers.map((l) =>
            l.id === id ? { ...l, locked: !l.locked } : l,
          ),
          updatedAt: Date.now(),
        },
        selectedIds: state.selectedIds.filter((sid) => {
          if (sid !== id) return true
          return target.locked // if unlocking, keep; if locking, drop selection later
        }),
      }
    })
    // If we locked the selected layer, deselect it.
    const locked = get().document.layers.find((l) => l.id === id)?.locked
    if (locked) {
      set((s) => ({ selectedIds: s.selectedIds.filter((sid) => sid !== id) }))
    }
  },

  bringForward: (id) => {
    set((state) => {
      const ordered = sortedLayers(state.document.layers)
      const index = ordered.findIndex((l) => l.id === id)
      if (index < 0 || index >= ordered.length - 1) return state
      ;[ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]]
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: reindexLayers(ordered),
          updatedAt: Date.now(),
        },
      }
    })
  },

  sendBackward: (id) => {
    set((state) => {
      const ordered = sortedLayers(state.document.layers)
      const index = ordered.findIndex((l) => l.id === id)
      if (index <= 0) return state
      // Don't send below locked background if it's index 0
      ;[ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]]
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: reindexLayers(ordered),
          updatedAt: Date.now(),
        },
      }
    })
  },

  bringToFront: (id) => {
    set((state) => {
      const ordered = sortedLayers(state.document.layers)
      const index = ordered.findIndex((l) => l.id === id)
      if (index < 0 || index === ordered.length - 1) return state
      const [item] = ordered.splice(index, 1)
      ordered.push(item)
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: reindexLayers(ordered),
          updatedAt: Date.now(),
        },
      }
    })
  },

  sendToBack: (id) => {
    set((state) => {
      const ordered = sortedLayers(state.document.layers)
      const index = ordered.findIndex((l) => l.id === id)
      if (index <= 0) return state
      const [item] = ordered.splice(index, 1)
      // Keep backgrounds at the bottom when possible
      const bgCount = ordered.filter((l) => l.type === 'background').length
      ordered.splice(bgCount, 0, item)
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: reindexLayers(ordered),
          updatedAt: Date.now(),
        },
      }
    })
  },

  renameLayer: (id, name) => {
    set((state) => ({
      history: pushHistory(state.history, state.document),
      document: {
        ...state.document,
        layers: state.document.layers.map((l) =>
          l.id === id ? { ...l, name: name.trim() || l.name } : l,
        ),
        updatedAt: Date.now(),
      },
    }))
  },

  reorderLayer: (fromIndex, toIndex) => {
    // fromIndex/toIndex are in top-first panel order (reversed zIndex)
    set((state) => {
      const ordered = sortedLayers(state.document.layers).reverse()
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= ordered.length ||
        toIndex >= ordered.length
      ) {
        return state
      }
      const [item] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, item)
      return {
        history: pushHistory(state.history, state.document),
        document: {
          ...state.document,
          layers: reindexLayers(ordered.reverse()),
          updatedAt: Date.now(),
        },
      }
    })
  },

  setArtboardBackground: (color) => {
    set((state) => {
      const layers = state.document.layers.map((layer) =>
        layer.type === 'background' ? { ...layer, fill: color } : layer,
      )
      return {
        history: pushHistory(state.history, state.document),
        document: { ...state.document, layers, updatedAt: Date.now() },
      }
    })
  },

  setDocumentName: (name) => {
    set((state) => ({
      document: { ...state.document, name, updatedAt: Date.now() },
    }))
  },

  setExportOptions: (patch) => {
    set((state) => ({
      exportOptions: { ...state.exportOptions, ...patch },
    }))
  },

  setIsExporting: (isExporting) => set({ isExporting }),

  resetDocument: () => {
    set((state) => ({
      history: pushHistory(state.history, state.document),
      document: createSeedDocument(),
      selectedIds: [],
    }))
  },
}))
