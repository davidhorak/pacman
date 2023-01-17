import type { Sprite } from './Sprite'

export const render = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => ({
  clear: () => context.clearRect(0, 0, canvas.width, canvas.height),

  drawSprite: (sprite: Sprite, x: number, y: number, width: number, height: number) => {
    context.drawImage(
      sprite.image,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      x,
      y,
      width,
      height
    )
  },

  drawRect: (
    color: string,
    lineWidth: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    context.beginPath()
    context.lineWidth = lineWidth
    context.strokeStyle = color
    context.rect(x, y, width, height)
    context.stroke()
  },

  drawRectFilled: (
    color: string | CanvasGradient | CanvasPattern,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    context.fillStyle = color
    context.fillRect(x, y, width, height)
  },

  drawCircle: (color: string, lineWidth: number, x: number, y: number, radius: number) => {
    context.beginPath()
    context.lineWidth = lineWidth
    context.strokeStyle = color
    context.arc(x, y, radius, 0, 2 * Math.PI)
    context.stroke()
  },

  drawCircleFilled: (
    color: string | CanvasGradient | CanvasPattern,
    x: number,
    y: number,
    radius: number
  ) => {
    context.beginPath()
    context.arc(x, y, radius, 0, 2 * Math.PI)
    context.fillStyle = color
    context.fill()
  },

  drawText: (font: string, color: string, text: string, x: number, y: number, centered = false) => {
    context.font = font
    context.fillStyle = color
    if (centered) {
      x -= context.measureText(text).width / 2
    }
    context.fillText(text, x, y)
  },

  measureText: (text: string) => context.measureText(text).width
})
