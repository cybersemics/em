import { ThoughtsInterface } from './initialState'

/** Merges multiple thought interfaces, preserving extraneous keys. */
export const mergeThoughts = (...thoughtsArgs: ThoughtsInterface[]): ThoughtsInterface =>
  thoughtsArgs.length <= 1
    ? thoughtsArgs[0] || {}
    : mergeThoughts({
      ...thoughtsArgs[0],
      ...thoughtsArgs[1],
      contextIndex: {
        ...thoughtsArgs[0].contextIndex,
        ...thoughtsArgs[1].contextIndex,
      },
      thoughtIndex: {
        ...thoughtsArgs[0].thoughtIndex,
        ...thoughtsArgs[1].thoughtIndex,
      }
    }, ...thoughtsArgs.slice(2))
