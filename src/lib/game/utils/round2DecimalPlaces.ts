export const round2DecimalPlaces = (input: number) => Math.round(input * 100 + Number.EPSILON) / 100
