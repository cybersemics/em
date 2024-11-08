import ThoughtIndices from '../@types/ThoughtIndices'

/** Merges multiple thought interfaces, preserving extraneous keys. */
const mergeThoughts = (...thoughtsArgs: ThoughtIndices[]): ThoughtIndices =>
  thoughtsArgs.length <= 1
    ? thoughtsArgs[0] || {}
    : mergeThoughts(
        {
          ...thoughtsArgs[0],
          ...thoughtsArgs[1],
          thoughtIndex: {
            ...thoughtsArgs[0].thoughtIndex,
            ...thoughtsArgs[1].thoughtIndex,
          },
          lexemeIndex: {
            ...thoughtsArgs[0].lexemeIndex,
            ...thoughtsArgs[1].lexemeIndex,
          },
        },
        ...thoughtsArgs.slice(2),
      )

export default mergeThoughts
