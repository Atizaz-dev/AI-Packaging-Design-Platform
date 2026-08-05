import { v4 as uuid } from 'uuid'
import type {
  Artboard,
  BackgroundLayer,
  DesignDocument,
  DesignLayer,
  ImageLayer,
  ShapeLayer,
  TextLayer,
} from '@/types/document'
import { DEFAULT_ARTBOARD } from '@/types/document'

function nextZ(layers: DesignLayer[]): number {
  if (layers.length === 0) return 0
  return Math.max(...layers.map((l) => l.zIndex)) + 1
}

export function createBackground(
  artboard: Artboard,
  fill = '#1f4d3a',
  overrides: Partial<BackgroundLayer> = {},
): BackgroundLayer {
  return {
    id: uuid(),
    name: 'Background',
    type: 'background',
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: true,
    zIndex: 0,
    fill,
    width: artboard.width,
    height: artboard.height,
    ...overrides,
  }
}

export function createShape(
  layers: DesignLayer[],
  overrides: Partial<ShapeLayer> = {},
): ShapeLayer {
  return {
    id: uuid(),
    name: 'Shape',
    type: 'shape',
    shape: 'rect',
    x: 120,
    y: 180,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: nextZ(layers),
    fill: '#c4a35a',
    stroke: '',
    strokeWidth: 0,
    width: 560,
    height: 200,
    cornerRadius: 0,
    ...overrides,
  }
}

export function createText(
  layers: DesignLayer[],
  overrides: Partial<TextLayer> = {},
): TextLayer {
  return {
    id: uuid(),
    name: 'Text',
    type: 'text',
    x: 140,
    y: 240,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: nextZ(layers),
    text: 'AMERICAN GARDEN',
    fontSize: 48,
    fontFamily: 'Instrument Serif, Georgia, serif',
    fill: '#f7f3ea',
    fontStyle: 'normal',
    align: 'center',
    width: 520,
    letterSpacing: 4,
    lineHeight: 1.15,
    ...overrides,
  }
}

export function createImage(
  layers: DesignLayer[],
  src: string,
  width: number,
  height: number,
  overrides: Partial<ImageLayer> = {},
): ImageLayer {
  return {
    id: uuid(),
    name: 'Logo / Image',
    type: 'image',
    x: 300,
    y: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: nextZ(layers),
    src,
    width,
    height,
    ...overrides,
  }
}

/** Minimal brand mark as SVG data URL for the seed document. */
export function defaultLogoSrc(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="72" fill="#f7f3ea"/>
  <path d="M80 28c-18 22-32 40-32 58a32 32 0 0 0 64 0c0-18-14-36-32-58z" fill="#1f4d3a"/>
  <circle cx="80" cy="90" r="10" fill="#c4a35a"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function createSeedDocument(): DesignDocument {
  const artboard = { ...DEFAULT_ARTBOARD, name: 'Label — Front' }
  const bg = createBackground(artboard, '#1f4d3a', { locked: true, zIndex: 0 })

  const accentBand = createShape([], {
    name: 'Accent Band',
    x: 0,
    y: 720,
    width: artboard.width,
    height: 120,
    fill: '#c4a35a',
    zIndex: 1,
  })

  const brand = createText([accentBand], {
    name: 'Brand Title',
    text: 'GARDEN HARVEST',
    x: 80,
    y: 300,
    width: 640,
    fontSize: 56,
    fill: '#f7f3ea',
    align: 'center',
    letterSpacing: 6,
    zIndex: 2,
  })

  const tagline = createText([accentBand, brand], {
    name: 'Tagline',
    text: 'Premium organic sauces since 1987',
    x: 100,
    y: 380,
    width: 600,
    fontSize: 22,
    fontFamily: 'DM Sans, system-ui, sans-serif',
    fill: '#d4c9a8',
    align: 'center',
    letterSpacing: 1,
    zIndex: 3,
  })

  const badge = createShape([accentBand, brand, tagline], {
    name: 'Footer Badge',
    shape: 'ellipse',
    x: 300,
    y: 740,
    width: 200,
    height: 80,
    fill: '#1a3d2e',
    zIndex: 4,
  })

  const badgeText = createText([accentBand, brand, tagline, badge], {
    name: 'Badge Text',
    text: 'NET WT 16 OZ',
    x: 300,
    y: 762,
    width: 200,
    fontSize: 16,
    fontFamily: 'DM Sans, system-ui, sans-serif',
    fill: '#f7f3ea',
    align: 'center',
    letterSpacing: 2,
    zIndex: 5,
  })

  const logo = createImage(
    [accentBand, brand, tagline, badge, badgeText],
    defaultLogoSrc(),
    120,
    120,
    {
      name: 'Brand Logo',
      x: 340,
      y: 100,
      zIndex: 6,
    },
  )

  return {
    id: uuid(),
    name: 'Garden Harvest Label',
    artboard,
    layers: [bg, accentBand, brand, tagline, badge, badgeText, logo],
    updatedAt: Date.now(),
  }
}

export function sortedLayers(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex)
}

export function reindexLayers(layers: DesignLayer[]): DesignLayer[] {
  return sortedLayers(layers).map((layer, index) => ({
    ...layer,
    zIndex: index,
  }))
}
