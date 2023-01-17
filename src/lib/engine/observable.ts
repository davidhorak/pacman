export const observable = <T>() => {
  const observers = new Map<symbol, (subject: T) => void>()
  return {
    subscribe: (observer: (subject: T) => void) => {
      const key = Symbol()
      observers.set(key, observer)
      return key
    },
    unsubscribe: (key: symbol) => {
      observers.delete(key)
    },
    broadcast: (subject: T) => {
      for (const observer of observers.values()) {
        observer(subject)
      }
    }
  }
}
