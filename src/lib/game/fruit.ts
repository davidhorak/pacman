import type { Engine } from '../engine/engine'
import type { Collider } from '../engine/physics/collision'
import type { Tiles } from '../engine/render/tiles'

export const fruits = {
  cherry: {
    points: 100,
    spriteOffset: 0,
    level: 1
  },
  strawberry: {
    points: 300,
    spriteOffset: 1,
    level: 2
  },
  orange: {
    points: 500,
    spriteOffset: 2,
    level: 3
  },
  apple: {
    points: 700,
    spriteOffset: 3,
    level: 5
  },
  melon: {
    points: 1000,
    spriteOffset: 4,
    level: 7
  },
  galaxian: {
    points: 2000,
    spriteOffset: 5,
    level: 9
  },
  bell: {
    points: 3000,
    spriteOffset: 6,
    level: 11
  },
  key: {
    points: 5000,
    spriteOffset: 7,
    level: 13
  }
}

export type Fruits = keyof typeof fruits
export type FruitData = (typeof fruits)['cherry']

export const fruit =
  ({ render, tiles, tileSize }: { render: Engine['render']; tiles: Tiles; tileSize: number }) =>
  (x: number, y: number) => {
    let kind: Fruits = 'cherry'
    let points = 0
    let sprite = tiles.getTile(0 + fruits[kind].spriteOffset, 3)
    let active = false
    let timer = 0
    const lifespan = 10 * 1000
    const collider: Collider = {
      x: x + tileSize / 2,
      y: y + tileSize / 2,
      radius: tileSize / 4
    }

    let showCollider = false
    let showDebug = false

    return {
      x,
      y,
      collider,
      get sprite() {
        return sprite
      },
      get active() {
        return active
      },
      set active(value: boolean) {
        active = value
        if (active) {
          timer = lifespan
        } else {
          timer = 0
        }
      },
      get points() {
        return points
      },
      set kind(value: Fruits) {
        kind = value
        points = fruits[value].points
        sprite = tiles.getTile(0 + fruits[value].spriteOffset, 3)
      },
      onUpdate: (elapsed: number) => {
        if (timer > 0) {
          timer -= elapsed
          if (timer < 0) {
            timer = 0
            active = false
          }
        }
      },
      onRender: () => {
        active && sprite && render.drawSprite(sprite, x, y, tileSize, tileSize)
        active &&
          showCollider &&
          render.drawCircle('#00ff00', 2, collider.x, collider.y, collider.radius)

        if (showDebug) {
          render.drawText('10px monospace', '#ffffff', `${kind}`, x, y + 40)
          render.drawText('10px monospace', '#ffffff', `t: ${Math.round(timer)}`, x, y + 50)
        }
      },
      toggleCollider: () => (showCollider = !showCollider),
      toggleDebug: () => (showDebug = !showDebug)
    }
  }

export type Fruit = ReturnType<ReturnType<typeof fruit>>
