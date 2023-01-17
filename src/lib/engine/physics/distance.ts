import type { Vector2D } from './Vector2D'

export const distance = (a: Vector2D, b: Vector2D) =>
  ((x, y) => Math.sqrt(x * x + y * y))(a.x - b.x, a.y - b.y)
