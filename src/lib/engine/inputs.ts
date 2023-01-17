export const inputs = () => {
  const keyStatus = new Map<string, 'held' | 'pressed' | 'released' | 'none'>()

  const handler = (pressed: boolean) => (e: KeyboardEvent) => {
    const status = keyStatus.get(e.key)

    if (pressed && status === 'held') {
      return
    }
    if (pressed && status === 'pressed') {
      keyStatus.set(e.key, 'held')
    } else if (pressed) {
      keyStatus.set(e.key, 'pressed')
    } else {
      keyStatus.set(e.key, 'released')
      window.requestAnimationFrame(() => {
        keyStatus.set(e.key, 'none')
      })
    }
  }

  const reset = () => {
    for (const key of keyStatus.keys()) {
      keyStatus.set(key, 'none')
    }
  }

  document.addEventListener('keydown', handler(true))
  document.addEventListener('keyup', handler(false))
  window.addEventListener('blur', reset)

  return {
    reset,
    key: (key: KeyboardEvent['key']) => keyStatus.get(key) ?? 'none'
  }
}
