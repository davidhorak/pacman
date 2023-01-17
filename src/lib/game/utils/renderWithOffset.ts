import type { render } from '../../engine/render'
import type { Sprite } from '../../engine/render/Sprite'

type Render = ReturnType<typeof render>

export const renderWithOffset = (offset: number, render: Render): Render => ({
  clear: render.clear,
  drawSprite: (sprite: Sprite, x: number, y: number, width: number, height: number) =>
    render.drawSprite(sprite, x, y + offset, width, height),
  drawRect: (
    color: string,
    lineWidth: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) => render.drawRect(color, lineWidth, x, y + offset, width, height),
  drawRectFilled: (
    color: string | CanvasGradient | CanvasPattern,
    x: number,
    y: number,
    width: number,
    height: number
  ) => render.drawRectFilled(color, x, y + offset, width, height),
  drawCircle: (color: string, lineWidth: number, x: number, y: number, radius: number) =>
    render.drawCircle(color, lineWidth, x, y + offset, radius),
  drawCircleFilled: (
    color: string | CanvasGradient | CanvasPattern,
    x: number,
    y: number,
    radius: number
  ) => render.drawCircleFilled(color, x, y + offset, radius),
  drawText: (font: string, color: string, text: string, x: number, y: number, centered = false) =>
    render.drawText(font, color, text, x, y + offset, centered),
  measureText: render.measureText
})
