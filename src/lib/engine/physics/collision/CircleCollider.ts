export interface CircleCollider {
  x: number
  y: number
  radius: number
}

export const isCircleCollider = (collider: object): collider is CircleCollider =>
  'radius' in collider
