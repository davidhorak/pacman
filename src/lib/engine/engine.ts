import { inputs } from './inputs'
import { observable } from './observable'
import { render } from './render'
import { sprites } from './render/sprites'
import { tiles } from './render/tiles'

export const engine = ({ width, height, fps }: { width: number; height: number; fps?: number }) => {
  let lastUpdate = 0
  let lastRender = 0
  const onUpdate = observable<number>()
  const onRender = observable<void>()
  fps = fps ? 1000 / fps : undefined

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('failed to get the canvas context.')
  }
  canvas.height = height
  canvas.width = width
  document.body.appendChild(canvas)

  const loop = (time: number) => {
    onUpdate.broadcast(time - lastUpdate)
    lastUpdate = time

    const elapsed = time - lastRender
    if (!fps || elapsed > fps) {
      onRender.broadcast()
      lastRender = time
    }

    window.requestAnimationFrame(loop)
  }

  lastRender = lastUpdate = performance.now()
  window.requestAnimationFrame(loop)

  return {
    onUpdate: (callback: (elapsed: number) => void) => onUpdate.subscribe(callback),
    onRender: (callback: () => void) => onRender.subscribe(callback),
    inputs: inputs(),
    render: render(canvas, context),
    sprites: sprites(),
    tiles
  }
}

export type Engine = ReturnType<typeof engine>
