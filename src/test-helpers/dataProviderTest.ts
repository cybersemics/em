import _ from 'lodash'
import all from 'it-all'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN } from '../constants'
import getDescendantThoughts from '../data-providers/data-helpers/getDescendantThoughts'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import getContext from '../data-providers/data-helpers/getContext'
import getLexeme from '../data-providers/data-helpers/getLexeme'
import getParent from '../data-providers/data-helpers/getParent'

import { hashThought, keyValueBy, mergeThoughts, never, reducerFlow, timestamp } from '../util'
import { DataProvider } from '../data-providers/DataProvider'
import { importText } from '../reducers'
import { initialState } from '../util/initialState'
import { getSessionId } from '../util/sessionManager'
import { Context, Lexeme, Parent, ThoughtId } from '../@types'

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
    .map(parent => parent!.id)

  return all(getManyDescendants(provider, thoughtIds, initialState(), options))
}

expect.extend({
  /** Passes if a Context appears before another Context in the Parents array. */
  toHaveOrderedContexts: async (
    parents: Parent[],
    provider: DataProvider,
    context1: Context,
    context2: Context,
  ): Promise<jest.CustomMatcherResult> => {
    // TODO: Maybe just use unique value instead of context
    const [thought1, thought2] = await Promise.all([
      ...[context1, context2].map(context => getContext(provider, context)),
    ])
    /** Finds the index of a context within the contexts array. */
    const indexOfContext = (thought: Parent) => parents.findIndex(parent => parent.id === thought.id)

    const index1 = indexOfContext(thought1!)
    const index2 = indexOfContext(thought2!)

    return index1 === -1
      ? {
          pass: false,
          message: () => `expected ${JSON.stringify(context1)} to be in the given parents array`,
        }
      : index2 === -1
      ? {
          pass: false,
          message: () => `expected ${JSON.stringify(context2)} to be in the given parents array`,
        }
      : index1 >= index2
      ? {
          pass: false,
          message: () =>
            `expected ${JSON.stringify(context1)} to appear before ${JSON.stringify(
              context2,
            )} in the given parents array`,
        }
      : {
          pass: true,
          message: () =>
            `expected ${JSON.stringify(context1)} to not appear before ${JSON.stringify(
              context2,
            )} in the given parents array`,
        }
  },
})

/** Import text into the root of a blank initial state. */
const importThoughts = (text: string) => {
  const stateNew = importText(initialState(), { text })
  return {
    contextIndex: stateNew.thoughts.contextIndex,
    thoughtIndex: stateNew.thoughts.thoughtIndex,
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
    const { thoughtIndex } = importThoughts(`
      - x
        - y
    `)

    const thoughtX = thoughtIndex[hashThought('x')]
    const thoughtY = thoughtIndex[hashThought('y')]
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
    const nocontext = await getParent(provider, 'test' as ThoughtId)
    expect(nocontext).toBeUndefined()

    const parentEntry = {
      id: 'test',
      children: ['child1', 'child2', 'child3'],
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'x',
      parentId: 'parentId',
      rank: 0,
    } as Parent

    await provider.updateContext('test' as ThoughtId, parentEntry)

    const dbContext = await getParent(provider, 'test' as ThoughtId)
    expect(dbContext).toEqual(parentEntry)
  })

  test('getContextsByIds', async () => {
    const parentEntryX: Parent = {
      id: 'testIdX' as ThoughtId,
      children: ['child1', 'child2'] as ThoughtId[],
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'x',
      rank: 0,
      parentId: 'parent1' as ThoughtId,
    }

    const parentEntryA: Parent = {
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

  test('updateThoughtIndex', async () => {
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

    await provider.updateThoughtIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await getLexeme(provider, thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await getLexeme(provider, thoughtY.value)
    expect(dbThought2).toEqual(thoughtY)
  })

  test('updateContextIndex', async () => {
    const parentEntryX = {
      id: 'idX',
      children: ['childId1', 'childId2', 'childId3'],
      value: 'x',
      parentId: 'parent1',
      rank: 0,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Parent

    const parentEntryY = {
      id: 'idY',
      children: ['childId1', 'childId2', 'childId3'],
      value: 'y',
      rank: 1,
      parentId: 'parent2',
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Parent

    await provider.updateContextIndex({
      idX: parentEntryX,
      idY: parentEntryY,
    })

    const contextX = await getParent(provider, 'idX' as ThoughtId)
    expect(contextX).toEqual(parentEntryX)

    const contextY = await getParent(provider, 'idY' as ThoughtId)
    expect(contextY).toEqual(parentEntryY)
  })

  describe('getDescendantThoughts', () => {
    test('default', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
          - x
            - y
              - z
            - a
              - b
        `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(_.omit(contextIndex, EM_TOKEN, ABSOLUTE_TOKEN))

      // do not match em context, since we are just asserting the imported thoughts
      const thoughtIndexWithoutEm = _.omit(thoughtIndex, hashThought(EM_TOKEN), hashThought(ABSOLUTE_TOKEN))

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(thoughtIndexWithoutEm)
    })

    test('unroot descendant contexts', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(_.omit(contextIndex, EM_TOKEN, ABSOLUTE_TOKEN))

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(thoughtIndexLocalWithoutIds)
    })

    test('maxDepth: 1', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
              - m
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX!.id, initialState(), { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        [thoughtX.id]: contextIndex[thoughtX.id],
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
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(_.pick(thoughtIndex, ['x', 'y'].map(hashThought)))
    })

    test('maxDepth: 2', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
              - m
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!
      const thoughtZ = (await getContext(provider, ['x', 'y', 'z']))!

      // only fetch 2 levels of descendants
      const thoughtChunks = await all(getDescendantThoughts(provider, thoughtX.id, initialState(), { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, [thoughtX.id, thoughtY.id]),
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
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(_.pick(thoughtIndex, ['x', 'y', 'z'].map(hashThought)))
    })

    test('do not buffer leaves', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX.id, initialState(), { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        [thoughtX.id]: contextIndex[thoughtX.id],
        [thoughtY.id]: {
          ...contextIndex[thoughtY.id],
          children: [],
          lastUpdated: never(),
          pending: true,
        },
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(_.pick(thoughtIndex, ['x', 'y'].map(hashThought)))
    })

    test('yield thoughts breadth-first', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
              - 0
        - t
          - u
            - v
              - w
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState()))

      // flatten the thought chunks
      // preserve chunk order
      // contexts within a chunk are unordered
      const parents = thoughtChunks.map(({ contextIndex }) => Object.values(contextIndex)).flat()

      // siblings may be unordered
      await expect(parents).toHaveOrderedContexts(provider, ['x'], ['x', 'y'])
      await expect(parents).toHaveOrderedContexts(provider, ['t'], ['x', 'y'])
      await expect(parents).toHaveOrderedContexts(provider, ['t', 'u'], ['x', 'y', 'z'])
    })
  })

  describe('getManyDescendants', () => {
    test('default', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
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

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']])
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(
        _.pick(
          contextIndex,
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
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y', 'z', 't', 'm', 'u', 'v', 'm', 'n'].map(hashThought)),
      )
    })

    test('maxDepth', async () => {
      const { contextIndex, thoughtIndex } = importThoughts(`
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

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const [thoughtZ, thoughtV] = await Promise.all([
        getContext(provider, ['x', 'y', 'z']),
        getContext(provider, ['t', 'u', 'v']),
      ])

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, ...(await getThoughtIdsForContexts(provider, [['x'], ['x', 'y'], ['t'], ['t', 'u']]))),
        [thoughtZ!.id]: {
          ...contextIndex[thoughtZ!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        [thoughtV!.id]: {
          ...contextIndex[thoughtV!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext(['x', 'y', 'z', 'm'])]: contextIndex[hashContext(['x', 'y', 'z', 'm'])],
        // [hashContext(['t', 'u', 'v', 'm', 'n'])]: contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(_.pick(thoughtIndex, ['x', 'y', 'z', 't', 'u', 'v'].map(hashThought)))
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

      const { contextIndex, thoughtIndex } = stateNew.thoughts

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], [EM_TOKEN]], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const thoughtZ = await getContext(provider, ['x', 'y', 'z'])

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(
          contextIndex,
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
          ...contextIndex[thoughtZ!.id],
          children: [],
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext([EM_TOKEN, 'Settings', 'Theme', 'Dark'])]: contextIndex[hashContext([EM_TOKEN, 'Settings', 'Theme', 'Dark'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, [EM_TOKEN, 'x', 'y', 'z', 'Settings', 'Theme', 'Dark'].map(hashThought)),
      )
    })

    // @MIGRATION-TODO: Currently we are dependent on local state fot checking if the parent context has any meta attributes. This is because parent doesn't have context field anymore.
    // test('ignore maxDepth on metaprogramming attributes', async () => {
    //   const { contextIndex, thoughtIndex } = importThoughts(`
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

    //   await provider.updateContextIndex(contextIndex)
    //   await provider.updateThoughtIndex(thoughtIndex)

    //   const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']], { maxDepth: 2 })
    //   const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

    //   const [thoughtZ, thoughtV] = await Promise.all([
    //     getContext(provider, ['x', 'y', 'z']),
    //     getContext(provider, ['t', 'u', 'v']),
    //   ])

    //   expect(thoughts.contextIndex).toEqual({
    //     ..._.pick(
    //       contextIndex,
    //       ...(await getThoughtIdsForContexts(provider, [
    //         ['x'],
    //         ['x', 'y'],
    //         ['x', 'y', 'z', '=note'],
    //         ['t'],
    //         ['t', 'u'],
    //       ])),
    //     ),
    //     [thoughtZ!.id]: {
    //       ...contextIndex[thoughtZ!.id],
    //       children: [
    //         // take the =note Child from contextIndex so that ids match
    //         contextIndex[hashContext(['x', 'y', 'z'])].children.find(child => isFunction(child.value)),
    //       ],
    //       pending: true,
    //       lastUpdated: never(),
    //       updatedBy: getSessionId(),
    //     },
    //     [hashContext(['t', 'u', 'v'])]: {
    //       ...contextIndex[hashContext(['t', 'u', 'v'])],
    //       children: [],
    //       pending: true,
    //       lastUpdated: never(),
    //       updatedBy: getSessionId(),
    //     },
    //     // empty contexts are present in local state but not provider state
    //     // [hashContext(['x', 'y', 'z', 'm'])]: contextIndex[hashContext(['x', 'y', 'z', 'm'])],
    //     // [hashContext(['x', 'y', 'z', '=note', 'content'])]: contextIndex[hashContext(['x', 'y', 'z', '=note', 'content'])],
    //     // [hashContext(['t', 'u', 'v', 'm', 'n'])]: contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
    //   })

    //   // support optional id property
    //   // dexie returns an id while firebase does not
    //   const thoughtIndexLocalWithoutIds = keyValueBy(thoughts.thoughtIndex, (key, value) => ({
    //     [key]: _.omit(value, 'id'),
    //   }))

    //   // 'm' is not loaded since ['x', 'y', 'z'] and ['t', 'u', 'v'] are pending
    //   expect(thoughtIndexLocalWithoutIds).toEqual(
    //     _.pick(thoughtIndex, ['x', 'y', 'z', 't', 'u', 'v', '=note', 'content'].map(hashThought)),
    //   )
    // })
  })
}

export default dataProviderTest
