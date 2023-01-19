import type { Engine } from '../engine/engine'
import { observable } from '../engine/observable'
import type { Vector2D } from '../engine/physics'
import { distance } from '../engine/physics'
import type { Tiles } from '../engine/render/tiles'
import type { Direction } from './direction'
import { directionVelocity } from './directionVelocity'
import type { Map } from './map'
import { noop, round2DecimalPlaces, toLevelProperties, toLevelProperty } from './utils'

type State = 'idle' | 'chomp' | 'eaten'

type LevelProperties = {
  speedMultiplier: number
}

const levelProperties = toLevelProperties<LevelProperties>({
  1: {
    speedMultiplier: 0.8
  },
  2: {
    speedMultiplier: 0.85
  },
  3: {
    speedMultiplier: 0.9
  },
  4: {
    speedMultiplier: 0.95
  },
  5: {
    speedMultiplier: 1
  },
  21: {
    speedMultiplier: 0.8
  }
})

export const player =
  ({
    render,
    tiles,
    tileSize,
    map
  }: {
    render: Engine['render']
    tiles: Tiles
    tileSize: number
    map: Map
  }) =>
  (startState: {
    direction: Direction
    position: Vector2D
    velocity: Vector2D
    target: Vector2D
  }) => {
    const position = new Proxy(
      { x: 0, y: 0 },
      {
        set: function <T>(target: T, key: keyof T, value: T[keyof T]) {
          target[key] = value
          collider.x = position.x * tileSize + tileSize / 2
          collider.y = position.y * tileSize + tileSize / 2
          return true
        }
      }
    )
    const collider = {
      x: 0,
      y: 0,
      radius: tileSize / 2
    }
    const velocity = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    const speed = 15 * 0.01
    const animationFramePerMs = 75

    let state: State = 'idle'
    let direction: Direction = 'right'
    let animationFrame = 0
    let animationTimer = 0
    let speedMultiplier = 1
    let movementDelay = 0

    // Debug
    let showTarget = false
    let showDebug = false
    let showCollider = false

    const onEaten = observable<void>()

    const canMove = (velocity: Vector2D, position: Vector2D, angled = false) => {
      const distanceTrigger = 0.01 + (speed * speedMultiplier) / 2
      if (angled && distance(position, target) > distanceTrigger) {
        return false
      }
      return !map.cell(Math.round(position.x) + velocity.x, Math.round(position.y) + velocity.y)
        .isWall
    }

    const isStationary = () => position.x === target.x && position.y === target.y

    const isLeftTeleport = () => position.x === 0
    const isRightTeleport = () => position.x === map.width - 1

    const stateActions = {
      idle: {
        update: noop,
        sprite: () => tiles.getTile(0, 1),
        animate: () => (animationFrame = 0)
      },
      chomp: {
        sprites: {
          right: [tiles.getTile(0, 0), tiles.getTile(1, 0)],
          left: [tiles.getTile(2, 0), tiles.getTile(3, 0)],
          up: [tiles.getTile(4, 0), tiles.getTile(5, 0)],
          down: [tiles.getTile(6, 0), tiles.getTile(7, 0)]
        },
        update: () => {
          const distanceTrigger = (speed * speedMultiplier) / 2
          if (distance(position, target) < distanceTrigger) {
            if (isLeftTeleport()) {
              position.x = map.width + 1
              target.x = map.width - 2
              return
            } else if (isRightTeleport()) {
              position.x = -2
              target.x = 1
              return
            }

            if (canMove(velocity, position)) {
              target.x += velocity.x
              target.y += velocity.y
            } else {
              position.x = target.x
              position.y = target.y
            }
            return
          }

          position.x += velocity.x * (speed * speedMultiplier)
          position.y += velocity.y * (speed * speedMultiplier)

          const { pellet } = map.cell(Math.round(position.x), Math.round(position.y))
          if (pellet?.active && distance(position, pellet.position) < distanceTrigger) {
            map.eatPellet(pellet)
            movementDelay += pellet.isPowerPellet ? 3 : 1
          }
        },
        sprite: function () {
          return this.sprites[direction][animationFrame ? 0 : 1]
        },
        animate: () => {
          animationFrame = isStationary() ? animationFrame : animationFrame ? 0 : 1
        }
      },
      eaten: {
        sprites: [
          ...Array(8)
            .fill(0)
            .map((_, i) => tiles.getTile(0 + i, 1)),
          ...Array(5)
            .fill(0)
            .map((_, i) => tiles.getTile(0 + i, 2))
        ],
        update: noop,
        sprite: function () {
          return this.sprites[animationFrame]
        },
        animate: function () {
          if (animationFrame < this.sprites.length - 1) {
            animationFrame++
          } else {
            onEaten.broadcast()
          }
        }
      }
    }

    return {
      position,
      velocity,
      collider,
      set state(value: State) {
        state = value
      },
      get direction() {
        return direction
      },
      set direction(value: Direction) {
        if (
          value !== direction &&
          canMove(
            directionVelocity[value],
            position,
            distance(velocity, directionVelocity[value]) !== 2
          )
        ) {
          direction = value
          position.x = target.x
          position.y = target.y
          target.x += directionVelocity[value].x
          target.y += directionVelocity[value].y
          velocity.x = directionVelocity[value].x
          velocity.y = directionVelocity[value].y
        }
      },
      reset: (level: number) => {
        state = 'chomp'
        direction = startState.direction
        position.x = startState.position.x
        position.y = startState.position.y
        velocity.x = startState.velocity.x
        velocity.y = startState.velocity.y
        target.x = startState.target.x
        target.y = startState.target.y
        movementDelay = 0

        const levelProperty = toLevelProperty(levelProperties, level)
        speedMultiplier = levelProperty?.speedMultiplier ?? 1
      },
      render: () => {
        render.drawSprite(
          stateActions[state].sprite(),
          position.x * tileSize - tileSize / 2,
          position.y * tileSize - tileSize / 2,
          tiles.tileSize,
          tiles.tileSize
        )

        if (showTarget) {
          render.drawRect(
            '#ff0000',
            4,
            target.x * tileSize,
            target.y * tileSize,
            tiles.tileSize / 2,
            tiles.tileSize / 2
          )
        }

        if (showDebug) {
          render.drawText(
            '10px monospace',
            '#ffffff',
            `→ ${round2DecimalPlaces(speed * speedMultiplier)}`,
            tileSize * 14,
            tileSize * 7 + 2,
            true
          )
        }

        if (showCollider) {
          render.drawCircle('#00ff00', 2, collider.x, collider.y, collider.radius)
        }
      },
      update: (elapsed: number) => {
        animationTimer += elapsed

        if (movementDelay > 0) {
          movementDelay--
          return
        }

        stateActions[state].update()

        const animationTrigger = state === 'eaten' ? animationFramePerMs * 2 : animationFramePerMs

        if (animationTimer >= animationTrigger) {
          animationTimer = 0
          stateActions[state].animate()
        }
      },
      onEaten: onEaten.subscribe,
      // Debug
      toggleTarget: () => (showTarget = !showTarget),
      toggleDebug: () => (showDebug = !showDebug),
      toggleCollider: () => (showCollider = !showCollider)
    }
  }

export type Player = ReturnType<ReturnType<typeof player>>
