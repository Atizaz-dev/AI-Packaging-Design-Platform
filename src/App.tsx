import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { Toolbar } from '@/components/Toolbar'
import { DesignCanvas } from '@/components/DesignCanvas'
import { LayersPanel } from '@/components/LayersPanel'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { ExportDialog } from '@/components/ExportDialog'
import { useEditorStore } from '@/lib/store'

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const deleteSelected = useEditorStore((s) => s.deleteSelected)
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const editing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (editing) return
        e.preventDefault()
        undo()
        return
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        if (editing) return
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        if (editing) return
        e.preventDefault()
        duplicateSelected()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editing) {
        e.preventDefault()
        deleteSelected()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, deleteSelected, duplicateSelected])

  return (
    <div className="app-shell">
      <Toolbar onExport={() => setExportOpen(true)} />
      <main className="workspace">
        <LayersPanel />
        <DesignCanvas stageRef={stageRef} />
        <PropertiesPanel />
      </main>
      <footer className="status-bar">
        <span>Module A · Interactive editing</span>
        <span>Module B · Layers & selection</span>
        <span>Module C · PNG / transparent / high-res export</span>
        <span className="status-hint">Double-click text to edit · Drag layers to reorder</span>
      </footer>
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        stageRef={stageRef}
      />
    </div>
  )
}
