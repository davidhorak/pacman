import type { Engine } from '../engine/engine'
import { observable } from '../engine/observable'
import type { Sprite } from '../engine/render/Sprite'
import type { Tiles } from '../engine/render/tiles'
import type { FruitData, Fruits } from './fruit'
import { fruit as createFruit, fruits } from './fruit'
import type { Pellet } from './pellet'
import { pellet } from './pellet'

const prescription = `
  ╔════════════╕╒════════════╗
  ║++++++++++++│╎++++++++++++┆
  ║+┌──┐+┌───┐+│╎+┌───┐+┌──┐+┆
  ║@│##╎+│###╎+│╎+│###╎+│##╎@┆
  ║+└╌╌┘+└╌╌╌┘+└┘+└╌╌╌┘+└╌╌┘+┆
  ║++++++++++++++++++++++++++┆
  ║+┌──┐+┌┐+┌──────┐+┌┐+┌──┐+┆
  ║+└╌╌┘+│╎+└╌╌┐┌╌╌┘+│╎+└╌╌┘+┆
  ║++++++│╎++++│╎++++│╎++++++┆
  ╚┄┄┄┄┐+│└──┐0│╎0┌──┘╎+┌┄┄┄┄╝
  #####║+│┌╌╌┘T└┘T└╌╌┐╎+┆#####
  #####║+│╎0000000000│╎+┆#####
  #####║+│╎0╓┄┄GG┄┄╖0│╎+┆#####
  ═════┘+└┘0┆000000║0└┘+└═════
  L00000+000┆000000║000+00000R
  ┄┄┄┄┄┐+┌┐0┆000000║0┌┐+┌┄┄┄┄┄
  #####║+│╎0╙══════╜0│╎+┆#####
  #####║+│╎0000000000│╎+┆#####
  #####║+│╎0┌──────┐0│╎+┆#####
  ╔════┘+└┘0└╌╌┐┌╌╌┘0└┘+└════╗
  ║++++++++++++│╎++++++++++++┆
  ║+┌──┐+┌───┐+│╎+┌───┐+┌──┐+┆
  ║+└╌┐╎+└╌╌╌┘T└┘T└╌╌╌┘+│┌╌┘+┆
  ║@++│╎++++++++++++++++│╎++@┆
  ┗─┐+│╎+┌┐+┌──────┐+┌┐+│╎+┌─┛
  ┏╌┘+└┘+│╎+└╌╌┐┌╌╌┘+│╎+└┘+└╌┓
  ║++++++│╎++++│╎++++│╎++++++┆
  ║+┌────┘└──┐+│╎+┌──┘└────┐+┆
  ║+└╌╌╌╌╌╌╌╌┘+└┘+└╌╌╌╌╌╌╌╌┘+┆
  ║++++++++++++++++++++++++++┆
  ╚┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╝
  `
  .replace(/\s/g, '')
  .split('')

const walkable = ['+', '@', '0', 'T', 'L', 'R']

const tileMap = new Map<string, [number, number]>(
  Object.entries({
    '╔': [16, 0],
    '╗': [17, 0],
    '╚': [16, 1],
    '╝': [17, 1],
    '═': [18, 0],
    '┆': [19, 0],
    '┄': [18, 1],
    '║': [19, 1],
    '╕': [20, 0],
    '╒': [21, 0],
    '╛': [20, 1],
    '╘': [21, 1],
    '┌': [22, 0],
    '┐': [23, 0],
    '└': [22, 1],
    '┘': [23, 1],
    '─': [24, 0],
    '╎': [25, 0],
    '╌': [24, 1],
    '│': [25, 1],
    '╓': [26, 0],
    '╖': [27, 0],
    '╙': [26, 1],
    '╜': [27, 1],
    '┗': [28, 0],
    '┛': [29, 0],
    '┏': [28, 1],
    '┓': [29, 1],
    G: [30, 0]
  })
)

const mapDebug: Record<string, string> = {
  '#': 'rgba(255, 0, 0, 0.5)',
  '+': 'rgba(255, 255, 0, 0.5)',
  '0': 'rgba(255, 255, 0, 0.5)',
  '@': 'rgba(150, 50, 200, 0.7)',
  L: 'rgba(150, 50, 200, 0.7)',
  R: 'rgba(150, 50, 200, 0.7)',
  G: 'rgba(70, 200, 50, 0.7)',
  T: 'rgba(30, 100, 150, 0.7)'
}

export const map =
  ({
    render,
    tiles,
    tileSize,
    mapTileSize
  }: {
    render: Engine['render']
    tiles: Tiles
    tileSize: number
    mapTileSize: number
  }) =>
  (width: number, height: number) => {
    const map = prescription
      .map((kind, i) => {
        const x = i % width
        const y = Math.floor(i / width)
        const tile = tileMap.get(kind)
        return [tile ? tiles.getTile(tile[0] / 2, tile[1] / 2, 0.5, 0.5) : undefined, x, y]
      })
      .filter<[Sprite, number, number]>((item): item is [Sprite, number, number] => !!item[0])
    const mapCelebration = map.map(([sprite]) =>
      tiles.getTile(sprite.x / tileSize, sprite.y / tileSize + 1, 0.5, 0.5)
    )

    const createPellet = pellet({ render, tileSize: mapTileSize })
    const pellets = new Map<number, Pellet>(
      prescription
        .map((kind, i) =>
          kind === '+' || kind === '@'
            ? [i, createPellet(Math.floor(i % width), Math.floor(i / width), kind === '@')]
            : undefined
        )
        .filter((pellet): pellet is [number, Pellet] => !!pellet)
      // .slice(0, 10)
    )
    const fruit = createFruit({ render, tiles, tileSize })(13 * mapTileSize, 16.5 * mapTileSize)
    const onGhostSpawned = observable<string>()
    const onPelletEaten = observable<[number, boolean]>()
    const onCompleted = observable<void>()
    const onCelebrationComplete = observable<void>()
    const celebrationTime = 3000
    let eatenPellets = 0
    let level = 0
    let fruitSpawned = 0
    let fruitKind: Fruits = 'cherry'
    let celebrationTimer = 0

    let showGuide = false

    const flashes = () =>
      celebrationTimer > 0 &&
      [
        [500, 1000],
        [1500, 2000],
        [2500, 3000]
      ].some(([left, right]) => celebrationTimer >= left && celebrationTimer <= right)

    return {
      width,
      height,
      fruit,
      get totalPellets() {
        return pellets.size
      },
      get eatenPellets() {
        return eatenPellets
      },
      get remainingPellets() {
        return pellets.size - eatenPellets
      },
      onUpdate: (elapsed: number) => {
        if (celebrationTimer > 0) {
          celebrationTimer -= elapsed
          if (celebrationTimer < 0) {
            celebrationTimer = 0
            onCelebrationComplete.broadcast()
          }
          return
        }
        pellets.forEach((pellet) => pellet.onUpdate(elapsed))
        fruit.onUpdate(elapsed)
      },
      onRender: () => {
        render.drawRectFilled('#000000', 0, 0, width * mapTileSize, height * mapTileSize)

        map.forEach(([sprite, x, y], i) => {
          render.drawSprite(
            flashes() ? mapCelebration[i] : sprite,
            x * mapTileSize,
            y * mapTileSize,
            mapTileSize,
            mapTileSize
          )
        })

        if (showGuide) {
          for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
              const kind = prescription[r * width + c]
              if (mapDebug[kind]) {
                render.drawRectFilled(
                  mapDebug[kind],
                  c * mapTileSize,
                  r * mapTileSize,
                  mapTileSize,
                  mapTileSize
                )
              }
            }
          }
          render.drawText(
            '10px monospace',
            '#ffffff',
            `level: ${level}`,
            mapTileSize * 14,
            mapTileSize * 25 - 6,
            true
          )
          render.drawText(
            '10px monospace',
            '#ffffff',
            `pellets: ${eatenPellets}/${pellets.size}`,
            mapTileSize * 14,
            mapTileSize * 25 + 4,
            true
          )
        }

        pellets.forEach((pellet) => pellet.onRender())
        fruit.onRender()
      },
      cell: (x: number, y: number) => {
        const i = Math.round(y) * width + Math.round(x)
        return {
          isWall: !walkable.includes(prescription[i]),
          isGate: prescription[i] === 'G',
          isVirtualWall: prescription[i] === 'T',
          pellet: pellets.get(i),
          teleport: prescription[i] === 'L' ? -1 : prescription[i] === 'R' ? 1 : 0
        }
      },
      eatPellet: (pellet: Pellet) => {
        pellet.active = false
        eatenPellets++
        onPelletEaten.broadcast([pellet.points, pellet.isPowerPellet])
        if (fruitSpawned === 0 && eatenPellets >= 70) {
          fruit.active = true
          fruitSpawned = 1
        } else if (fruitSpawned === 1 && fruit.active === false && eatenPellets >= 170) {
          fruit.active = true
          fruitSpawned = 2
        }
        if (eatenPellets === pellets.size) {
          onCompleted.broadcast()
        }
      },
      spawnGhost: (kind: string) => onGhostSpawned.broadcast(kind),
      reset: (options: { level: number }) => {
        pellets.forEach((pellet) => pellet.reset())
        fruit.active = false
        fruitKind =
          Object.entries(fruits)
            .reverse()
            .find<[Fruits, FruitData]>(
              (data): data is [Fruits, FruitData] => options.level >= data[1].level
            )?.[0] ?? 'cherry'
        fruit.kind = fruitKind
        eatenPellets = 0
        level = options.level
      },
      celebrate: () => {
        celebrationTimer = celebrationTime
      },
      onCelebrationComplete: onCelebrationComplete.subscribe,
      onGhostSpawned: onGhostSpawned.subscribe,
      onPelletEaten: onPelletEaten.subscribe,
      onCompleted: onCompleted.subscribe,
      toggleGuide: () => {
        showGuide = !showGuide
        fruit.toggleDebug()
      },
      toggleCollider: () => fruit.toggleCollider()
    }
  }

export type Map = ReturnType<ReturnType<typeof map>>
