export type LayerType = 'background' | 'shape' | 'text' | 'image'

export type ShapeKind = 'rect' | 'ellipse'

export interface BaseLayer {
  id: string
  name: string
  type: LayerType
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
  visible: boolean
  locked: boolean
  zIndex: number
}

export interface BackgroundLayer extends BaseLayer {
  type: 'background'
  fill: string
  width: number
  height: number
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  shape: ShapeKind
  fill: string
  stroke: string
  strokeWidth: number
  width: number
  height: number
  cornerRadius: number
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fill: string
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic'
  align: 'left' | 'center' | 'right'
  width: number
  letterSpacing: number
  lineHeight: number
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  src: string
  width: number
  height: number
}

export type DesignLayer = BackgroundLayer | ShapeLayer | TextLayer | ImageLayer

export interface Artboard {
  width: number
  height: number
  unit: 'px'
  name: string
}

export interface DesignDocument {
  id: string
  name: string
  artboard: Artboard
  layers: DesignLayer[]
  updatedAt: number
}

export type ExportFormat = 'png'
export type ExportBackground = 'document' | 'transparent' | 'solid'

export interface ExportOptions {
  format: ExportFormat
  /** Multiplier relative to artboard pixel size (2 = 2× / ~200% DPI). */
  scale: number
  background: ExportBackground
  solidColor: string
  filename: string
  /** Optional target print DPI metadata for high-res calculation. */
  targetDpi: number
  baseDpi: number
}

export const DEFAULT_ARTBOARD: Artboard = {
  width: 800,
  height: 1000,
  unit: 'px',
  name: 'Front Panel',
}

export const DEFAULT_EXPORT: ExportOptions = {
  format: 'png',
  scale: 2,
  background: 'document',
  solidColor: '#ffffff',
  filename: 'packaging-export',
  targetDpi: 300,
  baseDpi: 72,
}
