export const toLevelProperties = <T extends Record<string, unknown>>(
  properties: Record<number, T>
) =>
  new Map(
    Object.entries(properties).map(([level, data], i, entries) => {
      if (i > 0) {
        Object.entries(entries[i - 1][1]).forEach(([key, property]) => {
          if (!(key in data)) {
            data = Object.assign(data, { [key]: property })
          }
        })
      }
      return [parseInt(level), data]
    })
  )

export const toLevelProperty = <T>(levelProperties: Map<number, T>, level: number) =>
  levelProperties.get(
    Array.from(levelProperties.keys())
      .reverse()
      .find((atLevel) => atLevel <= level) ?? 1
  )
