export interface BoxCollider {
  x: number
  y: number
  width: number
  height: number
}

export const isBoxCollider = (collider: object): collider is BoxCollider => 'width' in collider
