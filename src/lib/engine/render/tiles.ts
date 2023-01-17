import type { Sprite } from './Sprite'

export const tiles = (image: HTMLImageElement, tileSize: number) => ({
  tileSize,
  getTile: (x: number, y: number, width = 1, height = 1): Sprite => ({
    image,
    x: x * tileSize,
    y: y * tileSize,
    width: tileSize * width,
    height: tileSize * height
  })
})

export type Tiles = ReturnType<typeof tiles>
