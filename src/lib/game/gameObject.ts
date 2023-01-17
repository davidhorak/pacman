import type { Engine } from '../engine/engine'
import type { Vector2D } from '../engine/physics/Vector2D'

export interface GameObject {
  position: Vector2D
  onRender: Parameters<Engine['onRender']>[0]
  onUpdate: Parameters<Engine['onUpdate']>[0]
}
