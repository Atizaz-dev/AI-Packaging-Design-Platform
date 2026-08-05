import Konva from 'konva'
import type { ExportOptions } from '@/types/document'

export interface ExportResult {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  filename: string
}

/**
 * Renders the Konva stage artboard region to a PNG at the requested scale.
 * High-resolution export is scale × artboard size (e.g. 300/72 ≈ 4.17× for print).
 */
export async function exportStageToPng(
  stage: Konva.Stage,
  artboard: { width: number; height: number },
  options: ExportOptions,
): Promise<ExportResult> {
  const scale = Math.max(0.25, Math.min(options.scale, 8))
  const pixelRatio = scale

  const artboardNode = stage.findOne('#artboard-root')
  if (!artboardNode) {
    throw new Error('Artboard node not found — cannot export')
  }

  const previousScale = { x: stage.scaleX(), y: stage.scaleY() }
  const previousPos = { x: stage.x(), y: stage.y() }

  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })
  stage.batchDraw()

  const width = Math.round(artboard.width * pixelRatio)
  const height = Math.round(artboard.height * pixelRatio)

  const bgNodes = stage.find('.export-solid-bg')
  const bgVisibility = bgNodes.map((n) => n.visible())
  if (options.background === 'transparent') {
    bgNodes.forEach((n) => n.visible(false))
    stage.batchDraw()
  }

  let solidRect: Konva.Rect | null = null
  if (options.background === 'solid') {
    solidRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: artboard.width,
      height: artboard.height,
      fill: options.solidColor,
      listening: false,
      name: 'export-temp-solid',
    })
    const root = artboardNode as Konva.Group
    root.add(solidRect)
    solidRect.moveToBottom()
    stage.batchDraw()
  }

  try {
    const dataUrl = stage.toDataURL({
      x: 0,
      y: 0,
      width: artboard.width,
      height: artboard.height,
      pixelRatio,
      mimeType: 'image/png',
    })

    const blob = await (await fetch(dataUrl)).blob()
    const filename = `${sanitizeFilename(options.filename)}.png`

    return { blob, dataUrl, width, height, filename }
  } finally {
    if (solidRect) solidRect.destroy()
    bgNodes.forEach((n, i) => n.visible(bgVisibility[i] ?? true))
    stage.scale(previousScale)
    stage.position(previousPos)
    stage.batchDraw()
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\w.\-()+\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'export'
  )
}

/** Suggested scale for a target print DPI from screen/base DPI. */
export function scaleForDpi(targetDpi: number, baseDpi = 72): number {
  return Math.round((targetDpi / baseDpi) * 100) / 100
}
