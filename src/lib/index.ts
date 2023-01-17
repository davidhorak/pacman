import { engine } from './engine/engine'
import { collides } from './engine/physics/collision'
import type { Sprite } from './engine/render/Sprite'
import type { Tiles } from './engine/render/tiles'
import type { Ghost } from './game/ghost'
import { ghost as createGhost } from './game/ghost'
import type { Map } from './game/map'
import { map as createMap } from './game/map'
import type { Player } from './game/player'
import { player as createPlayer } from './game/player'
import mainSprite from './game/sprite-main'
import { renderWithOffset } from './game/utils'

export default (development = false) => {
  const tileSize = 32
  const mapTileSize = 16
  const width = 28
  const height = 31
  const barHeight = tileSize + 2
  const lifes = 5
  const ghosts: Ghost[] = []
  const keyTriggers = ['pressed', 'hold']
  const bonusScore = {
    pause: 500,
    multiplier: 1,
    timer: 0,
    color: '',
    points: 0,
    position: { x: 0, y: 0 }
  }
  const ready = {
    pause: 3000,
    timer: 0
  }
  const eatenDelay = 1000
  const nextLevelDelay = 1000
  const fruitSlots = 6

  let life = 1
  let state: 'initializing' | 'ready' | 'running' | 'eaten' | 'gameover' | 'idle' = 'initializing'
  let tiles: Tiles
  let map: Map
  let player: Player
  let score = 0
  let level = 1
  let inputReadTimer = 0
  let lifeSprite: Sprite
  let paused = false
  let ghostMode = false
  let fruits: Sprite[] = []

  const {
    onRender,
    onUpdate,
    render,
    inputs,
    sprites,
    tiles: createTiles
  } = engine({
    width: width * mapTileSize,
    height: height * mapTileSize + barHeight * 2,
    fps: 30
  })

  const renderOffset = renderWithOffset(barHeight, render)

  const reset = () => {
    score = 0
    level = 1
    life = lifes
    map.reset({ level })
    player.reset(level)
    ghosts.forEach((ghost) => ghost.reset({ level, revived: false }))
    ghosts.forEach((ghost) => (ghost.state = 'idle'))
    fruits = [{ ...map.fruit.sprite }]
    player.state = 'idle'
    state = 'ready'
  }

  const start = () => {
    if (state === 'ready') {
      state = 'running'
      player.state = 'chomp'
      ghosts.forEach((ghost) => ghost.reset({ level, revived: map.eatenPellets > 0 }))
    } else if (state === 'gameover') {
      reset()
    }
  }

  const nextLevel = () => {
    paused = true
    setTimeout(() => {
      level++
      map.reset({ level })
      player.reset(level)
      player.state = 'idle'
      ghosts.forEach((ghost) => ghost.reset({ level, revived: false }))
      ghosts.forEach((ghost) => (ghost.state = 'idle'))
      fruits.push({ ...map.fruit.sprite })
      paused = false
      state = 'ready'
    }, nextLevelDelay)
  }

  const eaten = () => {
    paused = true
    life--
    setTimeout(() => {
      paused = false
      if (life == 0) {
        state = 'gameover'
        return
      }

      ghosts.forEach((ghost) => (ghost.state = 'idle'))
      player.reset(level)
      player.state = 'idle'
      state = 'ready'
    }, eatenDelay)
  }

  const probeEvent = (callback: CallableFunction) => (event: string | undefined) => {
    event && console.log(event)
    callback()
  }

  sprites.load(['main', mainSprite, true]).then(() => {
    tiles = createTiles(sprites.get('main'), tileSize)
    lifeSprite = tiles.getTile(2, 0)

    map = createMap({
      render: renderOffset,
      tiles,
      tileSize,
      mapTileSize
    })(width, height)

    player = createPlayer({
      render: renderOffset,
      tiles,
      tileSize: mapTileSize,
      map
    })({
      direction: 'left',
      position: {
        x: 13.5,
        y: 23
      },
      velocity: {
        x: -1,
        y: 0
      },
      target: {
        x: 13,
        y: 23
      }
    })

    const blinky = createGhost({
      render: renderOffset,
      tiles,
      tileSize: mapTileSize,
      map,
      player
    })('blinky')

    ghosts.push(
      blinky,
      createGhost({
        render: renderOffset,
        tiles,
        tileSize: mapTileSize,
        map,
        player,
        blinkyPosition: blinky.position
      })('inky'),
      createGhost({
        render: renderOffset,
        tiles,
        tileSize: mapTileSize,
        map,
        player
      })('pinky'),
      createGhost({
        render: renderOffset,
        tiles,
        tileSize: mapTileSize,
        map,
        player
      })('clyde')
    )

    ghosts.forEach((ghost) => ghost.onProbe(probeEvent(togglePause)))

    map.onPelletEaten(([points, isPowerPellet]) => {
      score += points
      if (isPowerPellet) {
        bonusScore.multiplier = 1
        ghosts.forEach(
          (ghost) => ['scatter', 'chase'].includes(ghost.state) && (ghost.state = 'frightened')
        )
      }
    })
    map.onCompleted(() => {
      state = 'idle'
      player.state = 'idle'
      map.celebrate()
    })
    map.onCelebrationComplete(nextLevel)

    player.onEaten(eaten)

    reset()
  })

  const togglePause = () => (paused = !paused)
  const toggleGhostMode = () => (ghostMode = !ghostMode)

  const onKey =
    (key: string, trigger: string | string[] = 'pressed') =>
    (callback: () => void, immediately = false) => {
      if (!immediately && inputReadTimer > 0) {
        return
      }
      if ((trigger.length && trigger.includes(inputs.key(key))) || inputs.key(key) === trigger) {
        inputReadTimer = immediately ? inputReadTimer : 250
        callback()
      }
    }

  onRender(() => {
    if (state === 'initializing') {
      return
    }

    render.drawRectFilled('#000000', 0, 0, width * tileSize, barHeight)
    render.drawRectFilled(
      '#000000',
      0,
      barHeight + height * mapTileSize,
      width * tileSize,
      barHeight
    )
    render.drawText('22px monospace', '#ffffff', `Score: ${score}`, 8, 22)
    const levelText = `Level: ${level}`
    render.drawText(
      '22px monospace',
      '#ffffff',
      levelText,
      width * mapTileSize - render.measureText(levelText) - 8,
      22
    )
    if (lifeSprite && state !== 'ready' && state !== 'gameover') {
      for (let i = 0; i < life; i++) {
        render.drawSprite(
          lifeSprite,
          8 + i * tileSize + 2,
          barHeight + height * mapTileSize + 2,
          tileSize,
          tileSize
        )
      }

      const fruitDisplayOffset = tileSize * Math.min(fruitSlots, fruits.length)
      for (let i = Math.max(0, fruits.length - fruitSlots), j = 0; i < fruits.length; i++, j++) {
        render.drawSprite(
          fruits[i],
          width * mapTileSize - 2 - (fruitDisplayOffset - j * tileSize) - 2,
          barHeight + height * mapTileSize + 2,
          tileSize,
          tileSize
        )
      }
    }

    map.onRender()

    if (state === 'ready') {
      renderOffset.drawText(
        '22px monospace',
        '#ffff00',
        `READY!`,
        14 * mapTileSize,
        18 * mapTileSize,
        true
      )
      renderOffset.drawText(
        '22px monospace',
        '#ffffff',
        `Press <SPACE> to Start`,
        14 * mapTileSize,
        height * mapTileSize + mapTileSize + 8,
        true
      )
    }

    if (state === 'gameover') {
      renderOffset.drawText(
        '22px monospace',
        '#ff0000',
        `GAME OVER`,
        14 * mapTileSize,
        18 * mapTileSize,
        true
      )
      renderOffset.drawText(
        '22px monospace',
        '#ffffff',
        `Press <SPACE> to Restart`,
        14 * mapTileSize,
        height * mapTileSize + mapTileSize + 8,
        true
      )
    }

    if (bonusScore.timer === 0) {
      ghosts.forEach((ghost) => ghost.onRender())
      player.render()
    } else {
      renderOffset.drawText(
        '14px monospace',
        bonusScore.color,
        `${bonusScore.points}`,
        bonusScore.position.x,
        bonusScore.position.y,
        true
      )
    }
  })

  onUpdate((elapsed) => {
    if (state === 'initializing') {
      return
    }

    if (inputReadTimer > 0) {
      inputReadTimer -= elapsed
    }

    if (state === 'ready' || state === 'gameover') {
      onKey('Spacebar')(start)
      onKey(' ')(start)
    }
    if (state === 'running') {
      onKey('ArrowLeft', keyTriggers)(() => (player.direction = 'left'), true)
      onKey('ArrowRight', keyTriggers)(() => (player.direction = 'right'), true)
      onKey('ArrowUp', keyTriggers)(() => (player.direction = 'up'), true)
      onKey('ArrowDown', keyTriggers)(() => (player.direction = 'down'), true)
    }

    if (development) {
      onKey('p')(togglePause)
      onKey('g')(toggleGhostMode)
      onKey('r')(reset)
      onKey('[')(() =>
        probeEvent(() => {
          level--
          reset()
        })('level down')
      )
      onKey(']')(() => probeEvent(nextLevel)('level up'))
      onKey('d')(() => {
        ghosts.forEach((ghost) => ghost.toggleDebug())
        player.toggleDebug()
      })
      onKey('b')(() => ghosts.forEach((ghost) => ghost.printDebug()))

      onKey('f')(() => {
        bonusScore.multiplier = 1
        ghosts.forEach(
          (ghost) =>
            ['scatter', 'chase'].includes(ghost.state) &&
            (ghost.state = 'frightened')
        )
      })
      onKey('e')(() => ghosts.forEach((ghost) => (ghost.state = 'eaten')))
      onKey('c')(() => ghosts.forEach((ghost) => (ghost.state = 'chase')))
      onKey('i')(() => ghosts.forEach((ghost) => (ghost.state = 'idle')))
      onKey('m')(() => map.toggleGuide())
      onKey('t')(() => {
        ghosts.forEach((ghost) => ghost.toggleTarget())
        player.toggleTarget()
      })
      onKey('a')(() => ghosts.forEach((ghost) => ghost.toggleAim()))
      onKey('x')(() => {
        player.toggleCollider()
        map.toggleCollider()
        ghosts.forEach((ghost) => ghost.toggleCollider())
      })
      onKey('k')(console.clear)
      onKey('/')(() => {
        state = 'eaten'
        player.state = 'eaten'
      })
    }

    if (ready.timer > 0) {
      ready.timer -= elapsed
      if (ready.timer < 0) {
        ready.timer = 0
        state = 'running'
        player.state = 'chomp'
        ghosts.forEach((ghost) => ghost.reset({ level, revived: map.eatenPellets > 0 }))
      }
    }

    if (paused || state === 'ready' || state === 'gameover') {
      return
    }

    if (bonusScore.timer > 0) {
      bonusScore.timer -= elapsed
      if (bonusScore.timer < 0) {
        bonusScore.timer = 0
      }
      return
    }

    if (state != 'eaten') {
      map.onUpdate(elapsed)
      if (state != 'idle') {
        ghosts.forEach((ghost) => ghost.onUpdate(elapsed))
      }
    }
    player.update(elapsed)

    if (player.collider) {
      if (map.fruit.active && collides(player.collider, map.fruit.collider)) {
        score += map.fruit.points
        map.fruit.active = false
        bonusScore.color = '#ffb7ff'
        bonusScore.timer = bonusScore.pause
        bonusScore.points = map.fruit.points
        bonusScore.position.x = map.fruit.x + mapTileSize
        bonusScore.position.y = map.fruit.y + mapTileSize * 1.25
      }
      for (const ghost of ghosts) {
        if (
          ['scatter', 'chase', 'frightened'].includes(ghost.state) &&
          collides(player.collider, ghost.collider)
        ) {
          if (ghost.state === 'frightened') {
            const finalScore = Math.pow(2, bonusScore.multiplier) * 100
            score += finalScore
            ghost.state = 'eaten'
            bonusScore.color = '#00ffff'
            bonusScore.timer = bonusScore.pause
            bonusScore.points = finalScore
            bonusScore.position.x = ghost.position.x * mapTileSize + mapTileSize / 2
            bonusScore.position.y = ghost.position.y * mapTileSize + mapTileSize / 2
            bonusScore.multiplier++
          } else {
            if (!ghostMode) {
              state = 'eaten'
              player.state = 'eaten'
            }
          }
        }
      }
    }
  })
}
