import _ from 'lodash'
import all from 'it-all'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import getDescendantThoughts from '../data-providers/data-helpers/getDescendantThoughts'
import getManyDescendants from '../data-providers/data-helpers/getManyDescendants'
import getContext from '../data-providers/data-helpers/getContext'
import getThought from '../data-providers/data-helpers/getThought'
import { equalArrays, hashContext, hashThought, isFunction, keyValueBy, mergeThoughts, never, reducerFlow, timestamp } from '../util'
import { DataProvider } from '../data-providers/DataProvider'
import { importText } from '../reducers'
import { initialState } from '../util/initialState'
import { Context, Parent } from '../types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toHaveOrderedContexts(context1: Context, context2: Context): CustomMatcherResult,
    }
  }
}

/** Formats an array of stringified objects vertically. */
const stringifyVertical = <T>(arr: T[]) => {
  const lines = arr.map(item => '  ' + JSON.stringify(item)).join('\n')
  return `\n${lines}\n`
}

expect.extend({

  /** Passes if a Context appears before another Context in the Parents array. */
  toHaveOrderedContexts: (parents: Parent[], context1: Context, context2: Context): jest.CustomMatcherResult => {

    /** Finds the index of a context within the contexts array. */
    const indexOfContext = (context: Context) =>
      parents.findIndex(parent => equalArrays(parent.context, context))

    const index1 = indexOfContext(context1)
    const index2 = indexOfContext(context2)

    const formattedParents = `[${stringifyVertical(parents.map(parent => parent.context))}]`

    return (
      index1 === -1 ? {
        pass: false,
        message: () => `expected ${JSON.stringify(context1)} to be in ${formattedParents}`
      }
      : index2 === -1 ? {
        pass: false,
        message: () => `expected ${JSON.stringify(context2)} to be in ${formattedParents}`
      }
      : index1 >= index2 ? {
        pass: false,
        message: () => `expected ${JSON.stringify(context1)} to appear before ${JSON.stringify(context2)} in ${formattedParents}`
      }
      : {
        pass: true,
        message: () => `expected ${JSON.stringify(context1)} to not appear before ${JSON.stringify(context2)} in ${formattedParents}`
      }
    )
  }
})

/** Import text into the root of a blank initial state. */
const importThoughts = (text: string) => {
  const stateNew = importText(initialState(), { path: HOME_PATH, text })
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

    const thought = {
      id: '12345',
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await provider.updateThought('12345', thought)

    const dbThought = await provider.getThoughtById('12345')
    expect(dbThought).toEqual(thought)

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

    const nothought = await getThought(provider, 'x')
    expect(nothought).toBeUndefined()

    const thought = {
      id: hashThought('x'),
      value: 'x',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await provider.updateThought(thought.id, thought)

    const remoteThought = await getThought(provider, 'x')
    expect(remoteThought).toEqual(thought)
  })

  test('getContext', async () => {

    const nocontext = await getContext(provider, ['x'])
    expect(nocontext).toBeUndefined()

    const parentEntry = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await provider.updateContext(hashContext(['x']), parentEntry)

    const dbContext = await getContext(provider, ['x'])
    expect(dbContext).toEqual({
      ...parentEntry,
      id: hashContext(['x']),
    })
  })

  test('getContextsByIds', async () => {

    const parentEntryX = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryA = {
      id: hashContext(['x', 'a']),
      context: ['x', 'a'],
      children: [],
      lastUpdated: timestamp()
    }

    await provider.updateContext(hashContext(['x']), parentEntryX)
    await provider.updateContext(hashContext(['x', 'a']), parentEntryA)

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
      lastUpdated: timestamp()
    }

    const thoughtY = {
      id: hashThought('y'),
      value: 'y',
      rank: 0,
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp()
    }

    await provider.updateThoughtIndex({
      [hashThought(thoughtX.value)]: thoughtX,
      [hashThought(thoughtY.value)]: thoughtY,
    })

    const dbThought1 = await getThought(provider, thoughtX.value)
    expect(dbThought1).toEqual(thoughtX)

    const dbThought2 = await getThought(provider, thoughtY.value)
    expect(dbThought2).toEqual(thoughtY)
  })

  test('updateContextIndex', async () => {

    const parentEntryX = {
      id: hashContext(['x']),
      context: ['x'],
      children: [
        { value: 'a', rank: 0 },
        { value: 'b', rank: 1 },
        { value: 'c', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    const parentEntryY = {
      id: hashContext(['y']),
      context: ['y'],
      children: [
        { value: 'd', rank: 0 },
        { value: 'e', rank: 1 },
        { value: 'f', rank: 2 },
      ],
      lastUpdated: timestamp()
    }

    await provider.updateContextIndex({
      [hashContext(['x'])]: parentEntryX,
      [hashContext(['y'])]: parentEntryY,
    })

    const contextX = await getContext(provider, ['x'])
    expect(contextX).toEqual({
      ...parentEntryX,
      id: hashContext(['x']),
    })

    const contextY = await getContext(provider, ['y'])
    expect(contextY).toEqual({
      ...parentEntryY,
      id: hashContext(['y']),
    })
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

      const thoughtChunks = await all(getDescendantThoughts(provider, [HOME_TOKEN]))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(
        _.omit(contextIndex, hashContext([EM_TOKEN]), hashContext([ABSOLUTE_TOKEN]))
      )

      // do not match em context, since we are just asserting the imported thoughts
      const thoughtIndexWithoutEm = _.omit(thoughtIndex, hashThought(EM_TOKEN), hashThought(ABSOLUTE_TOKEN))

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

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

      const thoughtChunks = await all(getDescendantThoughts(provider, [HOME_TOKEN]))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(
        _.omit(contextIndex, hashContext([EM_TOKEN]), hashContext([ABSOLUTE_TOKEN]))
      )

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

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

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, ['x'], { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        [hashContext(['x'])]: contextIndex[hashContext(['x'])],
        [hashContext(['x', 'y'])]: {
          id: hashContext(['x', 'y']),
          context: ['x', 'y'],
          children: [],
          lastUpdated: never(),
          pending: true,
        }
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y'].map(hashThought))
      )

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

      // only fetch 2 levels of descendants
      const thoughtChunks = await all(getDescendantThoughts(provider, ['x'], { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, [
          ['x'],
          ['x', 'y']
        ].map(cx => hashContext(cx))),
        // grandchildren are pending
        [hashContext(['x', 'y', 'z'])]: {
          id: hashContext(['x', 'y', 'z']),
          context: ['x', 'y', 'z'],
          children: [],
          lastUpdated: never(),
          pending: true,
        }
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y', 'z'].map(hashThought))
      )

    })

    test('do not buffer leaves', async () => {

      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      // only fetch 1 level of descendants
      const it = getDescendantThoughts(provider, ['x'], { maxDepth: 1 })
      const thoughtChunks = await all(it)
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        [hashContext(['x'])]: contextIndex[hashContext(['x'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y'].map(hashThought))
      )

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

      const thoughtChunks = await all(getDescendantThoughts(provider, [HOME_TOKEN]))

      // flatten the thought chunks
      // preserve chunk order
      // contexts within a chunk are unordered
      const parents = thoughtChunks.map(({ contextIndex }) => Object.values(contextIndex)).flat()

      // siblings may be unordered
      expect(parents).toHaveOrderedContexts(['x'], ['x', 'y'])
      expect(parents).toHaveOrderedContexts(['t'], ['x', 'y'])
      expect(parents).toHaveOrderedContexts(['t', 'u'], ['x', 'y', 'z'])

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

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext(['t'])]: ['t'],
      }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual(
        _.pick(contextIndex, [
          ['x'],
          ['x', 'y'],
          ['x', 'y', 'z'],
          ['t'],
          ['t', 'u'],
          ['t', 'u', 'v'],
          ['t', 'u', 'v', 'm'],
        ].map(cx => hashContext(cx)))
        // empty contexts are present in local state but not provider state
        // ['x', 'y', 'z', 'm']
        // ['t', 'u', 'v', 'm', 'n']
      )

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y', 'z', 't', 'm', 'u', 'v', 'm', 'n'].map(hashThought))
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

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext(['t'])]: ['t'],
      }, { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, [
          ['x'],
          ['x', 'y'],
          ['t'],
          ['t', 'u'],
        ].map(cx => hashContext(cx))),
        [hashContext(['x', 'y', 'z'])]: {
          ...contextIndex[hashContext(['x', 'y', 'z'])],
          children: [],
          pending: true,
          lastUpdated: never(),
        },
        [hashContext(['t', 'u', 'v'])]: {
          ...contextIndex[hashContext(['t', 'u', 'v'])],
          children: [],
          pending: true,
          lastUpdated: never(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext(['x', 'y', 'z', 'm'])]: contextIndex[hashContext(['x', 'y', 'z', 'm'])],
        // [hashContext(['t', 'u', 'v', 'm', 'n'])]: contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y', 'z', 't', 'u', 'v'].map(hashThought))
      )

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
          - Font Size
            - 16
      `

      const stateNew = reducerFlow([

        importText({ path: HOME_PATH, text: rootText }),
        importText({ path: [{ value: EM_TOKEN, rank: 0 }], text: emText }),

      ])(initialState())

      const { contextIndex, thoughtIndex } = stateNew.thoughts

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext([EM_TOKEN])]: [EM_TOKEN],
      }, { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, [
          ['x'],
          ['x', 'y'],
          [EM_TOKEN],
          [EM_TOKEN, 'Settings'],
          [EM_TOKEN, 'Settings', 'Font Size'],
        ].map(cx => hashContext(cx))),
        [hashContext(['x', 'y', 'z'])]: {
          ...contextIndex[hashContext(['x', 'y', 'z'])],
          children: [],
          pending: true,
          lastUpdated: never(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext([EM_TOKEN, 'Settings', 'Font Size', '16'])]: contextIndex[hashContext([EM_TOKEN, 'Settings', 'Font Size', '16'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, [EM_TOKEN, 'x', 'y', 'z', 'Settings', 'Font Size', '16'].map(hashThought))
      )

    })

    test('ignore maxDepth on metaprogramming attributes', async () => {

      const { contextIndex, thoughtIndex } = importThoughts(`
        - x
          - y
            - z
              - =note
                - content
              - m
        - t
          - u
            - v
              - m
                - n
      `)

      await provider.updateContextIndex(contextIndex)
      await provider.updateThoughtIndex(thoughtIndex)

      const thoughtChunks = await all(getManyDescendants(provider, {
        [hashContext(['x'])]: ['x'],
        [hashContext(['t'])]: ['t'],
      }, { maxDepth: 2 }))
      const thoughts = thoughtChunks.reduce(_.ary(mergeThoughts, 2))

      expect(thoughts.contextIndex).toEqual({
        ..._.pick(contextIndex, [
          ['x'],
          ['x', 'y'],
          ['x', 'y', 'z', '=note'],
          ['t'],
          ['t', 'u'],
        ].map(cx => hashContext(cx))),
        [hashContext(['x', 'y', 'z'])]: {
          ...contextIndex[hashContext(['x', 'y', 'z'])],
          children: [
            // take the =note Child from contextIndex so that ids match
            contextIndex[hashContext(['x', 'y', 'z'])].children.find(child => isFunction(child.value))
          ],
          pending: true,
          lastUpdated: never(),
        },
        [hashContext(['t', 'u', 'v'])]: {
          ...contextIndex[hashContext(['t', 'u', 'v'])],
          children: [],
          pending: true,
          lastUpdated: never(),
        },
        // empty contexts are present in local state but not provider state
        // [hashContext(['x', 'y', 'z', 'm'])]: contextIndex[hashContext(['x', 'y', 'z', 'm'])],
        // [hashContext(['x', 'y', 'z', '=note', 'content'])]: contextIndex[hashContext(['x', 'y', 'z', '=note', 'content'])],
        // [hashContext(['t', 'u', 'v', 'm', 'n'])]: contextIndex[hashContext(['t', 'u', 'v', 'm', 'n'])],
      })

      // support optional id property
      // dexie returns an id while firebase does not
      const thoughtIndexLocalWithoutIds = keyValueBy(
        thoughts.thoughtIndex,
        (key, value) => ({
          [key]: _.omit(value, 'id')
        })
      )

      // 'm' is not loaded since ['x', 'y', 'z'] and ['t', 'u', 'v'] are pending
      expect(thoughtIndexLocalWithoutIds).toEqual(
        _.pick(thoughtIndex, ['x', 'y', 'z', 't', 'u', 'v', '=note', 'content'].map(hashThought))
      )

    })

  })

}

export default dataProviderTest
