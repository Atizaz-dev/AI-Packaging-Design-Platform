import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Stage,
  Layer,
  Rect,
  Ellipse,
  Text,
  Image as KonvaImage,
  Transformer,
  Group,
} from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '@/lib/store'
import { sortedLayers } from '@/lib/factories'
import { useHtmlImage } from '@/hooks/useHtmlImage'
import type {
  DesignLayer,
  ImageLayer,
  ShapeLayer,
  TextLayer,
  BackgroundLayer,
} from '@/types/document'

interface DesignCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>
}

function BackgroundNode({ layer }: { layer: BackgroundLayer }) {
  return (
    <Rect
      id={layer.id}
      name="export-solid-bg"
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fill={layer.fill}
      opacity={layer.opacity}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

function RectShapeNode({
  layer,
  onSelect,
  onPatch,
}: {
  layer: ShapeLayer
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onPatch: (patch: Partial<ShapeLayer>, commit: boolean) => void
}) {
  return (
    <Rect
      id={layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      cornerRadius={layer.cornerRadius}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      fill={layer.fill}
      stroke={layer.stroke || undefined}
      strokeWidth={layer.strokeWidth}
      draggable={!layer.locked}
      visible={layer.visible}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onPatch({ x: e.target.x(), y: e.target.y() }, true)
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onPatch(
          {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(8, node.width() * scaleX),
            height: Math.max(8, node.height() * scaleY),
            scaleX: 1,
            scaleY: 1,
          },
          true,
        )
      }}
    />
  )
}

function EllipseShapeNode({
  layer,
  onSelect,
  onPatch,
}: {
  layer: ShapeLayer
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onPatch: (patch: Partial<ShapeLayer>, commit: boolean) => void
}) {
  return (
    <Ellipse
      id={layer.id}
      x={layer.x + layer.width / 2}
      y={layer.y + layer.height / 2}
      radiusX={layer.width / 2}
      radiusY={layer.height / 2}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      fill={layer.fill}
      stroke={layer.stroke || undefined}
      strokeWidth={layer.strokeWidth}
      draggable={!layer.locked}
      visible={layer.visible}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target
        onPatch(
          {
            x: node.x() - layer.width / 2,
            y: node.y() - layer.height / 2,
          },
          true,
        )
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        const newW = Math.max(8, layer.width * scaleX)
        const newH = Math.max(8, layer.height * scaleY)
        onPatch(
          {
            x: node.x() - newW / 2,
            y: node.y() - newH / 2,
            width: newW,
            height: newH,
            rotation: node.rotation(),
            scaleX: 1,
            scaleY: 1,
          },
          true,
        )
      }}
    />
  )
}

function TextNode({
  layer,
  onSelect,
  onPatch,
  onEdit,
}: {
  layer: TextLayer
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onPatch: (patch: Partial<TextLayer>, commit: boolean) => void
  onEdit: (layer: TextLayer) => void
}) {
  return (
    <Text
      id={layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      text={layer.text}
      fontSize={layer.fontSize}
      fontFamily={layer.fontFamily}
      fontStyle={layer.fontStyle}
      fill={layer.fill}
      align={layer.align}
      letterSpacing={layer.letterSpacing}
      lineHeight={layer.lineHeight}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      draggable={!layer.locked}
      visible={layer.visible}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={() => onEdit(layer)}
      onDblTap={() => onEdit(layer)}
      onDragEnd={(e) => {
        onPatch({ x: e.target.x(), y: e.target.y() }, true)
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onPatch(
          {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(40, node.width() * scaleX),
            fontSize: Math.max(8, Math.round(layer.fontSize * scaleY)),
            scaleX: 1,
            scaleY: 1,
          },
          true,
        )
      }}
    />
  )
}

function ImageNode({
  layer,
  onSelect,
  onPatch,
}: {
  layer: ImageLayer
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onPatch: (patch: Partial<ImageLayer>, commit: boolean) => void
}) {
  const image = useHtmlImage(layer.src)
  if (!image) return null

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      opacity={layer.opacity}
      draggable={!layer.locked}
      visible={layer.visible}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onPatch({ x: e.target.x(), y: e.target.y() }, true)
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onPatch(
          {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            width: Math.max(8, node.width() * scaleX),
            height: Math.max(8, node.height() * scaleY),
            scaleX: 1,
            scaleY: 1,
          },
          true,
        )
      }}
    />
  )
}

export function DesignCanvas({ stageRef }: DesignCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ width: 800, height: 700 })

  const document = useEditorStore((s) => s.document)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const stageScale = useEditorStore((s) => s.stageScale)
  const select = useEditorStore((s) => s.select)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const updateLayer = useEditorStore((s) => s.updateLayer)

  const layers = useMemo(
    () => sortedLayers(document.layers),
    [document.layers],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const offset = useMemo(() => {
    const aw = document.artboard.width * stageScale
    const ah = document.artboard.height * stageScale
    return {
      x: Math.max(24, (size.width - aw) / 2),
      y: Math.max(24, (size.height - ah) / 2),
    }
  }, [document.artboard, stageScale, size])

  useEffect(() => {
    const stage = stageRef.current
    const tr = trRef.current
    if (!stage || !tr) return

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${CSS.escape(id)}`) ?? stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => {
        if (!n) return false
        const layer = document.layers.find((l) => l.id === n.id())
        return Boolean(layer && !layer.locked && layer.visible && layer.type !== 'background')
      })

    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, document.layers, stageRef, layers])

  const handleSelect = useCallback(
    (layer: DesignLayer, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true
      if (layer.locked) return
      const mouse = e.evt as MouseEvent
      const additive = mouse.shiftKey || mouse.metaKey || mouse.ctrlKey
      select([layer.id], additive)
    },
    [select],
  )

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const name = e.target.name?.() ?? ''
    if (e.target === e.target.getStage() || name === 'viewport-bg') {
      clearSelection()
    }
  }

  const openTextEditor = useCallback(
    (layer: TextLayer) => {
      const next = window.prompt('Edit text', layer.text)
      if (next === null) return
      updateLayer(layer.id, { text: next } as Partial<TextLayer>, true)
    },
    [updateLayer],
  )

  const patchLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>, commit: boolean) => {
      updateLayer(id, patch, commit)
    },
    [updateLayer],
  )

  return (
    <div className="canvas-shell" ref={containerRef}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={offset.x}
        y={offset.y}
        onMouseDown={handleStageClick}
        onTouchStart={handleStageClick}
      >
        <Layer listening={false}>
          <Rect
            name="viewport-bg"
            x={-offset.x / stageScale - 100}
            y={-offset.y / stageScale - 100}
            width={size.width / stageScale + 200}
            height={size.height / stageScale + 200}
            fill="#0f1411"
          />
        </Layer>

        <Layer>
          <Rect
            x={6}
            y={8}
            width={document.artboard.width}
            height={document.artboard.height}
            fill="#000000"
            opacity={0.28}
            listening={false}
            perfectDrawEnabled={false}
          />

          <Group
            id="artboard-root"
            clipX={0}
            clipY={0}
            clipWidth={document.artboard.width}
            clipHeight={document.artboard.height}
          >
            {layers.map((layer) => {
              if (!layer.visible) return null

              if (layer.type === 'background') {
                return <BackgroundNode key={layer.id} layer={layer} />
              }

              if (layer.type === 'shape') {
                if (layer.shape === 'ellipse') {
                  return (
                    <EllipseShapeNode
                      key={layer.id}
                      layer={layer}
                      onSelect={(e) => handleSelect(layer, e)}
                      onPatch={(patch, commit) => patchLayer(layer.id, patch, commit)}
                    />
                  )
                }
                return (
                  <RectShapeNode
                    key={layer.id}
                    layer={layer}
                    onSelect={(e) => handleSelect(layer, e)}
                    onPatch={(patch, commit) => patchLayer(layer.id, patch, commit)}
                  />
                )
              }

              if (layer.type === 'text') {
                return (
                  <TextNode
                    key={layer.id}
                    layer={layer}
                    onSelect={(e) => handleSelect(layer, e)}
                    onPatch={(patch, commit) => patchLayer(layer.id, patch, commit)}
                    onEdit={openTextEditor}
                  />
                )
              }

              if (layer.type === 'image') {
                return (
                  <ImageNode
                    key={layer.id}
                    layer={layer}
                    onSelect={(e) => handleSelect(layer, e)}
                    onPatch={(patch, commit) => patchLayer(layer.id, patch, commit)}
                  />
                )
              }

              return null
            })}
          </Group>

          <Rect
            x={0}
            y={0}
            width={document.artboard.width}
            height={document.artboard.height}
            stroke="#c4a35a"
            strokeWidth={1 / stageScale}
            listening={false}
          />

          <Transformer
            ref={trRef}
            rotateEnabled
            borderStroke="#c4a35a"
            anchorStroke="#c4a35a"
            anchorFill="#1a2e1f"
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox
              return newBox
            }}
          />
        </Layer>
      </Stage>
    </div>
  )
}
