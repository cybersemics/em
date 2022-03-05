import { ThoughtsInterface } from '../@types'

/** Merges multiple thought interfaces, preserving extraneous keys. */
export const mergeThoughts = (...thoughtsArgs: ThoughtsInterface[]): ThoughtsInterface =>
  thoughtsArgs.length <= 1
    ? thoughtsArgs[0] || {}
    : mergeThoughts(
        {
          ...thoughtsArgs[0],
          ...thoughtsArgs[1],
          contextIndex: {
            ...thoughtsArgs[0].contextIndex,
            ...thoughtsArgs[1].contextIndex,
          },
          lexemeIndex: {
            ...thoughtsArgs[0].lexemeIndex,
            ...thoughtsArgs[1].lexemeIndex,
          },
        },
        ...thoughtsArgs.slice(2),
      )
