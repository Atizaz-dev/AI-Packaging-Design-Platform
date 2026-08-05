import { useEffect, useState } from 'react'

const imageCache = new Map<string, HTMLImageElement>()

export function useHtmlImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() =>
    src ? imageCache.get(src) : undefined,
  )

  useEffect(() => {
    if (!src) {
      setImage(undefined)
      return
    }

    const cached = imageCache.get(src)
    if (cached?.complete) {
      setImage(cached)
      return
    }

    let cancelled = false
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      if (!cancelled) setImage(img)
    }
    img.onerror = () => {
      if (!cancelled) setImage(undefined)
    }
    img.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  return image
}
