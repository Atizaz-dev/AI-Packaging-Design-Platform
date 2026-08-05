import { useRef } from 'react'
import { useEditorStore } from '@/lib/store'

interface ToolbarProps {
  onExport: () => void
}

export function Toolbar({ onExport }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const document = useEditorStore((s) => s.document)
  const setDocumentName = useEditorStore((s) => s.setDocumentName)
  const addText = useEditorStore((s) => s.addText)
  const addShape = useEditorStore((s) => s.addShape)
  const addImageFromFile = useEditorStore((s) => s.addImageFromFile)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const history = useEditorStore((s) => s.history)
  const stageScale = useEditorStore((s) => s.stageScale)
  const setStageScale = useEditorStore((s) => s.setStageScale)
  const deleteSelected = useEditorStore((s) => s.deleteSelected)
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const resetDocument = useEditorStore((s) => s.resetDocument)

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <div className="brand-mark" aria-hidden />
        <div className="brand-text">
          <span className="brand-name">PackForge</span>
          <input
            className="doc-name"
            value={document.name}
            onChange={(e) => setDocumentName(e.target.value)}
            aria-label="Document name"
          />
        </div>
      </div>

      <div className="toolbar-group" role="toolbar" aria-label="Objects">
        <button type="button" className="btn ghost" onClick={addText}>
          + Text
        </button>
        <button type="button" className="btn ghost" onClick={() => addShape('rect')}>
          + Rect
        </button>
        <button type="button" className="btn ghost" onClick={() => addShape('ellipse')}>
          + Ellipse
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => fileRef.current?.click()}
        >
          + Logo / Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void addImageFromFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="toolbar-group" role="toolbar" aria-label="Edit">
        <button
          type="button"
          className="btn ghost"
          disabled={history.past.length === 0}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={history.future.length === 0}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={selectedIds.length === 0}
          onClick={duplicateSelected}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn ghost danger"
          disabled={selectedIds.length === 0}
          onClick={deleteSelected}
        >
          Delete
        </button>
      </div>

      <div className="toolbar-group" role="toolbar" aria-label="View">
        <label className="zoom-control">
          <span>Zoom</span>
          <input
            type="range"
            min={0.25}
            max={1.5}
            step={0.05}
            value={stageScale}
            onChange={(e) => setStageScale(Number(e.target.value))}
          />
          <span className="zoom-value">{Math.round(stageScale * 100)}%</span>
        </label>
      </div>

      <div className="toolbar-actions">
        <button type="button" className="btn ghost" onClick={resetDocument}>
          Reset demo
        </button>
        <button type="button" className="btn primary" onClick={onExport}>
          Export PNG
        </button>
      </div>
    </header>
  )
}
