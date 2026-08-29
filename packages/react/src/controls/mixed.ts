export const MIXED = Symbol('mixed')
export type MixedValue<T> = T | typeof MIXED
