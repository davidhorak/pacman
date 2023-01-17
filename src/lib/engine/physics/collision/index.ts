import type { BoxCollider } from './BoxCollider'
import { isBoxCollider } from './BoxCollider'
import type { CircleCollider } from './CircleCollider'
import { isCircleCollider } from './CircleCollider'

export type Collider = BoxCollider | CircleCollider

const mixedCheck = (a: BoxCollider, b: CircleCollider): boolean => {
  let x = b.x
  let y = b.y
  if (b.x < a.x) {
    x = a.x
  } else if (b.x > a.x + a.width) {
    x = a.x + a.width
  }
  if (b.y < a.y) {
    y = a.y
  } else if (b.y > a.y + a.height) {
    y = a.y + a.height
  }

  const dx = b.x - x
  const dy = b.y - y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < b.radius
}

export const collides = (a: Collider, b: Collider) => {
  if (isBoxCollider(a) && isBoxCollider(b)) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    )
  }

  if (isCircleCollider(a) && isCircleCollider(b)) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < a.radius + b.radius
  }

  if (isBoxCollider(a) && isCircleCollider(b)) {
    return mixedCheck(a, b)
  } else if (isBoxCollider(b) && isCircleCollider(a)) {
    return mixedCheck(b, a)
  }
}
