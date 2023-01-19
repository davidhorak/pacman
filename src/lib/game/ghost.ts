import type { Engine } from '../engine/engine'
import { observable } from '../engine/observable'
import type { Vector2D } from '../engine/physics'
import { distance } from '../engine/physics'
import type { Collider } from '../engine/physics/collision'
import type { Tiles } from '../engine/render/tiles'
import type { Direction } from './direction'
import { directionVelocity } from './directionVelocity'
import type { Map } from './map'
import type { Player } from './player'
import { round2DecimalPlaces, toLevelProperties } from './utils'

type State = 'idle' | 'scatter' | 'chase' | 'frightened' | 'eaten' | 'departure' | 'gated'

const ghosts = {
  blinky: {
    scatterTarget: { x: 26, y: -3 },
    gatedTarget: { x: 13.5, y: 14 },
    cruiseElroy: {
      isInMode1: (level: number, remainingPellets: number) =>
        remainingPellets <= Math.min(244 - 60, 20 + (level - 1) * 8),
      isInMode2: (level: number, remainingPellets: number) =>
        remainingPellets <= Math.min(244 - 60, 10 + level * 8),
      mode1SpeedMultiplier: 1.025,
      mode2SpeedMultiplier: 1.05
    }
  },
  pinky: { scatterTarget: { x: 2, y: -3 }, gatedTarget: { x: 13.5, y: 14 } },
  inky: {
    scatterTarget: { x: 28, y: 32 },
    gatedTarget: { x: 11.5, y: 14 },
    eatenPelletsTrigger: 30
  },
  clyde: {
    scatterTarget: { x: 0, y: 32 },
    gatedTarget: { x: 15.5, y: 14 },
    eatenPelletsTrigger: 60
  }
}

type LevelProperties = {
  cycles: [State, number][]
  spawnTime: number
  spawnTimeRevived: number
  speedMultiplier: number
  frightenedDuration: number
}

const playerSpeedBuffer = 0.05
const levelProperties = toLevelProperties<Partial<LevelProperties>>({
  1: {
    cycles: [
      ['scatter', 7 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 7 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 5 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 5 * 1000],
      ['chase', 1 * 1000]
    ],
    spawnTime: 4000,
    speedMultiplier: 0.8 - playerSpeedBuffer
  },
  2: {
    cycles: [
      ['scatter', 7 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 7 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 5 * 1000],
      ['chase', 1033 * 1000],
      ['scatter', 60 / 1000],
      ['chase', 1 * 1000]
    ],
    speedMultiplier: 0.85 - playerSpeedBuffer
  },
  3: {
    spawnTimeRevived: 1000,
    speedMultiplier: 0.9 - playerSpeedBuffer
  },
  4: {
    speedMultiplier: 0.95 - playerSpeedBuffer
  },
  5: {
    cycles: [
      ['scatter', 5 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 5 * 1000],
      ['chase', 20 * 1000],
      ['scatter', 5 * 1000],
      ['chase', 1037 * 1000],
      ['scatter', 60 / 1000],
      ['chase', 1 * 1000]
    ],
    spawnTime: 5000,
    speedMultiplier: 1 - playerSpeedBuffer
  },
  19: {
    frightenedDuration: 0
  }
})

const getFrightenedDuration = (level: number) => Math.max(0, 8000 - (level - 1) * 445)

const gateTarget = {
  x: 13.5,
  y: 11
}

export const ghost =
  ({
    render,
    tiles,
    tileSize,
    map,
    player,
    blinkyPosition
  }: {
    render: Engine['render']
    tiles: Tiles
    tileSize: number
    map: Map
    player: Player
    blinkyPosition?: Vector2D
  }) =>
  (kind: 'blinky' | 'inky' | 'pinky' | 'clyde') => {
    const position = new Proxy(
      { x: 0, y: 0 },
      {
        set: function <T>(target: T, key: keyof T, value: T[keyof T]) {
          target[key] = value
          updateCollider()
          return true
        }
      }
    )
    const aim: Vector2D = { x: 0, y: 0 }
    const target: Vector2D = { x: 0, y: 0 }
    const velocity = { x: 0, y: 0 }
    const animationSpeed = 75
    let level = 0
    let momentum = 1
    let state: State = 'scatter'
    let delayedState: State | undefined = undefined
    let direction: 'left' | 'up' | 'right' | 'down' = 'right'
    const spriteY = {
      blinky: 4,
      inky: 6,
      pinky: 5,
      clyde: 7
    }[kind]
    let speedMultiplier = 1
    let animationFrame = 0
    let animationTimer = 0
    let frightenedTimer = 0
    let movementPhase = 0
    let spawnTimer = 0
    let frightenedDuration = 0
    let time = 0
    let cycleMap: [State, number][]
    let cycle = 0
    let cycleTimer = 0
    let cruiseElroyMode: 0 | 1 | 2 = 0
    let cruiseElroyTimeout = 0
    const revivedCruiseElroyTimeout = 5000
    const collider: Collider = {
      x: 0,
      y: 0,
      radius: tileSize / 2
    }

    const updateCollider = () => {
      collider.x = position.x * tileSize + tileSize / 2
      collider.y = position.y * tileSize + tileSize / 2
    }

    const distanceToTarget = (
      x: number,
      y: number,
      direction: Direction,
      priority: number
    ): [number, number, Vector2D, Direction] => {
      const cell = map.cell(x, y)
      if (cell.isWall || cell.isVirtualWall) {
        return [cell.isVirtualWall ? Number.MAX_VALUE : Infinity, priority, { x, y }, direction]
      }
      if (distance({ x: position.x + velocity.x, y: position.y + velocity.y }, { x, y }) === 2) {
        return [Infinity, priority, { x, y }, direction]
      }
      return [distance(target, { x, y }), priority, { x, y }, direction]
    }

    const move = (speed: number) => {
      momentum = speed
      const targetMinDist = 0.01 + speed / 2

      if (state === 'gated' && distance(position, target) < targetMinDist) {
        movementPhase++
        if (kind === 'pinky') {
          if (movementPhase === 1) {
            state = 'departure'
            movementPhase = 0
            map.spawnGhost(kind)
          }
        } else {
          if (movementPhase === 1) {
            flip180()
            flip180()
            flip180()
            target.x = aim.x
            target.y = aim.y
            movementPhase = 0
          } else if (movementPhase === 2) {
            flip180()
            aim.x = target.x = ghosts[kind].gatedTarget.x
            aim.y = target.y = ghosts[kind].gatedTarget.y
          } else if (movementPhase === 3) {
            target.x = aim.x = ghosts['pinky'].gatedTarget.x
            target.y = aim.y = ghosts['pinky'].gatedTarget.y
            if (kind === 'inky') {
              direction = 'right'
              velocity.x = 1
              velocity.y = 0
            } else {
              direction = 'left'
              velocity.x = -1
              velocity.y = 0
            }
          } else {
            state = 'departure'
            movementPhase = 0
            map.spawnGhost(kind)
          }
        }
      }

      if (state === 'eaten' && distance(position, target) < targetMinDist) {
        position.x = target.x
        position.y = target.y
        movementPhase++
        if (movementPhase == 1) {
          aim.x = ghosts['pinky'].gatedTarget.x
          aim.y = ghosts['pinky'].gatedTarget.y
          target.x = ghosts[kind].gatedTarget.x
          target.y = ghosts[kind].gatedTarget.y
          velocity.x = 0
          velocity.y = 1
          direction = 'down'
        } else {
          stateChange('departure')
          flip180()
          aim.x = target.x = ghosts['pinky'].gatedTarget.x
          aim.y = target.y = ghosts['pinky'].gatedTarget.y
          return
        }
      }

      if (state === 'departure' && distance(position, target) < targetMinDist) {
        movementPhase++
        if (movementPhase == 1) {
          aim.x = target.x = gateTarget.x
          aim.y = target.y = gateTarget.y
          direction = 'up'
          velocity.x = 0
          velocity.y = -1
        } else if (movementPhase == 2) {
          if (delayedState) {
            stateChange(delayedState)
            delayedState = undefined
          } else {
            stateChange('scatter')
          }
          aim.x = Math.floor(gateTarget.x)
          aim.y = gateTarget.y
          direction = 'left'
          velocity.x = -1
          velocity.y = 0
          return
        }
      }

      if (distance(position, aim) < targetMinDist) {
        position.x = aim.x
        position.y = aim.y

        // teleports
        if (position.x === 0) {
          position.x = 29
          aim.x = 26
          return
        } else if (position.x === 27) {
          position.x = -2
          aim.x = 1
          return
        }

        const result = [
          distanceToTarget(position.x, position.y - 1, 'up', 1),
          distanceToTarget(position.x - 1, position.y, 'left', 2),
          distanceToTarget(position.x + 1, position.y, 'right', 2),
          distanceToTarget(position.x, position.y + 1, 'down', 3)
        ].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))

        if (state === 'frightened') {
          const options = result.filter(([distance]) => distance != Infinity)
          const random = options[Math.floor(Math.random() * options.length)]
          direction = random[3]
          aim.x = random[2].x
          aim.y = random[2].y
          velocity.x = directionVelocity[direction].x
          velocity.y = directionVelocity[direction].y
        } else {
          direction = result[0][3]
          aim.x = result[0][2].x
          aim.y = result[0][2].y
          velocity.x = directionVelocity[direction].x
          velocity.y = directionVelocity[direction].y
        }
        return
      }

      position.x += velocity.x * speed
      position.y += velocity.y * speed
    }

    const scatter = {
      speed: 15 * 0.01,
      sprites: {
        right: [tiles.getTile(0, spriteY), tiles.getTile(1, spriteY)],
        left: [tiles.getTile(2, spriteY), tiles.getTile(3, spriteY)],
        up: [tiles.getTile(4, spriteY), tiles.getTile(5, spriteY)],
        down: [tiles.getTile(6, spriteY), tiles.getTile(7, spriteY)]
      },
      update: function () {
        const speed = this.speed * speedMultiplier
        move(
          cruiseElroyMode === 1
            ? speed * ghosts.blinky.cruiseElroy.mode1SpeedMultiplier
            : cruiseElroyMode === 2
            ? speed * ghosts.blinky.cruiseElroy.mode2SpeedMultiplier
            : speed
        )
      },
      sprite: function () {
        return this.sprites[direction][animationFrame ? 0 : 1]
      },
      animate: () => {
        animationFrame = animationFrame ? 0 : 1
      }
    }

    const chase = {
      speed: scatter.speed,
      sprites: scatter.sprites,
      update: () => {
        if (kind === 'blinky') {
          target.x = player.position.x
          target.y = player.position.y
        } else if (kind === 'pinky') {
          if (player.direction == 'up') {
            target.x = player.position.x - 4
            target.y = player.position.y - 4
          } else {
            target.x = player.position.x + player.velocity.x * 4
            target.y = player.position.y + player.velocity.y * 4
          }
        } else if (kind === 'inky' && blinkyPosition) {
          let cx = 0
          let cy = 0
          if (player.direction == 'up') {
            cx = player.position.x - 2
            cy = player.position.y - 2
          } else {
            cx = player.position.x + player.velocity.x * 2
            cy = player.position.y + player.velocity.y * 2
          }
          target.x =
            Math.cos(Math.PI) * (blinkyPosition.x - cx) -
            Math.sin(Math.PI) * (blinkyPosition.y - cy) +
            cx
          target.y =
            Math.sin(Math.PI) * (blinkyPosition.x - cx) +
            Math.cos(Math.PI) * (blinkyPosition.y - cy) +
            cy
        } else {
          if (distance(player.position, position) >= 8) {
            target.x = player.position.x
            target.y = player.position.y
          } else {
            target.x = ghosts[kind].scatterTarget.x
            target.y = ghosts[kind].scatterTarget.y
          }
        }
        scatter.update()
      },
      sprite: scatter.sprite,
      animate: scatter.animate
    }

    const departure = {
      speed: 10 * 0.01,
      sprites: scatter.sprites,
      update: scatter.update,
      sprite: scatter.sprite,
      animate: scatter.animate
    }

    const frightened = {
      speed: 8 * 0.01,
      flashes: () =>
        [
          [1, 400],
          [800, 1200],
          [1600, 2000],
          [2400, 2800]
        ].some(([left, right]) => frightenedTimer >= left && frightenedTimer <= right),
      sprites: [tiles.getTile(0, 8), tiles.getTile(1, 8), tiles.getTile(2, 8), tiles.getTile(3, 8)],
      update: function (elapsed: number) {
        frightenedTimer -= elapsed
        if (frightenedTimer <= 0) {
          frightenedTimer = 0
          if (delayedState) {
            stateChange(delayedState)
            delayedState = undefined
          } else {
            stateChange('scatter')
          }
          return
        }
        move(this.speed)
      },
      sprite: function () {
        return this.sprites[(animationFrame ? 0 : 1) + (this.flashes() ? 2 : 0)]
      },
      animate: () => {
        animationFrame = animationFrame ? 0 : 1
      }
    }

    const eaten = {
      speed: 16 * 0.01,
      sprites: {
        right: tiles.getTile(4, 8),
        left: tiles.getTile(5, 8),
        up: tiles.getTile(6, 8),
        down: tiles.getTile(7, 8)
      },
      update: function () {
        move(this.speed)
      },
      sprite: function () {
        return this.sprites[direction]
      },
      animate: () => {
        animationFrame = 0
      }
    }

    const idle = {
      spriteX: kind === 'blinky' ? 2 : kind === 'pinky' ? 6 : 4,
      update: () => undefined,
      sprite: function () {
        return tiles.getTile(this.spriteX, spriteY)
      },
      animate: () => {
        animationFrame = 0
      }
    }

    const gated = {
      speed: 5 * 0.01,
      sprites: scatter.sprites,
      update: function () {
        if (
          kind === 'inky' &&
          movementPhase === 0 &&
          (map.eatenPellets >= ghosts[kind].eatenPelletsTrigger || time >= spawnTimer)
        ) {
          spawnTimer += spawnTimer
          movementPhase = 1
        }
        if (
          kind === 'clyde' &&
          movementPhase === 0 &&
          (map.eatenPellets >= ghosts[kind].eatenPelletsTrigger ||
            (spawnTimer > 0 && time >= spawnTimer))
        ) {
          movementPhase = 1
        }
        move(this.speed)
      },
      sprite: scatter.sprite,
      animate: scatter.animate
    }

    const states = {
      scatter,
      chase,
      departure,
      frightened,
      eaten,
      gated,
      idle
    }

    const flip180 = () => {
      if (direction == 'left') {
        direction = 'right'
        velocity.x = 1
        aim.x++
      } else if (direction == 'right') {
        direction = 'left'
        velocity.x = -1
        aim.x--
      } else if (direction == 'up') {
        direction = 'down'
        velocity.y = 1
        aim.y++
      } else if (direction == 'down') {
        direction = 'up'
        velocity.y = -1
        aim.y--
      }
    }

    const stateChange = (value: State, delayed = false) => {
      if (delayed && !['scatter', 'chase'].includes(state)) {
        delayedState = value
        return
      }

      const oldState = state
      state = value
      if (state === 'scatter') {
        flip180()
        target.x = ghosts[kind].scatterTarget.x
        target.y = ghosts[kind].scatterTarget.y
      }
      if (state === 'chase') {
        flip180()
      }
      if (state === 'frightened') {
        if (frightenedDuration <= 0) {
          state = oldState
        } else {
          frightenedTimer = frightenedDuration
          flip180()
        }
      }
      if (state === 'eaten') {
        target.x = gateTarget.x
        target.y = gateTarget.y
        movementPhase = 0
      }
      if (state === 'departure') {
        movementPhase = 0
      }
      if (state === 'idle') {
        position.x = ghosts[kind].gatedTarget.x
        position.y = ghosts[kind].gatedTarget.y
        if (kind === 'blinky') {
          position.x = gateTarget.x
          position.y = gateTarget.y
        }
      }
    }

    let showTarget = false
    let showAim = false
    let showCollider = false
    let showDebug = false
    const probe = observable<string | undefined>()

    kind === 'clyde' &&
      map.onGhostSpawned((kind) => {
        if (kind === 'inky' && spawnTimer < 0) {
          spawnTimer = time + -1 * spawnTimer
        }
      })

    const enterCruiseElroyMode = () => {
      cruiseElroyMode = 1
      cycle = cycleMap.length - 2
      cycleChange()
    }

    kind === 'blinky' &&
      map.onPelletEaten(() => {
        if (
          cruiseElroyMode === 0 &&
          ghosts.blinky.cruiseElroy.isInMode1(level, map.remainingPellets)
        ) {
          enterCruiseElroyMode()
        } else if (
          cruiseElroyMode === 1 &&
          ghosts.blinky.cruiseElroy.isInMode2(level, map.remainingPellets)
        ) {
          cruiseElroyMode = 2
        }
      })

    const beginCycle = () => {
      cycle = 0
      stateChange(cycleMap[cycle][0], true)
      cycleTimer = cycleMap[cycle][1]
    }
    const cycleChange = () => {
      cycle++
      if (cycle < cycleMap.length) {
        stateChange(cycleMap[cycle][0], true)
        cycleTimer = cycleMap[cycle][1]
      } else {
        cycleTimer = 0
      }
    }

    return {
      position,
      target: aim,
      collider,
      get state() {
        return state
      },
      set state(value) {
        if (state === value) {
          return
        }
        stateChange(value)
      },
      reset: (options: { level: number; revived: boolean }) => {
        level = options.level
        animationFrame = 0
        animationTimer = 0
        frightenedTimer = 0
        movementPhase = 0
        spawnTimer = 0
        time = 0
        cycle = 0
        cycleTimer = 0
        cruiseElroyMode = options.revived ? cruiseElroyMode : 0
        cruiseElroyTimeout = cruiseElroyMode > 0 && options.revived ? revivedCruiseElroyTimeout : 0
        const levelProperty = levelProperties.get(
          Array.from(levelProperties.keys())
            .reverse()
            .find((level) => level <= options.level) ?? 1
        )
        cycleMap = levelProperty?.cycles ?? []
        speedMultiplier = levelProperty?.speedMultiplier ?? 1
        frightenedDuration = getFrightenedDuration(level)
        spawnTimer =
          options.revived && levelProperty?.spawnTimeRevived
            ? levelProperty.spawnTimeRevived
            : levelProperty?.spawnTime ?? 0

        if (kind === 'clyde') {
          spawnTimer *= -1
        }
        beginCycle()

        time = 0
        state = 'gated'
        position.x = ghosts[kind].gatedTarget.x
        position.y = ghosts[kind].gatedTarget.y

        if (kind === 'blinky') {
          position.x = gateTarget.x
          position.y = gateTarget.y
          direction = 'right'
          velocity.x = 1
          velocity.y = 0
          aim.x = Math.floor(gateTarget.x)
          aim.y = position.y
          stateChange('scatter')
          map.spawnGhost(kind)
        } else if (kind === 'pinky') {
          direction = 'down'
          aim.x = target.x = position.x
          aim.y = target.y = position.y + 0.5
          velocity.x = 0
          velocity.y = 1
        } else {
          direction = 'up'
          aim.x = target.x = position.x
          aim.y = target.y = position.y - 0.5
          velocity.x = 0
          velocity.y = -1
        }

        delayedState = undefined
      },
      onRender: () => {
        render.drawSprite(
          states[state].sprite(),
          position.x * tileSize - tileSize / 2,
          position.y * tileSize - tileSize / 2,
          tiles.tileSize,
          tiles.tileSize
        )

        if (showAim) {
          render.drawRect(
            '#ffff00',
            4,
            aim.x * tileSize,
            aim.y * tileSize,
            tiles.tileSize / 2,
            tiles.tileSize / 2
          )
        }

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

        if (showCollider) {
          render.drawCircle('#00ff00', 2, collider.x, collider.y, collider.radius)
        }

        if (showDebug) {
          const x = ['pinky', 'clyde'].includes(kind) ? 0 : 23
          const y = ['pinky', 'blinky'].includes(kind) ? 11 : 17
          render.drawText(
            '10px monospace',
            '#ffffff',
            `${kind}: ${state}`,
            x * tileSize + 4,
            y * tileSize - 4
          )
          render.drawText(
            '10px monospace',
            '#ffffff',
            `c: ${cycle}  t: ${Math.round(cycleTimer)}`,
            x * tileSize + 4,
            y * tileSize + 5
          )
          render.drawText(
            '10px monospace',
            '#ffffff',
            `→ ${round2DecimalPlaces(momentum)} ${cruiseElroyMode > 0 ? `(CR${cruiseElroyMode})` : ''}`,
            x * tileSize + 4,
            y * tileSize + 13
          )
          if (delayedState) {
            render.drawText(
              '10px monospace',
              '#ffffff',
              `delayed: ${delayedState}`,
              x * tileSize + 4,
              y * tileSize + 21
            )
          }
        }
      },
      onUpdate: (elapsed: number) => {
        if (state === 'idle') {
          return
        }

        time += elapsed
        animationTimer += elapsed

        if (cruiseElroyTimeout > 0) {
          cruiseElroyTimeout -= elapsed
          if (cruiseElroyTimeout < 0) {
            cruiseElroyTimeout = 0
            enterCruiseElroyMode()
          }
        }

        if (cycleTimer > 0) {
          cycleTimer -= elapsed
          if (cycleTimer < 0) {
            cycleChange()
          }
        }

        states[state].update(elapsed)

        if (animationTimer >= animationSpeed) {
          animationTimer = 0
          states[state].animate()
        }
      },
      toggleAim: () => (showAim = !showAim),
      toggleTarget: () => (showTarget = !showTarget),
      toggleCollider: () => (showCollider = !showCollider),
      toggleDebug: () => (showDebug = !showDebug),
      printDebug: () => {
        console.log(map.remainingPellets, Math.min(244 - 60, 20 + (level - 1) * 8))
      },
      onProbe: probe.subscribe
    }
  }

export type Ghost = ReturnType<ReturnType<typeof ghost>>
