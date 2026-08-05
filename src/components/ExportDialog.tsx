import { useEffect, useId, useState } from 'react'
import type Konva from 'konva'
import { useEditorStore } from '@/lib/store'
import { downloadBlob, exportStageToPng, scaleForDpi } from '@/lib/export'
import type { ExportBackground } from '@/types/document'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  stageRef: React.RefObject<Konva.Stage | null>
}

export function ExportDialog({ open, onClose, stageRef }: ExportDialogProps) {
  const options = useEditorStore((s) => s.exportOptions)
  const setExportOptions = useEditorStore((s) => s.setExportOptions)
  const document = useEditorStore((s) => s.document)
  const isExporting = useEditorStore((s) => s.isExporting)
  const setIsExporting = useEditorStore((s) => s.setIsExporting)
  const titleId = useId()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null)
      setError(null)
      setMeta(null)
    }
  }, [open])

  if (!open) return null

  const outputW = Math.round(document.artboard.width * options.scale)
  const outputH = Math.round(document.artboard.height * options.scale)

  const runExport = async (download: boolean) => {
    const stage = stageRef.current
    if (!stage) {
      setError('Canvas is not ready.')
      return
    }
    setIsExporting(true)
    setError(null)
    try {
      // Clear selection chrome before rasterizing
      const tr = stage.find('Transformer')
      tr.forEach((n) => n.visible(false))
      stage.batchDraw()

      const result = await exportStageToPng(stage, document.artboard, options)
      setPreviewUrl(result.dataUrl)
      setMeta({ w: result.width, h: result.height })
      if (download) downloadBlob(result.blob, result.filename)

      tr.forEach((n) => n.visible(true))
      stage.batchDraw()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>Export artwork</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body export-grid">
          <div className="export-fields">
            <label className="field">
              <span>Filename</span>
              <input
                type="text"
                value={options.filename}
                onChange={(e) => setExportOptions({ filename: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Format</span>
              <select value="png" disabled>
                <option value="png">PNG</option>
              </select>
            </label>

            <label className="field">
              <span>Background</span>
              <select
                value={options.background}
                onChange={(e) =>
                  setExportOptions({
                    background: e.target.value as ExportBackground,
                  })
                }
              >
                <option value="document">Document</option>
                <option value="transparent">Transparent</option>
                <option value="solid">Solid color</option>
              </select>
            </label>

            {options.background === 'solid' && (
              <label className="field">
                <span>Solid color</span>
                <input
                  type="color"
                  value={options.solidColor}
                  onChange={(e) => setExportOptions({ solidColor: e.target.value })}
                />
              </label>
            )}

            <label className="field">
              <span>Resolution preset</span>
              <select
                value={String(options.scale)}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'dpi300') {
                    setExportOptions({
                      scale: scaleForDpi(300, 72),
                      targetDpi: 300,
                    })
                    return
                  }
                  setExportOptions({ scale: Number(value) })
                }}
              >
                <option value="1">1× — screen (72 DPI equiv.)</option>
                <option value="2">2× — retina / web high-res</option>
                <option value="3">3× — ultra</option>
                <option value="dpi300">~300 DPI print ({scaleForDpi(300)}×)</option>
              </select>
            </label>

            <label className="field">
              <span>Custom scale</span>
              <input
                type="number"
                min={0.5}
                max={8}
                step={0.25}
                value={options.scale}
                onChange={(e) => setExportOptions({ scale: Number(e.target.value) })}
              />
            </label>

            <p className="export-meta">
              Output: <strong>{outputW} × {outputH} px</strong>
              <br />
              Artboard: {document.artboard.width} × {document.artboard.height} px
            </p>

            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="export-preview">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Export preview"
                className="export-preview-img"
                style={{
                  background:
                    options.background === 'transparent'
                      ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px'
                      : undefined,
                }}
              />
            ) : (
              <div className="export-preview-placeholder">
                Generate a preview to inspect transparency and resolution.
              </div>
            )}
            {meta && (
              <p className="export-meta">
                Preview rendered at {meta.w} × {meta.h} px
              </p>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={isExporting}
            onClick={() => void runExport(false)}
          >
            {isExporting ? 'Working…' : 'Preview'}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={isExporting}
            onClick={() => void runExport(true)}
          >
            Download PNG
          </button>
        </footer>
      </div>
    </div>
  )
}
