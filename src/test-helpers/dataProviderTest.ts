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
import { Context, Index, Lexeme, Thought, ThoughtId, ThoughtWithChildren } from '../@types'

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

  return all(getManyDescendants(provider, thoughtIds, initialState, options))
}

/** Converts an Index<Thought> to an Index<ThoughtWithChildren>. */
const toThoughtIndexWithChildren = (thoughtIndex: Index<Thought>): Index<ThoughtWithChildren> =>
  keyValueBy(thoughtIndex, (id, thought) => {
    const thoughtPicked = _.pick(thought, ['id', 'value', 'lastUpdated', 'parentId', 'rank', 'updatedBy'])
    return {
      [id]: {
        ...thoughtPicked,
        children: keyValueBy(thought.childrenMap, (key, childId) => ({
          [childId]: thoughtIndex[childId],
        })),
      },
    }
  })

/** Convert a Thought to a ThoughtWithChildren with all leaves. */
const toThoughtWithChildren = (thought: Thought): ThoughtWithChildren => ({
  ..._.pick(thought, ['id', 'value', 'lastUpdated', 'parentId', 'rank', 'updatedBy']),
  children: keyValueBy(Object.values(thought.childrenMap), (childId, i) => ({
    [childId]: {
      id: childId as ThoughtId,
      value: childId,
      childrenMap: {},
      rank: i,
      parentId: thought.id,
      lastUpdated: thought.lastUpdated,
      updatedBy: thought.updatedBy,
    } as Thought,
  })),
})

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
    const nothought = await provider.getLexemeById('12345')
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

    await provider.updateLexeme('12345', lexeme)

    const dbThought = await provider.getLexemeById('12345')
    expect(dbThought).toEqual(lexeme)
  })

  test('getLexemesByIds', async () => {
    const { lexemeIndex } = importThoughts(`
      - x
        - y
    `)

    const thoughtX = lexemeIndex[hashThought('x')]
    const thoughtY = lexemeIndex[hashThought('y')]
    await provider.updateLexeme(hashThought('x'), thoughtX)
    await provider.updateLexeme(hashThought('y'), thoughtY)

    const dbThoughts = await provider.getLexemesByIds([hashThought('x'), hashThought('y')])

    expect(dbThoughts).toMatchObject([thoughtX, thoughtY])
  })

  test('updateLexeme', async () => {
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

    await provider.updateLexeme(lexeme.id!, lexeme)

    const remoteThought = await getLexeme(provider, 'x')
    expect(remoteThought).toEqual(lexeme)
  })

  test('getContext', async () => {
    const nocontext = await getThoughtById(provider, 'test' as ThoughtId)
    expect(nocontext).toBeUndefined()

    const thought: Thought = {
      id: 'test' as ThoughtId,
      childrenMap: {
        child1: 'child1' as ThoughtId,
        child2: 'child2' as ThoughtId,
        child3: 'child3' as ThoughtId,
      },
      lastUpdated: timestamp(),
      parentId: 'parentId' as ThoughtId,
      rank: 0,
      updatedBy: getSessionId(),
      value: 'test',
    }

    const thoughtWithChildren = toThoughtWithChildren(thought)
    await provider.updateThought('test' as ThoughtId, thoughtWithChildren)

    const dbThought = await getThoughtById(provider, 'test' as ThoughtId)
    expect(dbThought).toEqual(thought)
  })

  test('getThoughtsByIds', async () => {
    const thoughtX: Thought = {
      id: 'testIdX' as ThoughtId,
      childrenMap: {
        child1: 'child1' as ThoughtId,
        child2: 'child2' as ThoughtId,
      },
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'x',
      rank: 0,
      parentId: 'parent1' as ThoughtId,
    }

    const thoughtA: Thought = {
      id: 'testIdA' as ThoughtId,
      childrenMap: {},
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
      value: 'a',
      rank: 1,
      parentId: 'parent2' as ThoughtId,
    }

    const thoughtXWithChildren = toThoughtWithChildren(thoughtX)
    const thoughtAWithChildren = toThoughtWithChildren(thoughtA)

    await provider.updateThought('testIdX' as ThoughtId, thoughtXWithChildren)
    await provider.updateThought('testIdA' as ThoughtId, thoughtAWithChildren)

    const dbThoughts = await provider.getThoughtsByIds([thoughtX.id, thoughtA.id])
    expect(dbThoughts).toEqual([thoughtX, thoughtA])
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
    const thoughtX = {
      id: 'idX' as ThoughtId,
      childrenMap: {
        child1: 'child1' as ThoughtId,
        child2: 'child2' as ThoughtId,
        child3: 'child3' as ThoughtId,
      },
      value: 'x',
      parentId: 'parent1' as ThoughtId,
      rank: 0,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Thought

    const thoughtY = {
      id: 'idY' as ThoughtId,
      childrenMap: {
        child4: 'child4' as ThoughtId,
        child5: 'child5' as ThoughtId,
        child6: 'child6' as ThoughtId,
      },
      value: 'y',
      rank: 1,
      parentId: 'parent2' as ThoughtId,
      lastUpdated: timestamp(),
      updatedBy: getSessionId(),
    } as Thought

    const thoughtXWithChildren = {
      ...thoughtX,
      children: {
        child1: {
          id: 'child1' as ThoughtId,
          value: 'child1',
          childrenMap: {},
          rank: 0,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
        child2: {
          id: 'child2' as ThoughtId,
          value: 'child2',
          childrenMap: {},
          rank: 1,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
        child3: {
          id: 'child3' as ThoughtId,
          value: 'child3',
          childrenMap: {},
          rank: 2,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
      },
    }

    const thoughtYWithChildren = {
      ...thoughtY,
      children: {
        child1: {
          id: 'child4' as ThoughtId,
          value: 'child4',
          childrenMap: {},
          rank: 0,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
        child2: {
          id: 'child5' as ThoughtId,
          value: 'child5',
          childrenMap: {},
          rank: 1,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
        child3: {
          id: 'child6' as ThoughtId,
          value: 'child6',
          childrenMap: {},
          rank: 2,
          parentId: 'test' as ThoughtId,
          lastUpdated: timestamp(),
          updatedBy: getSessionId(),
        },
      },
    }

    await provider.updateThoughtIndex({
      idX: thoughtXWithChildren,
      idY: thoughtYWithChildren,
    })

    const contextX = await getThoughtById(provider, 'idX' as ThoughtId)
    expect(contextX).toEqual(thoughtX)

    const contextY = await getThoughtById(provider, 'idY' as ThoughtId)
    expect(contextY).toEqual(thoughtY)
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
      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const importedThoughtsWithoutPendingRoot = {
        ...thoughts.thoughtIndex,
        [HOME_TOKEN]: _.omit(thoughts.thoughtIndex[HOME_TOKEN], 'pending'),
      }
      expect(thoughts.thoughtIndex).toEqual(importedThoughtsWithoutPendingRoot)

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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const startingThoughtsFromRoot = _.omit(
        { ...thoughtIndex, [HOME_TOKEN]: _.omit(thoughtIndex[HOME_TOKEN], 'pending') },
        [EM_TOKEN, ABSOLUTE_TOKEN],
      )
      expect(thoughts.thoughtIndex).toEqual(startingThoughtsFromRoot)

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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX!.id, initialState, { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toMatchObject({
        [thoughtX.id]: thoughtIndex[thoughtX.id],
        [thoughtY.id]: {
          id: thoughtY.id,
          childrenMap: {},
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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!
      const thoughtZ = (await getContext(provider, ['x', 'y', 'z']))!

      // only fetch 2 levels of descendants
      const thoughtChunks = await all(getDescendantThoughts(provider, thoughtX.id, initialState, { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toMatchObject({
        ..._.pick(thoughtIndex, [thoughtX.id, thoughtY.id]),
        // grandchildren are pending
        [thoughtZ.id]: {
          id: thoughtZ.id,
          value: 'z',
          childrenMap: {},
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
      // add 'm' sibling to ensure that y is not visible and will be buffered
      const state = importText({
        text: `
        - x
          - y
        - m
      `,
      })(initialState())

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(state.thoughts.thoughtIndex))
      await provider.updateLexemeIndex(state.thoughts.lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtY = (await getContext(provider, ['x', 'y']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX.id, () => state, { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual({
        [thoughtX.id]: state.thoughts.thoughtIndex[thoughtX.id],
        [thoughtY.id]: state.thoughts.thoughtIndex[thoughtY.id],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(_.pick(state.thoughts.lexemeIndex, ['x', 'y'].map(hashThought)))
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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await all(getDescendantThoughts(provider, HOME_TOKEN as ThoughtId, initialState))

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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
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
          childrenMap: {},
          pending: true,
          lastUpdated: never(),
          updatedBy: getSessionId(),
        },
        [thoughtV!.id]: {
          ...thoughtIndex[thoughtV!.id],
          childrenMap: {},
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

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], [EM_TOKEN]], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const thoughtZ = await getContext(provider, ['x', 'y', 'z'])

      const importedThoughtsWithoutPendingRoot = {
        ...thoughtIndex,
        [EM_TOKEN]: _.omit(thoughtIndex[EM_TOKEN], 'pending'),
      }

      expect(thoughts.thoughtIndex).toEqual({
        ..._.pick(
          importedThoughtsWithoutPendingRoot,
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
          childrenMap: {},
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

    test('ignore maxDepth on metaprogramming attributes', async () => {
      const { thoughtIndex, lexemeIndex } = importThoughts(`
        - x
          - y
            - =note
              - content
            - z
              - m
        - t
          - u
            - v
              - m
                - n
      `)

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(thoughtIndex))
      await provider.updateLexemeIndex(lexemeIndex)

      const thoughtChunks = await getManyDescendantsByContext(provider, [['x'], ['t']], { maxDepth: 2 })
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      const [thoughtZ, thoughtV] = await Promise.all([
        getContext(provider, ['x', 'y', 'z']),
        getContext(provider, ['t', 'u', 'v']),
      ])

      expect(thoughts.thoughtIndex).toEqual({
        ..._.pick(
          thoughtIndex,
          ...(await getThoughtIdsForContexts(provider, [
            ['x'],
            ['x', 'y'],
            ['x', 'y', '=note'],
            ['x', 'y', '=note', 'content'],
            ['x', 'y', 'z'],
            ['t'],
            ['t', 'u'],
          ])),
        ),
        [thoughtZ!.id]: {
          ...thoughtIndex[thoughtZ!.id],
          childrenMap: {},
          lastUpdated: never(),
          pending: true,
          updatedBy: getSessionId(),
        },
        [thoughtV!.id]: {
          ...thoughtIndex[thoughtV!.id],
          childrenMap: {},
          lastUpdated: never(),
          pending: true,
          updatedBy: getSessionId(),
        },
        // [hashContext(['x', 'y', 'z', 'm'])]: thoughtIndex[hashContext(['x', 'y', 'z', 'm'])],
        // [hashContext(['t', 'u', 'v', 'm', 'n'])]: thoughtIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      // 'm' is not loaded since ['x', 'y', 'z'] and ['t', 'u', 'v'] are pending
      expect(lexemeIndexLocalWithoutIds).toEqual(
        _.pick(lexemeIndex, ['x', 'y', 'z', 't', 'u', 'v', '=note', 'content'].map(hashThought)),
      )
    })

    test('load thoughts that become visible when the parent has =pin/true', async () => {
      const state = importText({
        text: `
        - x
          - a
          - b
            - =pin
              - true
            - c
              - d
            - e
      `,
      })(initialState())

      await provider.updateThoughtIndex(toThoughtIndexWithChildren(state.thoughts.thoughtIndex))
      await provider.updateLexemeIndex(state.thoughts.lexemeIndex)

      const thoughtX = (await getContext(provider, ['x']))!
      const thoughtA = (await getContext(provider, ['x', 'a']))!
      const thoughtB = (await getContext(provider, ['x', 'b']))!
      const thoughtPin = (await getContext(provider, ['x', 'b', '=pin']))!
      const thoughtTrue = (await getContext(provider, ['x', 'b', '=pin', 'true']))!
      const thoughtC = (await getContext(provider, ['x', 'b', 'c']))!
      const thoughtD = (await getContext(provider, ['x', 'b', 'c', 'd']))!
      const thoughtE = (await getContext(provider, ['x', 'b', 'e']))!

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, thoughtX.id, () => state, { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.thoughtIndex).toEqual({
        [thoughtX.id]: state.thoughts.thoughtIndex[thoughtX.id],
        [thoughtA.id]: state.thoughts.thoughtIndex[thoughtA.id],
        [thoughtB.id]: state.thoughts.thoughtIndex[thoughtB.id],
        // meta attributes are not buffered
        [thoughtPin.id]: state.thoughts.thoughtIndex[thoughtPin.id],
        [thoughtTrue.id]: state.thoughts.thoughtIndex[thoughtTrue.id],
        // c is not pending since its parent b is visible with =pin/true
        [thoughtC.id]: state.thoughts.thoughtIndex[thoughtC.id],
        // d is loaded since c is not pending
        [thoughtD.id]: state.thoughts.thoughtIndex[thoughtD.id],
        [thoughtE.id]: state.thoughts.thoughtIndex[thoughtE.id],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const lexemeIndexLocalWithoutIds = keyValueBy(thoughts.lexemeIndex, (key, value) => ({
        [key]: _.omit(value, 'id'),
      }))

      expect(lexemeIndexLocalWithoutIds).toEqual(
        _.pick(state.thoughts.lexemeIndex, ['x', 'a', 'b', 'c', 'd', 'e', '=pin', 'true'].map(hashThought)),
      )
    })
  })
}

export default dataProviderTest
