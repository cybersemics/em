import _ from 'lodash'
import all from 'it-all'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN } from '../constants'
import getDescendantThoughts from '../data-providers/data-helpers/getDescendantThoughts'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import getContext from '../data-providers/data-helpers/getContext'
import getLexeme from '../data-providers/data-helpers/getLexeme'
import getThoughtById from '../data-providers/data-helpers/getThoughtById'

import { hashThought, keyValueBy, mergeThoughts, never, reducerFlow, timestamp } from '../util'
import { DataProvider } from '../data-providers/DataProvider'
import { importText } from '../reducers'
import { initialState } from '../util/initialState'
import { getSessionId } from '../util/sessionManager'
import { Context, Lexeme, Thought, ThoughtId } from '../@types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toHaveOrderedContexts(provider: DataProvider, context1: Context, context2: Context): CustomMatcherResult
    }
  }
}

/**
 * Get thought ids for given array of contexts.
 */
const getThoughtIdsForContexts = async (provider: DataProvider, contexts: Context[]) =>
  (await Promise.all(contexts.map(cx => getContext(provider, cx)))).map(thought => thought!.id)

/**
 * Returns many descandants fot the given contexts,.
 */
const getManyDescendantsByContext = async (
  provider: DataProvider,
  contextArray: Context[],
  options?: { maxDepth?: number },
) => {
  const thoughtIds = (await Promise.all(contextArray.map(context => getContext(provider, context))))
    .filter(Boolean)
    .map(thought => thought!.id)

  return all(getManyDescendants(provider, thoughtIds, initialState(), options))
}

expect.extend({
  /** Passes if a Context appears before another Context in the Thoughts array. */
  toHaveOrderedContexts: async (
    thoughts: Thought[],
    provider: DataProvider,
    context1: Context,
    context2: Context,
  ): Promise<jest.CustomMatcherResult> => {
    // TODO: Maybe just use unique value instead of context
    const [thought1, thought2] = await Promise.all([
      ...[context1, context2].map(context => getContext(provider, context)),
    ])
    /** Finds the index of a context within the contexts array. */
    const indexOfContext = (thought: Thought) => thoughts.findIndex(parent => parent.id === thought.id)

    const index1 = indexOfContext(thought1!)
    const index2 = indexOfContext(thought2!)

    return index1 === -1
      ? {
          pass: false,
          message: () => `expected ${JSON.stringify(context1)} to be in the given thoughts array`,
        }
      : index2 === -1
      ? {
          pass: false,
          message: () => `expected ${JSON.stringify(context2)} to be in the given thoughts array`,
        }
      : index1 >= index2
      ? {
          pass: false,
          message: () =>
            `expected ${JSON.stringify(context1)} to appear before ${JSON.stringify(
              context2,
            )} in the given thoughts array`,
        }
      : {
          pass: true,
          message: () =>
            `expected ${JSON.stringify(context1)} to not appear before ${JSON.stringify(
              context2,
            )} in the given thoughts array`,
        }
  },
})

/** Import text into the root of a blank initial state. */
const importThoughts = (text: string) => {
  const stateNew = importText(initialState(), { text })
  return {
    thoughtIndex: stateNew.thoughts.thoughtIndex,
    lexemeIndex: stateNew.thoughts.lexemeIndex,
  }
}

/** Runs tests for a module that conforms to the data-provider API. */
const dataProviderTest = (provider: DataProvider) => {
  test('getThoughtById', async () => {
    const nothought = await provider.getThoughtById('12345')
    expect(nothought).toBeUndefined()

    const lexeme = {
      id: '12345',
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }

    await provider.updateThought('12345', lexeme)

    const dbThought = await provider.getThoughtById('12345')
    expect(dbThought).toEqual(lexeme)
  })

  test('getThoughtsByIds', async () => {
    const { lexemeIndex } = importThoughts(`
      - x
        - y
    `)

    const thoughtX = lexemeIndex[hashThought('x')]
    const thoughtY = lexemeIndex[hashThought('y')]
    await provider.updateThought(hashThought('x'), thoughtX)
    await provider.updateThought(hashThought('y'), thoughtY)

    const dbThoughts = await provider.getThoughtsByIds([hashThought('x'), hashThought('y')])

    expect(dbThoughts).toMatchObject([thoughtX, thoughtY])
  })

  test('updateThought', async () => {
    const nothought = await getLexeme(provider, 'x')
    expect(nothought).toBeUndefined()

    const lexeme: Lexeme = {
      id: hashThought('x'),
      value: 'x',
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }

    await provider.updateThought(lexeme.id!, lexeme)

    const remoteThought = await getLexeme(provider, 'x')
    expect(remoteThought).toEqual(lexeme)
  })

  test('getContext', async () => {
    const nocontext = await getThoughtById(provider, 'test' as ThoughtId)
    expect(nocontext).toBeUndefined()

    const parentEntry = {
      id: 'test',
      children: ['child1', 'child2', 'child3'],
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'x',
      parentId: 'parentId',
      rank: 0,
    } as Thought

    await provider.updateContext('test' as ThoughtId, parentEntry)

    const dbContext = await getThoughtById(provider, 'test' as ThoughtId)
    expect(dbContext).toEqual(parentEntry)
  })

  test('getContextsByIds', async () => {
    const parentEntryX: Thought = {
      id: 'testIdX' as ThoughtId,
      children: ['child1', 'child2'] as ThoughtId[],
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'x',
      rank: 0,
      parentId: 'parent1' as ThoughtId,
    }

    const parentEntryA: Thought = {
      id: 'testIdA' as ThoughtId,
      children: [],
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'a',
      rank: 1,
      parentId: 'parent2' as ThoughtId,
    }

    await provider.updateContext('testIdX' as ThoughtId, parentEntryX)
    await provider.updateContext('testIdA' as ThoughtId, parentEntryA)

    const dbContexts = await provider.getContextsByIds([parentEntryX.id, parentEntryA.id])
    expect(dbContexts).toEqual([parentEntryX, parentEntryA])
  })

  test('updateLexemeIndex', async () => {
    const thoughtX = {
      id: hashThought('x'),
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    }

    await provider.updateLexemeIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await getLexeme(provider, thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await getLexeme(provider, thoughtY.value)
    expect(dbThought2).toEqual(thoughtY)
  })

  test('updateThoughtIndex', async () => {
    const parentEntryX = {
      id: 'idX',
      children: ['childId1', 'childId2', 'childId3'],
      value: 'x',
      parentId: 'parent1',
      rank: 0,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Thought

    const parentEntryY = {
      id: 'idY',
      children: ['childId1', 'childId2', 'childId3'],
      value: 'y',
      rank: 1,
      parentId: 'parent2',
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Thought

    await provider.updateThoughtIndex({
      idX: parentEntryX,
      idY: parentEntryY,
    })

    const contextX = await getThoughtById(provider, 'idX' as ThoughtId)
    expect(contextX).toEqual(parentEntryX)

    const contextY = await getThoughtById(provider, 'idY' as ThoughtId)
    expect(contextY).toEqual(parentEntryY)
  })

  describe('getDescendantThoughts', () => {
    test('default', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
          - x
            - y
              - z
            - a
              - b
        `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual(_.omit(thoughtIndex, EM_TOKEN, ABSOLUTE_TOKEN))

      // do not match em context, since we are just asserting the imported thoughts
      const lexemeIndexWithoutEm = _.omit(lexemeIndex, hashThought(EM_TOKEN), hashThought(ABSOLUTE_TOKEN))

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(lexemeIndexWithoutEm)
    })

    test('unroot descendant contexts', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual(_.omit(thoughtIndex, EM_TOKEN, ABSOLUTE_TOKEN))

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(lexemeIndexLocalWithoutIds)
    })

    test('maxDepth: 1', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
              - m
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX!.id, initialState(), { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual({
        [thoughtX.id]: thoughtIndex[thoughtX.id],
        [thoughtY.id]: {
          id: thoughtY.id,
          children: [],
          lastUpdated: never(),
          updatedBy: getSessionId(),
          pending: true,
          value: 'y',
          rank: 0,
          parentId: thoughtX.id,
        },
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(_.pick(lexemeIndex, ['x', 'y'].map(hashThought)))
    })

    test('maxDepth: 2', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
              - m
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!
      const thoughtZ = (await getContext(provider, ['x', 'y', 'z']))!

      // only fetch 2 levels of descendants
      const thoughtChunks = await all(getDescendantThoughts(provider, thoughtX.id, initialState(), { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual({
        ..._.pick(thoughtIndex, [thoughtX.id, thoughtY.id]),
        // grandchildren are pending
        [thoughtZ.id]: {
          id: thoughtZ.id,
          value: 'z',
          children: [],
          lastUpdated: never(),
          updatedBy: getSessionId(),
          pending: true,
          rank: 0,
          parentId: thoughtY.id,
        },
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(_.pick(lexemeIndex, ['x', 'y', 'z'].map(hashThought)))
    })

    test('do not buffer leaves', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX.id, initialState(), { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual({
        [thoughtX.id]: thoughtIndex[thoughtX.id],
        [thoughtY.id]: {
          ...thoughtIndex[thoughtY.id],
          children: [],
          lastUpdated: never(),
          pending: true,
        },
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(_.pick(lexemeIndex, ['x', 'y'].map(hashThought)))
    })

    test('yield thoughts breadth-first', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
              - 0
        - t
          - u
            - v
              - w
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))

      // flatten the thought chunks
      // preserve chunk order
      // contexts within a chunk are unordered
      const thoughts = thoughtChunks.map(({ thoughtIndex }) => Object.values(thoughtIndex)).flat()

      // siblings may be unordered
      await expect(thoughts).toHaveOrderedContexts(provider, ['x'], ['x', 'y'])
      await expect(thoughts).toHaveOrderedContexts(provider, ['t'], ['x', 'y'])
      await expect(thoughts).toHaveOrderedContexts(provider, ['t', 'u'], ['x', 'y', 'z'])
    })
  })

  describe('getManyDescendants', () => {
    test('default', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
              - m
        - t
          - u
            - v
              - m
                - n
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']])
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual(
        _.pick(
          thoughtIndex,
          ...(await getThoughtIdsForContexts(provider, [
            ['x'],
            ['x', 'y'],
            ['x', 'y', 'z'],
            ['x', 'y', 'z', 'm'],
            ['t'],
            ['t', 'u'],
            ['t', 'u', 'v'],
            ['t', 'u', 'v', 'm'],
            ['t', 'u', 'v', 'm', 'n'],
          ])),
        ),
        // empty contexts are present in local state but not provider state
        // ['x', 'y', 'z', 'm']
        // ['t', 'u', 'v', 'm', 'n']
      )

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(
        _.pick(lexemeIndex, ['x', 'y', 'z', 't', 'm', 'u', 'v', 'm', 'n'].map(hashThought)),
      )
    })

    test('maxDepth', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - z
              - m
        - t
          - u
            - v
              - m
                - n
      `)

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const [thoughtZ, thoughtV] = await Promise.all([
        getContext(provider, ['x', 'y', 'z']),
        getContext(provider, ['t', 'u', 'v']),
      ])

      expect(thoughts.thoughtIndex).toEqual({
        ..._.pick(thoughtIndex, ...(await getThoughtIdsForContexts(provider, [['x'], ['x', 'y'], ['t'], ['t', 'u']]))),
        [thoughtZ!.id]: {
          ...thoughtIndex[thoughtZ!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        [thoughtV!.id]: {
          ...thoughtIndex[thoughtV!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext(['x', 'y', 'z', 'm'])]: thoughtIndex[hashContext(['x', 'y', 'z', 'm'])],
        // [hashContext(['t', 'u', 'v', 'm', 'n'])]: thoughtIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(_.pick(lexemeIndex, ['x', 'y', 'z', 't', 'u', 'v'].map(hashThought)))
    })

    test('ignore maxDepth on EM context', async () => {
      const rootText = `
        - x
          - y
            - z
              - m
      `

      const emText = `
        - Settings
          - Theme
            - Dark
      `

      const stateNew = reducerFlow([importText({ text: rootText }), importText({ path: [EM_TOKEN], text: emText })])(
        initialState(),
      )

      const { thoughtIndex, lexemeIndex } = stateNew.thoughts

      await provider.updateThoughtIndex(thoughtIndex)
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], [EM_TOKEN]], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const thoughtZ = await getContext(provider, ['x', 'y', 'z'])

      expect(thoughts.thoughtIndex).toEqual({
        ..._.pick(
          thoughtIndex,
          ...(await getThoughtIdsForContexts(provider, [
            ['x'],
            ['x', 'y'],
            ['x', 'y', 'z'],
            [EM_TOKEN],
            [EM_TOKEN, 'Settings'],
            [EM_TOKEN, 'Settings', 'Theme'],
            [EM_TOKEN, 'Settings', 'Theme', 'Dark'],
          ])),
        ),
        [thoughtZ!.id]: {
          ...thoughtIndex[thoughtZ!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext([EM_TOKEN, 'Settings', 'Theme', 'Dark'])]: thoughtIndex[hashContext([EM_TOKEN, 'Settings', 'Theme', 'Dark'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(
        _.pick(lexemeIndex, [EM_TOKEN, 'x', 'y', 'z', 'Settings', 'Theme', 'Dark'].map(hashThought)),
      )
    })

    // @MIGRATION-TODO: Currently we are dependent on local state fot checking if the parent context has any meta attributes. This is because parent doesn't have context field anymore.
    // test('ignore maxDepth on metaprogramming attributes', async () => {
    //   const { thoughtIndex, lexemeIndex } = importThoughts(`
    //     - x
    //       - y
    //         - z
    //           - =note
    //             - content
    //           - m
    //     - t
    //       - u
    //         - v
    //           - m
    //             - n
    //   `)

    //   await provider.updateThoughtIndex(thoughtIndex)
    //   await provider.updateLexemeIndex(lexemeIndex)

    //   const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']], { maxDepth: 2 })
    //   const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

    //   const [thoughtZ, thoughtV] = await Promise.all([
    //     getContext(provider, ['x', 'y', 'z']),
    //     getContext(provider, ['t', 'u', 'v']),
    //   ])

    //   expect(thoughts.thoughtIndex).toEqual({
    //     ..._.pick(
    //       thoughtIndex,
    //       ...(await getThoughtIdsForContexts(provider, [
    //         ['x'],
    //         ['x', 'y'],
    //         ['x', 'y', 'z', '=note'],
    //         ['t'],
    //         ['t', 'u'],
    //       ])),
    //     ),
    //     [thoughtZ!.id]: {
    //       ...thoughtIndex[thoughtZ!.id],
    //       children: [
    //         // take the =note Child from thoughtIndex so that ids match
    //         thoughtIndex[hashContext(['x', 'y', 'z'])].children.find(child => isFunction(child.value)),
    //       ],
    //       pending: true,
    //       lastUpdated: never(),
    //       updatedBy: getSessionId(),
    //     },
    //     [hashContext(['t', 'u', 'v'])]: {
    //       ...thoughtIndex[hashContext(['t', 'u', 'v'])],
    //       children: [],
    //       pending: true,
    //       lastUpdated: never(),
    //       updatedBy: getSessionId(),
    //     },
    //     // empty contexts are present in local state but not provider state
    //     // [hashContext(['x', 'y', 'z', 'm'])]: thoughtIndex[hashContext(['x', 'y', 'z', 'm'])],
    //     // [hashContext(['x', 'y', 'z', '=note', 'content'])]: thoughtIndex[hashContext(['x', 'y', 'z', '=note', 'content'])],
    //     // [hashContext(['t', 'u', 'v', 'm', 'n'])]: thoughtIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
    //   })

    //   // support optional id property
    //   // dexie returns an id while firebase does not
    //   const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
    //     [key]: _.omit(value, 'id'),
    //   }))

    //   // 'm' is not loaded since ['x', 'y', 'z'] and ['t', 'u', 'v'] are pending
    //   expect(lexemeIndexLocalWithoutIds).toEqual(
    //     _.pick(lexemeIndex, ['x', 'y', 'z', 't', 'u', 'v', '=note', 'content'].map(hashThought)),
    //   )
    // })
  })
}

export default dataProviderTest
