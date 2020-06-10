import { ThoughtsInterface } from './initialState'

/** Merges two thought interfaces, preserving extraneous keys. */
export const mergeThoughts = (thoughtsA: ThoughtsInterface, thoughtsB: ThoughtsInterface): ThoughtsInterface => ({
  ...thoughtsA,
  ...thoughtsB,
  contextIndex: {
    ...thoughtsA.contextIndex,
    ...thoughtsB.contextIndex,
  },
  thoughtIndex: {
    ...thoughtsA.thoughtIndex,
    ...thoughtsB.thoughtIndex,
  }
})
