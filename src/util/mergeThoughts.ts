import { ThoughtsInterface } from '../types'

/** Merges multiple thought interfaces, preserving extraneous keys. */
export const mergeThoughts = (...thoughtsArgs: ThoughtsInterface[]): ThoughtsInterface =>
  thoughtsArgs.length <= 1
    ? thoughtsArgs[0] || {}
    : mergeThoughts({
      ...thoughtsArgs[0],
      ...thoughtsArgs[1],
      contextCache: [
        ...thoughtsArgs[0].contextCache,
        ...thoughtsArgs[1].contextCache,
      ],
      contextIndex: {
        ...thoughtsArgs[0].contextIndex,
        ...thoughtsArgs[1].contextIndex,
      },
      thoughtCache: [
        ...thoughtsArgs[0].thoughtCache,
        ...thoughtsArgs[1].thoughtCache,
      ],
      thoughtIndex: {
        ...thoughtsArgs[0].thoughtIndex,
        ...thoughtsArgs[1].thoughtIndex,
      }
    }, ...thoughtsArgs.slice(2))
