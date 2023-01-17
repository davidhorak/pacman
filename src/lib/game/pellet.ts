import type { Engine } from '../engine/engine'

export const pellet =
  ({ render, tileSize }: { render: Engine['render']; tileSize: number }) =>
  (x: number, y: number, isPowerPellet = false) => {
    const color = '#ffb7ae'
    let size = 4
    let points = 10
    let time = 0
    const position = {
      x: x * tileSize + (tileSize - size) / 2,
      y: y * tileSize + (tileSize - size) / 2
    }

    if (isPowerPellet) {
      size = 6
      points = 50
      position.x += size / 4
      position.y += size / 4
    }

    let active = true
    let animationFrame = true

    return {
      get active() {
        return active
      },
      set active(value) {
        active = value
      },
      points,
      isPowerPellet: isPowerPellet,
      position: {
        x,
        y
      },
      reset: () => {
        time = 0
        active = true
        animationFrame = false
      },
      onUpdate: (elapsed: number) => {
        time += elapsed
        if (time > 400) {
          time = 0
          animationFrame = !animationFrame
        }
      },
      onRender: () => {
        isPowerPellet
          ? active && animationFrame && render.drawCircleFilled(color, position.x, position.y, size)
          : active && render.drawRectFilled(color, position.x, position.y, size, size)
      }
    }
  }

export type Pellet = ReturnType<ReturnType<typeof pellet>>
