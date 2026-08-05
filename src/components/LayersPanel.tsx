import { useRef, useState } from 'react'
import { useEditorStore } from '@/lib/store'
import { sortedLayers } from '@/lib/factories'
import type { DesignLayer } from '@/types/document'

function layerIcon(type: DesignLayer['type']): string {
  switch (type) {
    case 'background':
      return 'BG'
    case 'text':
      return 'T'
    case 'image':
      return 'IMG'
    case 'shape':
      return '◇'
    default:
      return '•'
  }
}

export function LayersPanel() {
  const document = useEditorStore((s) => s.document)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const select = useEditorStore((s) => s.select)
  const toggleVisibility = useEditorStore((s) => s.toggleVisibility)
  const toggleLock = useEditorStore((s) => s.toggleLock)
  const deleteSelected = useEditorStore((s) => s.deleteSelected)
  const bringForward = useEditorStore((s) => s.bringForward)
  const sendBackward = useEditorStore((s) => s.sendBackward)
  const bringToFront = useEditorStore((s) => s.bringToFront)
  const sendToBack = useEditorStore((s) => s.sendToBack)
  const renameLayer = useEditorStore((s) => s.renameLayer)
  const reorderLayer = useEditorStore((s) => s.reorderLayer)

  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Panel shows top-most layer first
  const layers = sortedLayers(document.layers).reverse()

  return (
    <aside className="panel layers-panel" aria-label="Layers">
      <header className="panel-header">
        <h2>Layers</h2>
        <span className="panel-meta">{layers.length}</span>
      </header>

      <div className="layer-actions">
        <button
          type="button"
          className="btn ghost sm"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && bringToFront(selectedIds[0])}
          title="Bring to front"
        >
          ⇈
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && bringForward(selectedIds[0])}
          title="Bring forward"
        >
          ↑
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && sendBackward(selectedIds[0])}
          title="Send backward"
        >
          ↓
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={selectedIds.length !== 1}
          onClick={() => selectedIds[0] && sendToBack(selectedIds[0])}
          title="Send to back"
        >
          ⇊
        </button>
        <button
          type="button"
          className="btn ghost sm danger"
          disabled={selectedIds.length === 0}
          onClick={deleteSelected}
          title="Delete selected"
        >
          ⌫
        </button>
      </div>

      <ul className="layer-list">
        {layers.map((layer, index) => {
          const active = selectedIds.includes(layer.id)
          return (
            <li
              key={layer.id}
              className={[
                'layer-row',
                active ? 'active' : '',
                !layer.visible ? 'hidden-layer' : '',
                layer.locked ? 'locked' : '',
                dragOver === index ? 'drag-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={!layer.locked}
              onDragStart={() => {
                dragIndex.current = index
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(index)
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex.current !== null && dragIndex.current !== index) {
                  reorderLayer(dragIndex.current, index)
                }
                dragIndex.current = null
                setDragOver(null)
              }}
              onClick={(e) => {
                select([layer.id], e.shiftKey || e.metaKey || e.ctrlKey)
              }}
            >
              <span className="layer-type" title={layer.type}>
                {layerIcon(layer.type)}
              </span>
              <input
                className="layer-name"
                defaultValue={layer.name}
                key={`${layer.id}-${layer.name}`}
                disabled={layer.type === 'background'}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== layer.name) {
                    renameLayer(layer.id, e.target.value)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                aria-label={`Rename ${layer.name}`}
              />
              <button
                type="button"
                className="icon-btn"
                title={layer.visible ? 'Hide' : 'Show'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleVisibility(layer.id)
                }}
              >
                {layer.visible ? '◉' : '○'}
              </button>
              <button
                type="button"
                className="icon-btn"
                title={layer.locked ? 'Unlock' : 'Lock'}
                disabled={layer.type === 'background'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLock(layer.id)
                }}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
