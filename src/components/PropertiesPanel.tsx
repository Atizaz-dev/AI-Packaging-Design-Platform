import { useMemo } from 'react'
import { useEditorStore } from '@/lib/store'
import type { DesignLayer, ImageLayer, ShapeLayer, TextLayer } from '@/types/document'

export function PropertiesPanel() {
  const document = useEditorStore((s) => s.document)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const setArtboardBackground = useEditorStore((s) => s.setArtboardBackground)

  const selected = useMemo(() => {
    if (selectedIds.length !== 1) return null
    return document.layers.find((l) => l.id === selectedIds[0]) ?? null
  }, [document.layers, selectedIds])

  const background = document.layers.find((l) => l.type === 'background')

  if (!selected) {
    return (
      <aside className="panel props-panel" aria-label="Properties">
        <header className="panel-header">
          <h2>Properties</h2>
        </header>
        <div className="props-empty">
          <p>Select a layer to edit its properties.</p>
          {background && background.type === 'background' && (
            <label className="field">
              <span>Document background</span>
              <input
                type="color"
                value={background.fill}
                onChange={(e) => setArtboardBackground(e.target.value)}
              />
            </label>
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className="panel props-panel" aria-label="Properties">
      <header className="panel-header">
        <h2>Properties</h2>
        <span className="panel-meta">{selected.type}</span>
      </header>

      <div className="props-body">
        <CommonFields
          layer={selected}
          onChange={(patch, commit = true) => updateLayer(selected.id, patch, commit)}
        />

        {selected.type === 'text' && (
          <TextFields
            layer={selected}
            onChange={(patch, commit = true) =>
              updateLayer(selected.id, patch as Partial<DesignLayer>, commit)
            }
          />
        )}

        {selected.type === 'shape' && (
          <ShapeFields
            layer={selected}
            onChange={(patch, commit = true) =>
              updateLayer(selected.id, patch as Partial<DesignLayer>, commit)
            }
          />
        )}

        {selected.type === 'image' && (
          <ImageFields
            layer={selected}
            onChange={(patch, commit = true) =>
              updateLayer(selected.id, patch as Partial<DesignLayer>, commit)
            }
          />
        )}

        {selected.type === 'background' && (
          <label className="field">
            <span>Fill</span>
            <input
              type="color"
              value={selected.fill}
              onChange={(e) => setArtboardBackground(e.target.value)}
            />
          </label>
        )}
      </div>
    </aside>
  )
}

function CommonFields({
  layer,
  onChange,
}: {
  layer: DesignLayer
  onChange: (patch: Partial<DesignLayer>, commit?: boolean) => void
}) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>X</span>
        <input
          type="number"
          value={Math.round(layer.x)}
          disabled={layer.locked || layer.type === 'background'}
          onChange={(e) => onChange({ x: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Y</span>
        <input
          type="number"
          value={Math.round(layer.y)}
          disabled={layer.locked || layer.type === 'background'}
          onChange={(e) => onChange({ y: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.opacity}
          disabled={layer.locked}
          onChange={(e) => onChange({ opacity: Number(e.target.value) }, false)}
          onMouseUp={(e) =>
            onChange({ opacity: Number((e.target as HTMLInputElement).value) }, true)
          }
        />
      </label>
      <label className="field">
        <span>Rotation</span>
        <input
          type="number"
          value={Math.round(layer.rotation)}
          disabled={layer.locked || layer.type === 'background'}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}

function TextFields({
  layer,
  onChange,
}: {
  layer: TextLayer
  onChange: (patch: Partial<TextLayer>, commit?: boolean) => void
}) {
  return (
    <>
      <label className="field">
        <span>Text</span>
        <textarea
          rows={3}
          value={layer.text}
          disabled={layer.locked}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Size</span>
          <input
            type="number"
            min={8}
            value={layer.fontSize}
            disabled={layer.locked}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Color</span>
          <input
            type="color"
            value={toHex(layer.fill)}
            disabled={layer.locked}
            onChange={(e) => onChange({ fill: e.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span>Font</span>
        <select
          value={layer.fontFamily}
          disabled={layer.locked}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          <option value="Instrument Serif, Georgia, serif">Instrument Serif</option>
          <option value="DM Sans, system-ui, sans-serif">DM Sans</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Courier New, monospace">Courier New</option>
        </select>
      </label>
      <label className="field">
        <span>Align</span>
        <select
          value={layer.align}
          disabled={layer.locked}
          onChange={(e) =>
            onChange({ align: e.target.value as TextLayer['align'] })
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="field">
        <span>Style</span>
        <select
          value={layer.fontStyle}
          disabled={layer.locked}
          onChange={(e) =>
            onChange({ fontStyle: e.target.value as TextLayer['fontStyle'] })
          }
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="bold italic">Bold Italic</option>
        </select>
      </label>
    </>
  )
}

function ShapeFields({
  layer,
  onChange,
}: {
  layer: ShapeLayer
  onChange: (patch: Partial<ShapeLayer>, commit?: boolean) => void
}) {
  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>Width</span>
          <input
            type="number"
            min={1}
            value={Math.round(layer.width)}
            disabled={layer.locked}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Height</span>
          <input
            type="number"
            min={1}
            value={Math.round(layer.height)}
            disabled={layer.locked}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="field">
        <span>Fill</span>
        <input
          type="color"
          value={toHex(layer.fill)}
          disabled={layer.locked}
          onChange={(e) => onChange({ fill: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Shape</span>
        <select
          value={layer.shape}
          disabled={layer.locked}
          onChange={(e) =>
            onChange({ shape: e.target.value as ShapeLayer['shape'] })
          }
        >
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
      </label>
    </>
  )
}

function ImageFields({
  layer,
  onChange,
}: {
  layer: ImageLayer
  onChange: (patch: Partial<ImageLayer>, commit?: boolean) => void
}) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Width</span>
        <input
          type="number"
          min={1}
          value={Math.round(layer.width)}
          disabled={layer.locked}
          onChange={(e) => onChange({ width: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Height</span>
        <input
          type="number"
          min={1}
          value={Math.round(layer.height)}
          disabled={layer.locked}
          onChange={(e) => onChange({ height: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}

function toHex(color: string): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    if (color.length === 4) {
      const r = color[1]
      const g = color[2]
      const b = color[3]
      return `#${r}${r}${g}${g}${b}${b}`
    }
    return color
  }
  return '#000000'
}
